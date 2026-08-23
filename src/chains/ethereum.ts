import { ethers } from "ethers";
import { env } from "../config/env.js";

export const ethereumProvider = new ethers.JsonRpcProvider(env.ETH_RPC_URL);

export async function getEthBalance(address: string): Promise<string> {
  const balance = await ethereumProvider.getBalance(address);
  return ethers.formatEther(balance);
}
