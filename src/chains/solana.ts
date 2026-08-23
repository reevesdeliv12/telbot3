import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { env } from "../config/env.js";

export const solanaConnection = new Connection(env.SOLANA_RPC_URL, "confirmed");

export async function getSolBalance(address: string): Promise<string> {
  const lamports = await solanaConnection.getBalance(new PublicKey(address), "confirmed");
  return formatLamports(lamports);
}

export function formatLamports(lamports: number): string {
  const whole = Math.trunc(lamports / LAMPORTS_PER_SOL);
  const fraction = String(lamports % LAMPORTS_PER_SOL).padStart(9, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : String(whole);
}
