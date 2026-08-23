import { ethers } from "ethers";
import { env } from "../config/env.js";

export const bnbProvider = new ethers.JsonRpcProvider(env.BNB_RPC_URL);

export async function getBnbBalance(address: string): Promise<string> {
  const balance = await bnbProvider.getBalance(address);
  return ethers.formatEther(balance);
}
