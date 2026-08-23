import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  Chain,
  ConnectedWalletRecord,
  DatabaseShape,
  DepositRecord,
  UserRecord,
  WithdrawalRequestRecord
} from "../types.js";

const dbPath = path.resolve(process.cwd(), "data", "db.json");
const tmpPath = path.resolve(process.cwd(), "data", "db.json.tmp");

const initialDb: DatabaseShape = {
  nextWalletIndex: 0,
  users: [],
  deposits: [],
  withdrawals: [],
  connectedWallets: [],
  checkpoints: {
    ethereum: null,
    bnb: null,
    solana: null
  }
};

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDb(): Promise<void> {
  await mkdir(path.dirname(dbPath), { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    await writeFile(dbPath, JSON.stringify(initialDb, null, 2));
  }
}

async function readDb(): Promise<DatabaseShape> {
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  const db = JSON.parse(raw) as DatabaseShape;
  db.withdrawals ??= [];
  db.connectedWallets ??= [];
  db.checkpoints ??= initialDb.checkpoints;
  return db;
}

async function writeDb(db: DatabaseShape): Promise<void> {
  await writeFile(tmpPath, `${JSON.stringify(db, null, 2)}\n`);
  await rename(tmpPath, dbPath);
}

async function updateDb<T>(updater: (db: DatabaseShape) => T | Promise<T>): Promise<T> {
  const previous = writeQueue;
  let release!: () => void;
  writeQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    const db = await readDb();
    const result = await updater(db);
    await writeDb(db);
    return result;
  } finally {
    release();
  }
}

export async function getUserByTelegramId(telegramUserId: string): Promise<UserRecord | undefined> {
  const db = await readDb();
  return db.users.find((user) => user.telegramUserId === telegramUserId);
}

export async function createUser(
  input: Omit<UserRecord, "walletIndex" | "wallets">,
  walletFactory: (walletIndex: number) => UserRecord["wallets"]
): Promise<UserRecord> {
  return updateDb((db) => {
    const existing = db.users.find((user) => user.telegramUserId === input.telegramUserId);
    if (existing) {
      return existing;
    }

    const walletIndex = db.nextWalletIndex;
    const user: UserRecord = {
      ...input,
      walletIndex,
      wallets: walletFactory(walletIndex)
    };

    db.nextWalletIndex += 1;
    db.users.push(user);
    return user;
  });
}

export async function getAllUsers(): Promise<UserRecord[]> {
  const db = await readDb();
  return db.users;
}

export async function getDatabaseSnapshot(): Promise<DatabaseShape> {
  return readDb();
}

export async function getWalletOwner(chain: Chain, address: string): Promise<UserRecord | undefined> {
  const db = await readDb();
  const normalized = chain === "solana" ? address : address.toLowerCase();
  return db.users.find((user) => {
    const walletAddress = user.wallets[chain].address;
    return chain === "solana" ? walletAddress === normalized : walletAddress.toLowerCase() === normalized;
  });
}

export async function getDepositById(id: string): Promise<DepositRecord | undefined> {
  const db = await readDb();
  return db.deposits.find((deposit) => deposit.id === id);
}

export async function getConfirmedUnnotifiedDeposits(): Promise<DepositRecord[]> {
  const db = await readDb();
  return db.deposits.filter((deposit) => deposit.status === "confirmed" && !deposit.notified);
}

export async function saveDeposit(deposit: DepositRecord): Promise<DepositRecord | undefined> {
  return updateDb((db) => {
    if (db.deposits.some((existing) => existing.id === deposit.id)) {
      return undefined;
    }
    db.deposits.push(deposit);
    return deposit;
  });
}

export async function saveWithdrawalRequest(
  withdrawal: WithdrawalRequestRecord
): Promise<WithdrawalRequestRecord> {
  return updateDb((db) => {
    db.withdrawals ??= [];
    db.withdrawals.push(withdrawal);
    return withdrawal;
  });
}

export async function saveConnectedWallet(wallet: ConnectedWalletRecord): Promise<ConnectedWalletRecord> {
  return updateDb((db) => {
    db.connectedWallets ??= [];
    db.connectedWallets.push(wallet);
    return wallet;
  });
}

export async function hasConnectedWallet(telegramUserId: string): Promise<boolean> {
  const db = await readDb();
  return (db.connectedWallets ?? []).some((wallet) => wallet.telegramUserId === telegramUserId);
}

export async function markDepositConfirmed(
  id: string,
  confirmations?: number
): Promise<DepositRecord | undefined> {
  return updateDb((db) => {
    const deposit = db.deposits.find((item) => item.id === id);
    if (!deposit) {
      return undefined;
    }
    deposit.status = "confirmed";
    deposit.confirmedAt = deposit.confirmedAt ?? new Date().toISOString();
    deposit.confirmations = confirmations;
    return deposit;
  });
}

export async function markDepositNotified(id: string): Promise<void> {
  await updateDb((db) => {
    const deposit = db.deposits.find((item) => item.id === id);
    if (deposit) {
      deposit.notified = true;
    }
  });
}

export async function getCheckpoint(chain: Chain): Promise<number | null> {
  const db = await readDb();
  return db.checkpoints[chain];
}

export async function setCheckpoint(chain: Chain, blockNumber: number): Promise<void> {
  await updateDb((db) => {
    db.checkpoints[chain] = blockNumber;
  });
}
