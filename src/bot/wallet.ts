import { Context } from "telegraf";
import { getBnbBalance } from "../chains/bnb.js";
import { getEthBalance } from "../chains/ethereum.js";
import { getSolBalance } from "../chains/solana.js";
import { getCurrentUser } from "../services/userService.js";

export async function walletCommand(ctx: Context): Promise<void> {
  const user = await getCurrentUser(ctx);
  if (!user) {
    await ctx.reply("⚠️ Please send /start first to create your wallets.");
    return;
  }

  const [ethBalance, bnbBalance, solBalance] = await Promise.all([
    getEthBalance(user.wallets.ethereum.address),
    getBnbBalance(user.wallets.bnb.address),
    getSolBalance(user.wallets.solana.address)
  ]);

  await ctx.reply(
    [
      "💰 My Wallet",
      "",
      "🔷 Ethereum",
      user.wallets.ethereum.address,
      `Balance: ${ethBalance} ETH`,
      "",
      "🟡 BNB Smart Chain",
      user.wallets.bnb.address,
      `Balance: ${bnbBalance} BNB`,
      "",
      "🟣 Solana",
      user.wallets.solana.address,
      `Balance: ${solBalance} SOL`
    ].join("\n")
  );
}
