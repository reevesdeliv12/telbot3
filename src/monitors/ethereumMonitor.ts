import { ethers } from "ethers";
import { Telegraf } from "telegraf";
import { ethereumProvider } from "../chains/ethereum.js";
import { env } from "../config/env.js";
import { getCheckpoint, setCheckpoint } from "../db/database.js";
import { confirmDeposit, getChainOwner, recordDeposit } from "../services/depositService.js";
import { notifyDeposit } from "../services/notificationService.js";
import { getAllUsers } from "../db/database.js";

export function startEthereumMonitor(bot: Telegraf): void {
  let running = false;

  const poll = async () => {
    if (running) {
      return;
    }
    running = true;

    try {
      const latestBlock = await ethereumProvider.getBlockNumber();
      let checkpoint = await getCheckpoint("ethereum");

      if (checkpoint === null) {
        await setCheckpoint("ethereum", latestBlock);
        return;
      }

      const safeBlock = latestBlock - env.ETH_CONFIRMATIONS + 1;
      if (safeBlock <= checkpoint) {
        return;
      }

      const users = await getAllUsers();
      const addressMap = new Map(users.map((user) => [user.wallets.ethereum.address.toLowerCase(), user]));

      for (let blockNumber = checkpoint + 1; blockNumber <= safeBlock; blockNumber += 1) {
        const block = await ethereumProvider.getBlock(blockNumber, true);
        if (!block) {
          continue;
        }

        const transactions = "prefetchedTransactions" in block ? block.prefetchedTransactions : [];
        for (const tx of transactions) {
          if (!tx.to || tx.value <= 0n) {
            continue;
          }

          const user = addressMap.get(tx.to.toLowerCase());
          if (!user) {
            continue;
          }

          const deposit = await recordDeposit({
            id: `ethereum:${tx.hash}`,
            chain: "ethereum",
            symbol: "ETH",
            txHash: tx.hash,
            from: tx.from,
            to: tx.to,
            amount: ethers.formatEther(tx.value),
            blockNumber,
            confirmations: latestBlock - blockNumber + 1
          });

          if (deposit) {
            const confirmed = await confirmDeposit(deposit.id, latestBlock - blockNumber + 1);
            if (confirmed) {
              await notifyDeposit(bot, user, confirmed);
            }
          }
        }

        checkpoint = blockNumber;
        await setCheckpoint("ethereum", checkpoint);
      }
    } catch (error) {
      console.error("Ethereum monitor error", error);
    } finally {
      running = false;
    }
  };

  void poll();
  setInterval(() => void poll(), env.MONITOR_INTERVAL_MS);
}
