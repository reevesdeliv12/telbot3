import { Context } from "telegraf";
import { walletCommand } from "./wallet.js";

export async function buyCommand(ctx: Context): Promise<void> {
  await ctx.reply("🛒 Buy / Place Trade\n\n Here is your wallet so you can fund it first:");
  await walletCommand(ctx);
}

export async function buyWalletAction(ctx: Context): Promise<void> {
  await ctx.answerCbQuery("Opening wallet");
  await buyCommand(ctx);
}
