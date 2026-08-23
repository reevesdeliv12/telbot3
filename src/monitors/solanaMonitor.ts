import { PublicKey } from "@solana/web3.js";
import { Telegraf } from "telegraf";
import { formatLamports, solanaConnection } from "../chains/solana.js";
import { env } from "../config/env.js";
import { getAllUsers } from "../db/database.js";
import { confirmDeposit, recordDeposit } from "../services/depositService.js";
import { notifyDeposit } from "../services/notificationService.js";

export function startSolanaMonitor(bot: Telegraf): void {
  let running = false;

  const poll = async () => {
    if (running) {
      return;
    }
    running = true;

    try {
      const users = await getAllUsers();

      for (const user of users) {
        const publicKey = new PublicKey(user.wallets.solana.address);
        const signatures = await solanaConnection.getSignaturesForAddress(
          publicKey,
          { limit: env.SOLANA_SIGNATURE_LIMIT },
          "confirmed"
        );

        for (const signatureInfo of signatures.reverse()) {
          if (signatureInfo.err || signatureInfo.confirmationStatus === "processed") {
            continue;
          }

          const tx = await solanaConnection.getParsedTransaction(signatureInfo.signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0
          });

          if (!tx?.meta) {
            continue;
          }

          const accountIndex = tx.transaction.message.accountKeys.findIndex((account) => account.pubkey.equals(publicKey));
          if (accountIndex < 0) {
            continue;
          }

          const receivedLamports = tx.meta.postBalances[accountIndex] - tx.meta.preBalances[accountIndex];
          if (receivedLamports <= 0) {
            continue;
          }

          const feePayer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58();
          const deposit = await recordDeposit({
            id: `solana:${signatureInfo.signature}`,
            chain: "solana",
            symbol: "SOL",
            txHash: signatureInfo.signature,
            from: feePayer,
            to: user.wallets.solana.address,
            amount: formatLamports(receivedLamports)
          });

          if (deposit) {
            const confirmed = await confirmDeposit(deposit.id);
            if (confirmed) {
              await notifyDeposit(bot, user, confirmed);
            }
          }
        }
      }
    } catch (error) {
      console.error("Solana monitor error", error);
    } finally {
      running = false;
    }
  };

  void poll();
  setInterval(() => void poll(), env.MONITOR_INTERVAL_MS);
}
