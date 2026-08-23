import "dotenv/config";
import { z } from "zod";

const telegramBotTokenSchema = z
  .string()
  .trim()
  .regex(
    /^\d{6,}:[A-Za-z0-9_-]{20,}$/,
    "TELEGRAM_BOT_TOKEN must be the raw BotFather token, for example 123456789:AA... Use only ASCII letters, digits, underscores, and hyphens."
  );

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: telegramBotTokenSchema,
  EVM_MASTER_MNEMONIC: z.string().min(1),
  SOLANA_MASTER_MNEMONIC: z.string().min(1),
  ETH_RPC_URL: z.string().url(),
  BNB_RPC_URL: z.string().url(),
  SOLANA_RPC_URL: z.string().url(),
  ETH_CONFIRMATIONS: z.coerce.number().int().positive().default(2),
  BNB_CONFIRMATIONS: z.coerce.number().int().positive().default(2),
  MONITOR_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  SOLANA_SIGNATURE_LIMIT: z.coerce.number().int().positive().default(5),
  ADMIN_PASSWORD: z.string().default(""),
  NODE_ENV: z.string().default("development")
});

export const env = envSchema.parse(process.env);
