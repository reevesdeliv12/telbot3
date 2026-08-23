import { Context } from "telegraf";
import { createUser, getUserByTelegramId } from "../db/database.js";
import { UserRecord } from "../types.js";
import { deriveEvmWallet } from "../wallets/evm.js";
import { deriveSolanaWallet } from "../wallets/solana.js";

export async function getCurrentUser(ctx: Context): Promise<UserRecord | undefined> {
  const telegramUserId = ctx.from?.id.toString();
  if (!telegramUserId) {
    return undefined;
  }
  return getUserByTelegramId(telegramUserId);
}

export async function registerOrGetUser(ctx: Context): Promise<{ user: UserRecord; created: boolean }> {
  if (!ctx.from || !ctx.chat) {
    throw new Error("Telegram user and chat are required.");
  }

  const telegramUserId = ctx.from.id.toString();
  const existing = await getUserByTelegramId(telegramUserId);
  if (existing) {
    return { user: existing, created: false };
  }

  const user = await createUser(
    {
      id: telegramUserId,
      telegramUserId,
      telegramChatId: ctx.chat.id.toString(),
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      createdAt: new Date().toISOString()
    },
    (walletIndex) => {
      const evm = deriveEvmWallet(walletIndex);
      const solana = deriveSolanaWallet(walletIndex);
      return {
        ethereum: { address: evm.address },
        bnb: { address: evm.address },
        solana: { address: solana.address }
      };
    }
  );

  return { user, created: true };
}
