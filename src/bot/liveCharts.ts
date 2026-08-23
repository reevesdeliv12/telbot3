import { Context, Markup } from "telegraf";
import { navigationButtons } from "./mainMenu.js";

export async function liveChartsCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    "📊 Live Charts",
    Markup.inlineKeyboard([
      [Markup.button.url("ETH", "https://dexscreener.com/search?q=ETH")],
      [Markup.button.url("BNB", "https://dexscreener.com/search?q=BNB")],
      [Markup.button.url("SOL", "https://dexscreener.com/search?q=SOL")],
      navigationButtons()
    ])
  );
}
