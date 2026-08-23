import { HDNodeWallet, Mnemonic } from "ethers";
import { env } from "../config/env.js";

export function deriveEvmWallet(index: number): { address: string } {
  const mnemonic = Mnemonic.fromPhrase(env.EVM_MASTER_MNEMONIC);
  const wallet = HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`);
  return {
    address: wallet.address
  };
}
