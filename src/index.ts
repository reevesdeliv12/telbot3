import { setDefaultResultOrder } from "node:dns";
import express, { type Request, type Response } from "express";
import { createBot } from "./bot/bot.js";
import { startBnbMonitor } from "./monitors/bnbMonitor.js";
import { startEthereumMonitor } from "./monitors/ethereumMonitor.js";
import { startSolanaMonitor } from "./monitors/solanaMonitor.js";
import { env } from "./config/env.js";
import { notifyPendingDeposits } from "./services/notificationService.js";

setDefaultResultOrder("ipv4first");

const botLaunchRetryMs = 15000;

async function launchBotWithRetry(bot: ReturnType<typeof createBot>): Promise<void> {
  while (true) {
    try {
      await bot.launch();
      console.log("Telegram wallet demo is running.");
      return;
    } catch (error) {
      console.error(`Telegram bot launch failed. Retrying in ${botLaunchRetryMs / 1000}s...`, error);
      await new Promise((resolve) => setTimeout(resolve, botLaunchRetryMs));
    }
  }
}

async function main(): Promise<void> {
  const app = express();
  const port = Number(process.env.PORT ?? 10000);
  const bot = createBot();

  app.get("/", (_request: Request, response: Response) => {
    response.send("Telegram bot is running");
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`Listening on port ${port}`);
  });

  startEthereumMonitor(bot);
  startBnbMonitor(bot);
  startSolanaMonitor(bot);

  setInterval(() => {
    notifyPendingDeposits(bot).catch((error) => {
      console.error("Pending notification sweep error", error);
    });
  }, env.MONITOR_INTERVAL_MS);

  void launchBotWithRetry(bot);

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Stopping bot...`);
    bot.stop(signal);
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("Application failed to start", error);
  process.exit(1);
});
