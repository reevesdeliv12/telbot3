import {
  getDepositById,
  getWalletOwner,
  markDepositConfirmed,
  saveDeposit
} from "../db/database.js";
import { Chain, DepositRecord, UserRecord } from "../types.js";

export async function recordDeposit(input: Omit<DepositRecord, "telegramUserId" | "detectedAt" | "notified" | "status">): Promise<DepositRecord | undefined> {
  const existing = await getDepositById(input.id);
  if (existing) {
    return undefined;
  }

  const owner = await getWalletOwner(input.chain, input.to);
  if (!owner) {
    return undefined;
  }

  return saveDeposit({
    ...input,
    telegramUserId: owner.telegramUserId,
    status: "detected",
    notified: false,
    detectedAt: new Date().toISOString()
  });
}

export async function confirmDeposit(id: string, confirmations?: number): Promise<DepositRecord | undefined> {
  return markDepositConfirmed(id, confirmations);
}

export function getChainOwner(users: UserRecord[], chain: Chain, address: string): UserRecord | undefined {
  const normalized = chain === "solana" ? address : address.toLowerCase();
  return users.find((user) => {
    const wallet = user.wallets[chain].address;
    return chain === "solana" ? wallet === normalized : wallet.toLowerCase() === normalized;
  });
}
