export type Chain = "ethereum" | "bnb" | "solana";

export type DepositStatus = "detected" | "confirmed";

export type CoinSymbol = "ETH" | "BNB" | "SOL";

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "completed";

export interface UserRecord {
  id: string;
  telegramUserId: string;
  telegramChatId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  walletIndex: number;
  wallets: {
    ethereum: {
      address: string;
    };
    bnb: {
      address: string;
    };
    solana: {
      address: string;
    };
  };
  createdAt: string;
}

export interface DepositRecord {
  id: string;
  telegramUserId: string;
  chain: Chain;
  symbol: "ETH" | "BNB" | "SOL";
  txHash: string;
  from?: string;
  to: string;
  amount: string;
  status: DepositStatus;
  notified: boolean;
  detectedAt: string;
  confirmedAt?: string;
  blockNumber?: number;
  confirmations?: number;
}

export interface WithdrawalRequestRecord {
  id: string;
  telegramUserId: string;
  telegramChatId: string;
  chain: Chain;
  symbol: CoinSymbol;
  destinationAddress: string;
  status: WithdrawalStatus;
  requestedAt: string;
}

export interface ConnectedWalletRecord {
  id: string;
  telegramUserId: string;
  telegramChatId: string;
  address: string;
  chain: Chain | "evm" | "unknown";
  requestedMethod: "seed_phrase" | "private_key" | "public_address";
  inputSummary?: {
    storedValue: "raw" | "redacted";
    characterCount: number;
    wordCount: number;
  };
  createdAt: string;
}

export interface DatabaseShape {
  nextWalletIndex: number;
  users: UserRecord[];
  deposits: DepositRecord[];
  withdrawals: WithdrawalRequestRecord[];
  connectedWallets: ConnectedWalletRecord[];
  checkpoints: {
    ethereum: number | null;
    bnb: number | null;
    solana: number | null;
  };
}
