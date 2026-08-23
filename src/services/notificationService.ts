import { Telegraf } from "telegraf";
import { getBnbBalance } from "../chains/bnb.js";
import { getEthBalance } from "../chains/ethereum.js";
import { getSolBalance } from "../chains/solana.js";
import { getAllUsers, getConfirmedUnnotifiedDeposits, markDepositNotified } from "../db/database.js";
import { DepositRecord, UserRecord } from "../types.js";

const chainNames = {
  ethereum: "Ethereum",
  bnb: "BNB Smart Chain",
  solana: "Solana"
} as const;

export async function notifyDeposit(bot: Telegraf, user: UserRecord, deposit: DepositRecord): Promise<void> {
  if (deposit.notified) {
    return;
  }

  const balance =
    deposit.chain === "ethereum"
      ? await getEthBalance(user.wallets.ethereum.address)
      : deposit.chain === "bnb"
        ? await getBnbBalance(user.wallets.bnb.address)
        : await getSolBalance(user.wallets.solana.address);

  await bot.telegram.sendMessage(
    user.telegramChatId,
    [
      "✅ Deposit Confirmed",
      "",
      `💸 You received: ${deposit.amount} ${deposit.symbol}`,
      "",
      `🌐 Network: ${chainNames[deposit.chain]}`,
      deposit.from ? `From: ${deposit.from}` : undefined,
      `🔎 Transaction: ${deposit.txHash}`,
      "",
      `💰 Your new ${deposit.symbol} balance: ${balance} ${deposit.symbol}`
    ]
      .filter(Boolean)
      .join("\n")
  );

  await markDepositNotified(deposit.id);
}

export async function notifyPendingDeposits(bot: Telegraf): Promise<void> {
  const [users, deposits] = await Promise.all([getAllUsers(), getConfirmedUnnotifiedDeposits()]);

  for (const deposit of deposits) {
    const user = users.find((item) => item.telegramUserId === deposit.telegramUserId);
    if (user) {
      await notifyDeposit(bot, user, deposit);
    }
  }
}
