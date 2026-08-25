import { Context, Markup } from "telegraf";
import { registerOrGetUser } from "../services/userService.js";
import { UserRecord } from "../types.js";
import { showMainMenu } from "./mainMenu.js";

function walletMessage(user: UserRecord, created: boolean): string {
  return [
    created ? "👋 Welcome to Copy Entries" : "👋 Welcome back to Copy Entries",
    "",
    created ? "✅ Your account has been created successfully." : "✅ Your existing account was found.",
    "",
    "💰 Your Deposit Wallets",
    "",
    "🔷 Ethereum",
    user.wallets.ethereum.address,
    "",
    "🟡 BNB Smart Chain",
    user.wallets.bnb.address,
    "",
    "🟣 Solana",
    user.wallets.solana.address,
    "",
    "Use /wallet to view your balances or /withdraw to request a withdrawal."
  ].join("\n");
}

export async function startCommand(ctx: Context): Promise<void> {
  const { user, created } = await registerOrGetUser(ctx);

   await ctx.reply(
      [
        "<b>Welcome 👋!!! to copyEntrySync Dashboard.</b>",
        "",
       
        
      ].join("\n"),
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback("Start", "welcome:start")]])
      }
    );
  if (created) {
    await ctx.reply(
      [
        "<b>What can this bot do?</b>",
        "",
        "CopyEntrysync  Bot is a lightning-fast Telegram trading assistant built for serious traders.it lets you autotrade instantly,copytrade topwallets in realtime,and snipe new tokens the moment they launch.with this bot, you never miss an opportunity - fast, precise, and effortless trading all inside telegram",
        "",
        "Tap Start to open your wallet dashboard and main menu."
      ].join("\n")
    );
    return;
  }

  //await ctx.reply(walletMessage(user, created));
  await showMainMenu(ctx, "Choose an option:");
}

export async function welcomeStartAction(ctx: Context): Promise<void> {
  await ctx.answerCbQuery();
  await startCommand(ctx);
}
