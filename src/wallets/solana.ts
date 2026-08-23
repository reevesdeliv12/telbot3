import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import { mnemonicToSeedSync } from "bip39";
import { env } from "../config/env.js";

export function deriveSolanaWallet(index: number): { address: string } {
  const seed = mnemonicToSeedSync(env.SOLANA_MASTER_MNEMONIC);
  const derived = derivePath(`m/44'/501'/${index}'/0'`, seed.toString("hex"));
  const keypair = Keypair.fromSeed(derived.key);
  return {
    address: keypair.publicKey.toBase58()
  };
}
