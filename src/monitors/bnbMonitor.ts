import { ethers } from "ethers";
import { Telegraf } from "telegraf";
import { bnbProvider } from "../chains/bnb.js";
import { env } from "../config/env.js";
import { getAllUsers, getCheckpoint, setCheckpoint } from "../db/database.js";
import { confirmDeposit, recordDeposit } from "../services/depositService.js";
import { notifyDeposit } from "../services/notificationService.js";

export function startBnbMonitor(bot: Telegraf): void {
  let running = false;

  const poll = async () => {
    if (running) {
      return;
    }
    running = true;

    try {
      const latestBlock = await bnbProvider.getBlockNumber();
      let checkpoint = await getCheckpoint("bnb");

      if (checkpoint === null) {
        await setCheckpoint("bnb", latestBlock);
        return;
      }

      const safeBlock = latestBlock - env.BNB_CONFIRMATIONS + 1;
      if (safeBlock <= checkpoint) {
        return;
      }

      const users = await getAllUsers();
      const addressMap = new Map(users.map((user) => [user.wallets.bnb.address.toLowerCase(), user]));

      for (let blockNumber = checkpoint + 1; blockNumber <= safeBlock; blockNumber += 1) {
        const block = await bnbProvider.getBlock(blockNumber, true);
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
            id: `bnb:${tx.hash}`,
            chain: "bnb",
            symbol: "BNB",
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
        await setCheckpoint("bnb", checkpoint);
      }
    } catch (error) {
      console.error("BNB monitor error", error);
    } finally {
      running = false;
    }
  };

  void poll();
  setInterval(() => void poll(), env.MONITOR_INTERVAL_MS);
}
