import { Context, Markup } from "telegraf";
import { env } from "../config/env.js";
import { getDatabaseSnapshot } from "../db/database.js";

const awaitingPassword = new Set<string>();
const authorizedAdmins = new Set<string>();
const TELEGRAM_MESSAGE_LIMIT = 3900;

function getTelegramUserId(ctx: Context): string | undefined {
  return ctx.from?.id.toString();
}

function isAdmin(ctx: Context): boolean {
  const telegramUserId = getTelegramUserId(ctx);
  return Boolean(telegramUserId && authorizedAdmins.has(telegramUserId));
}

function adminKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Summary", "admin:summary"), Markup.button.callback("👥 Users", "admin:users")],
    [Markup.button.callback("✅ Deposits", "admin:deposits"), Markup.button.callback("📤 Withdrawals", "admin:withdrawals")],
    [Markup.button.callback("🔗 Connected", "admin:connected"), Markup.button.callback("🧾 Full JSON", "admin:json")],
    [Markup.button.callback("🚪 Logout", "admin:logout")]
  ]);
}

async function replyChunks(ctx: Context, title: string, value: unknown): Promise<void> {
  const json = JSON.stringify(value, null, 2);
  const chunks: string[] = [];

  for (let index = 0; index < json.length; index += TELEGRAM_MESSAGE_LIMIT) {
    chunks.push(json.slice(index, index + TELEGRAM_MESSAGE_LIMIT));
  }

  if (chunks.length === 0) {
    await ctx.reply(`${title}\n\nNo records found.`);
    return;
  }

  for (let index = 0; index < chunks.length; index += 1) {
    await ctx.reply(`${title}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ""}\n\n\`\`\`json\n${chunks[index]}\n\`\`\``, {
      parse_mode: "Markdown"
    });
  }
}

export async function adminCommand(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId) {
    return;
  }

  if (!env.ADMIN_PASSWORD) {
    await ctx.reply("⚠️ Admin panel is disabled. Set ADMIN_PASSWORD in .env and restart the bot.");
    return;
  }

  if (authorizedAdmins.has(telegramUserId)) {
    await ctx.reply("🛠️ Admin Panel", adminKeyboard());
    return;
  }

  awaitingPassword.add(telegramUserId);
  await ctx.reply("🔐 Enter admin password.\n\nTip: delete your password message from Telegram after login.");
}

export async function adminLogoutCommand(ctx: Context): Promise<void> {
  clearAdminState(ctx);
  await ctx.reply("🚪 Admin logged out.");
}

export function clearAdminState(ctx: Context): void {
  const telegramUserId = getTelegramUserId(ctx);
  if (telegramUserId) {
    awaitingPassword.delete(telegramUserId);
    authorizedAdmins.delete(telegramUserId);
  }
}

export async function maybeHandleAdminPassword(ctx: Context): Promise<boolean> {
  const telegramUserId = getTelegramUserId(ctx);
  if (!telegramUserId || !ctx.message || !("text" in ctx.message)) {
    return false;
  }

  if (!awaitingPassword.has(telegramUserId)) {
    return false;
  }

  const password = ctx.message.text.trim();
  awaitingPassword.delete(telegramUserId);

  if (password !== env.ADMIN_PASSWORD) {
    await ctx.reply("❌ Invalid admin password.");
    return true;
  }

  authorizedAdmins.add(telegramUserId);
  await ctx.reply("✅ Admin login successful.", adminKeyboard());
  return true;
}

export async function adminAction(ctx: Context): Promise<void> {
  const telegramUserId = getTelegramUserId(ctx);
  const data = "callback_query" in ctx.update && "data" in ctx.update.callback_query ? ctx.update.callback_query.data : "";

  if (!telegramUserId || !data) {
    return;
  }

  await ctx.answerCbQuery();

  if (data === "admin:logout") {
    awaitingPassword.delete(telegramUserId);
    authorizedAdmins.delete(telegramUserId);
    await ctx.reply("🚪 Admin logged out.");
    return;
  }

  if (!isAdmin(ctx)) {
    await ctx.reply("🔐 Send /admin and enter the admin password first.");
    return;
  }

  const db = await getDatabaseSnapshot();

  if (data === "admin:summary") {
    await ctx.reply(
      [
        "📊 Admin Summary",
        "",
        `Next wallet index: ${db.nextWalletIndex}`,
        `Users: ${db.users.length}`,
        `Deposits: ${db.deposits.length}`,
        `Withdrawals: ${db.withdrawals.length}`,
        `Connected wallets: ${db.connectedWallets.length}`,
        "",
        `ETH checkpoint: ${db.checkpoints.ethereum ?? "not set"}`,
        `BNB checkpoint: ${db.checkpoints.bnb ?? "not set"}`,
        `SOL checkpoint: ${db.checkpoints.solana ?? "not set"}`
      ].join("\n"),
      adminKeyboard()
    );
    return;
  }

  if (data === "admin:users") {
    await replyChunks(ctx, "👥 Users", db.users);
    return;
  }

  if (data === "admin:deposits") {
    await replyChunks(ctx, "✅ Deposits", db.deposits);
    return;
  }

  if (data === "admin:withdrawals") {
    await replyChunks(ctx, "📤 Withdrawals", db.withdrawals);
    return;
  }

  if (data === "admin:connected") {
    await replyChunks(ctx, "🔗 Connected Wallets", db.connectedWallets);
    return;
  }

  if (data === "admin:json") {
    await replyChunks(ctx, "🧾 Stored JSON", db);
  }
}
