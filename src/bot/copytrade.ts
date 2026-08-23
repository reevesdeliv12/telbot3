import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { Context, Markup } from "telegraf";
import { getBnbBalance } from "../chains/bnb.js";
import { getEthBalance } from "../chains/ethereum.js";
import { getSolBalance } from "../chains/solana.js";
import { getCurrentUser } from "../services/userService.js";
import { navigationButtons } from "./mainMenu.js";

type CopytradeStatus = "started" | "stopped";

interface CopytradeTarget {
  address: string;
  network: "EVM" | "Solana";
  status: CopytradeStatus;
}

const pendingCopytradeUsers = new Set<string>();
const copytradeTargets = new Map<string, CopytradeTarget>();

function getTelegramUserId(ctx: Context): string | undefined {
  return ctx.from?.id.toString();
}

function classifyCopytradeAddress(address: string): CopytradeTarget["network"] | undefined {
  if (ethers.isAddress(address)) {
    return "EVM";
  }

  try {
    new PublicKey(address);
    return "Solana";
  } catch {
    return undefined;
  }
}

function monitoringKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("▶️ Start Monitoring", "copytrade:start"),
      Markup.button.callback("⏹️ Stop Monitoring", "copytrade:stop")
    ],
    navigationButtons()
  ]);
}

function isZeroBalance(balance: string): boolean {
  return /^0(?:\.0*)?$/.test(balance);
}

async function hasEmptyPortfolio(ctx: Context): Promise<boolean | undefined> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    return undefined;
  }

  const [ethBalance, bnbBalance, solBalance] = await Promise.all([
    getEthBalance(user.wallets.ethereum.address),
    getBnbBalance(user.wallets.bnb.address),
    getSolBalance(user.wallets.solana.address)
  ]);

  return [ethBalance, bnbBalance, solBalance].every(isZeroBalance);
}

export async function copytradeCommand(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) {
    return;
  }

  const emptyPortfolio = await hasEmptyPortfolio(ctx);
  if (emptyPortfolio === undefined) {
    await ctx.reply("⚠️ Please send /start first to create your wallets.", Markup.inlineKeyboard([navigationButtons()]));
    return;
  }

  if (emptyPortfolio) {
    await ctx.reply("⚠️ Your portfolio is empty. Fund your wallet before using Copytrade.", Markup.inlineKeyboard([navigationButtons()]));
    return;
  }

  pendingCopytradeUsers.add(telegramUserId);
  await ctx.reply("📈 Enter the wallet address you want to copy from.", Markup.inlineKeyboard([navigationButtons()]));
}

export async function maybeHandleCopytradeAddress(ctx: Context): Promise<boolean> {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId || !("text" in ctx.message!)) {
    return false;
  }

  if (!pendingCopytradeUsers.has(telegramUserId)) {
    return false;
  }

  const address = ctx.message.text.trim();
  if (address.startsWith("/")) {
    return false;
  }

  const network = classifyCopytradeAddress(address);
  if (!network) {
    await ctx.reply(
      "⚠️ That does not look like a valid EVM or Solana wallet address. Send a valid wallet address or type /cancel.",
      Markup.inlineKeyboard([navigationButtons()])
    );
    return true;
  }

  pendingCopytradeUsers.delete(telegramUserId);
  copytradeTargets.set(telegramUserId, {
    address,
    network,
    status: "started"
  });

  await ctx.reply(
    [`Monitoring wallet "${address}"`, "", `Network type: ${network}`, `Status: Started`].join("\n"),
    monitoringKeyboard()
  );

  return true;
}

export async function copytradeAction(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  const data = "callback_query" in ctx.update && "data" in ctx.update.callback_query ? ctx.update.callback_query.data : "";

  if (!telegramUserId || !data) {
    return;
  }

  const target = copytradeTargets.get(telegramUserId);
  if (!target) {
    await ctx.answerCbQuery("No wallet is being monitored.");
    await ctx.reply("No wallet is being monitored. Click 📈 Copytrade to add one.", Markup.inlineKeyboard([navigationButtons()]));
    return;
  }

  target.status = data === "copytrade:stop" ? "stopped" : "started";
  await ctx.answerCbQuery(target.status === "started" ? "Monitoring started" : "Monitoring stopped");
  await ctx.reply(
    [`Monitoring wallet "${target.address}"`, "", `Network type: ${target.network}`, `Status: ${target.status === "started" ? "Started" : "Stopped"}`].join("\n"),
    monitoringKeyboard()
  );
}

export function cancelCopytradeCommand(ctx: Context): void {
  const telegramUserId = getTelegramUserId(ctx);
  if (telegramUserId) {
    pendingCopytradeUsers.delete(telegramUserId);
  }
}
