import { buildBot } from "./bot.js";
import { setDefaultCommands } from "./toolkit/index.js";
import { createWebhookServer } from "./webhook.js";

async function main() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error("BOT_TOKEN is required");
    process.exit(1);
  }

  const bot = await buildBot(token);
  await setDefaultCommands(bot);

  const webhookPort = parseInt(process.env.WEBHOOK_PORT ?? "3000", 10);
  createWebhookServer(bot, webhookPort);

  bot.start();
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
