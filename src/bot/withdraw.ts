import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { Context, Markup } from "telegraf";
import { saveWithdrawalRequest } from "../db/database.js";
import { getCurrentUser } from "../services/userService.js";
import { Chain, CoinSymbol } from "../types.js";

interface PendingWithdrawal {
  chain: Chain;
  symbol: CoinSymbol;
}

const pendingWithdrawals = new Map<string, PendingWithdrawal>();

const coinLabels: Record<Chain, string> = {
  ethereum: "ETH",
  bnb: "BNB",
  solana: "SOL"
};

const networkLabels: Record<Chain, string> = {
  ethereum: "Ethereum",
  bnb: "BNB Smart Chain",
  solana: "Solana"
};

function getTelegramUserId(ctx: Context): string | undefined {
  return ctx.from?.id.toString();
}

function isValidDestination(chain: Chain, address: string): boolean {
  if (chain === "solana") {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  return ethers.isAddress(address);
}

export async function withdrawCommand(ctx: Context): Promise<void> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    await ctx.reply("⚠️ Please send /start first to create your wallets.");
    return;
  }

  await ctx.reply(
    "🏦 Withdrawal Request\n\nChoose the coin you want to withdraw:",
    Markup.inlineKeyboard([
      [Markup.button.callback("🔷 ETH", "withdraw:ethereum")],
      [Markup.button.callback("🟡 BNB", "withdraw:bnb")],
      [Markup.button.callback("🟣 SOL", "withdraw:solana")],
      [Markup.button.callback("✖️ Cancel", "withdraw:cancel")]
    ])
  );
}

export async function withdrawCoinAction(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  const data = "callback_query" in ctx.update && "data" in ctx.update.callback_query ? ctx.update.callback_query.data : "";

  if (!telegramUserId || !data) {
    return;
  }

  if (data === "withdraw:cancel") {
    pendingWithdrawals.delete(telegramUserId);
    await ctx.answerCbQuery();
    await ctx.reply("✖️ Withdrawal request cancelled.");
    return;
  }

  const chain = data.replace("withdraw:", "") as Chain;
  const symbol = coinLabels[chain] as CoinSymbol | undefined;
  if (!symbol) {
    await ctx.answerCbQuery("Unsupported coin.");
    return;
  }

  pendingWithdrawals.set(telegramUserId, { chain, symbol });
  await ctx.answerCbQuery(`${symbol} selected`);
  await ctx.reply(
    [
      `📤 ${symbol} Withdrawal Request`,
      "",
      `Network: ${networkLabels[chain]}`,
      "",
      "Send the destination wallet address now.",
      "Type /cancel to stop."
    ].join("\n")
  );
}

export async function cancelWithdrawCommand(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  if (telegramUserId) {
    pendingWithdrawals.delete(telegramUserId);
  }
  await ctx.reply("✖️ Cancelled.");
}

export async function maybeHandleWithdrawalDestination(ctx: Context): Promise<boolean> {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId || !ctx.chat || !("text" in ctx.message!)) {
    return false;
  }

  const pending = pendingWithdrawals.get(telegramUserId);
  if (!pending) {
    return false;
  }

  const destinationAddress = ctx.message.text.trim();
  if (destinationAddress.startsWith("/")) {
    return false;
  }

  if (!isValidDestination(pending.chain, destinationAddress)) {
    await ctx.reply(`⚠️ That does not look like a valid ${pending.symbol} destination address. Send another address or type /cancel.`);
    return true;
  }

  const user = await getCurrentUser(ctx);
  if (!user) {
    pendingWithdrawals.delete(telegramUserId);
    await ctx.reply("⚠️ Please send /start first to create your wallets.");
    return true;
  }

  const withdrawal = await saveWithdrawalRequest({
    id: `withdrawal:${pending.chain}:${Date.now()}:${telegramUserId}`,
    telegramUserId,
    telegramChatId: ctx.chat.id.toString(),
    chain: pending.chain,
    symbol: pending.symbol,
    destinationAddress,
    status: "pending",
    requestedAt: new Date().toISOString()
  });

  pendingWithdrawals.delete(telegramUserId);

  await ctx.reply(
    [
      "✅ Withdrawal Request Received",
      "",
      `Coin: ${withdrawal.symbol}`,
      `Network: ${networkLabels[withdrawal.chain]}`,
      "",
      "Destination:",
      withdrawal.destinationAddress,
      "",
      `Status: ${withdrawal.status}`,
      "",
      
    ].join("\n")
  );

  return true;
}
