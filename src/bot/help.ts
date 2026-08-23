import { Context } from "telegraf";

export async function helpCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      "🧭 Available Commands",
      "",
      "/start - 🚀 Start the bot",
      "/wallet - 💰 View your wallets and balances",
      "/connect - 🔗 Connect an external wallet",
      "/buy - 🛒 Buy / place trade",
      "/withdraw - 📤 Request a withdrawal",
      "/admin - 🛠️ Admin panel",
      "/cancel - ✖️ Cancel current request",
      "/help - 🧭 View help"
    ].join("\n")
  );
}
