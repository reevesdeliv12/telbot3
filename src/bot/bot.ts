import { Telegraf } from "telegraf";
import { env } from "../config/env.js";
import { adminAction, adminCommand, adminLogoutCommand, clearAdminState, maybeHandleAdminPassword } from "./admin.js";
import { buyCommand, buyWalletAction } from "./buy.js";
import {
  cancelConnectCommand,
  connectAction,
  connectCommand,
  maybeHandleConnectAddress
} from "./connect.js";
import {
  cancelCopytradeCommand,
  copytradeAction,
  copytradeCommand,
  maybeHandleCopytradeAddress
} from "./copytrade.js";
import { helpCommand } from "./help.js";
import { liveChartsCommand } from "./liveCharts.js";
import { mainMenuAction } from "./mainMenu.js";
import { startCommand, welcomeStartAction } from "./start.js";
import { walletCommand } from "./wallet.js";
import {
  cancelWithdrawCommand,
  maybeHandleWithdrawalDestination,
  withdrawCoinAction,
  withdrawCommand
} from "./withdraw.js";

export function createBot(): Telegraf {
  const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

  void bot.telegram.setMyCommands([
    { command: "start", description: "🚀 Start the bot" },
    { command: "wallet", description: "💰 View your wallets and balances" },
    { command: "connect", description: "🔗 Connect an external wallet" },
    { command: "buy", description: "🛒 Buy / place trade" },
    { command: "withdraw", description: "📤 Request a withdrawal" },
    { command: "admin", description: "🛠️ Admin panel" },
    { command: "help", description: "🧭 View help" },
    { command: "cancel", description: "✖️ Cancel current request" }
  ]).catch((error) => {
    console.error("Failed to register Telegram bot commands", error);
  });

  bot.start(startCommand);
  bot.command("wallet", walletCommand);
  bot.command("connect", connectCommand);
  bot.command("buy", buyCommand);
  bot.command("admin", adminCommand);
  bot.command("admin_logout", adminLogoutCommand);
  bot.help(helpCommand);
  bot.command("withdraw", withdrawCommand);
  bot.command("cancel", async (ctx) => {
    clearAdminState(ctx);
    await cancelConnectCommand(ctx);
    cancelCopytradeCommand(ctx);
    await cancelWithdrawCommand(ctx);
  });
  bot.action(/^admin:(summary|users|deposits|withdrawals|connected|json|logout)$/, adminAction);
  bot.action(/^connect:(seed_phrase|private_key|public_address|cancel)$/, connectAction);
  bot.action(/^copytrade:(start|stop)$/, copytradeAction);
  bot.action("nav:main_menu", mainMenuAction);
  bot.action("welcome:start", welcomeStartAction);
  bot.action("buy:wallet", buyWalletAction);
  bot.action(/^withdraw:(ethereum|bnb|solana|cancel)$/, withdrawCoinAction);
  bot.on("text", async (ctx, next) => {
    const text = ctx.message.text.trim();
    if (text === "📈 Copytrade") {
      await copytradeCommand(ctx);
      return;
    }
    if (text === "🤖 Autotrade") {
      await ctx.reply("🤖 Autotrade is under development.");
      return;
    }
    if (text === "📊 Live Charts") {
      await liveChartsCommand(ctx);
      return;
    }
    if (text === "👛 Wallet") {
      await walletCommand(ctx);
      return;
    }
    if (text === "Bot Guide") {
      await helpCommand(ctx);
      return;
    }
    if (text === "🔑 Import W...") {
      await connectCommand(ctx);
      return;
    }

    const handledAdmin = await maybeHandleAdminPassword(ctx);
    if (handledAdmin) {
      return;
    }

    const handledConnect = await maybeHandleConnectAddress(ctx);
    if (handledConnect) {
      return;
    }

    const handledCopytrade = await maybeHandleCopytradeAddress(ctx);
    if (handledCopytrade) {
      return;
    }

    const handled = await maybeHandleWithdrawalDestination(ctx);
    if (!handled) {
      return next();
    }
  });

  bot.catch((error, ctx) => {
    console.error("Bot error", { updateId: ctx.update.update_id, error });
  });

  return bot;
}
