import { Context, Markup } from "telegraf";

export const mainMenuKeyboard = Markup.keyboard([
  ["📈 Copytrade", "🤖 Autotrade"],
  ["📊 Live Charts", "👛 Wallet"],
  ["Bot Guide", "🔑 Import W...", "⚙️ Settings"],
  ["⏰ Auto Deposit"]
]).resize();

export function navigationButtons() {
  return [
    Markup.button.callback("⬅️ Back", "nav:main_menu"),
    Markup.button.callback("🏠 Main Menu", "nav:main_menu")
  ];
}

export async function showMainMenu(ctx: Context, message = "Menu unlocked."): Promise<void> {
  await ctx.reply(message, mainMenuKeyboard);
}

export async function mainMenuAction(ctx: Context): Promise<void> {
  await ctx.answerCbQuery();
  await showMainMenu(ctx, "Choose an option:");
}
