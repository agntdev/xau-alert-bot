import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserByChatId, getAlerts } from "../storage.js";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

function formatAlertTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

const composer = new Composer<Ctx>();

composer.callbackQuery("status:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.from?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.editMessageText(
      "You're not registered yet. Tap /start to set up alerts.",
      { reply_markup: backToMenu }
    );
    return;
  }

  const alerts = await getAlerts(chatId);

  if (alerts.length === 0) {
    await ctx.editMessageText(
      "📊 No alerts yet. Configure your TradingView webhook to start receiving alerts.",
      { reply_markup: backToMenu }
    );
    return;
  }

  const alertLines = alerts.slice(0, 10).map((alert, i) => {
    const prefix = user.prefix ? `[${user.prefix}] ` : "";
    const time = formatAlertTime(alert.timestamp);
    return `${i + 1}. ${prefix}${alert.message.substring(0, 50)} (${time})`;
  });

  await ctx.editMessageText(
    `📊 Last ${Math.min(alerts.length, 10)} alerts:\n\n` +
    alertLines.join("\n"),
    { reply_markup: backToMenu }
  );
});

composer.command("status", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.reply(
      "You're not registered yet. Tap /start to set up alerts.",
      { reply_markup: backToMenu }
    );
    return;
  }

  const alerts = await getAlerts(chatId);

  if (alerts.length === 0) {
    await ctx.reply(
      "📊 No alerts yet. Configure your TradingView webhook to start receiving alerts.",
      { reply_markup: backToMenu }
    );
    return;
  }

  const alertLines = alerts.slice(0, 10).map((alert, i) => {
    const prefix = user.prefix ? `[${user.prefix}] ` : "";
    const time = formatAlertTime(alert.timestamp);
    return `${i + 1}. ${prefix}${alert.message.substring(0, 50)} (${time})`;
  });

  await ctx.reply(
    `📊 Last ${Math.min(alerts.length, 10)} alerts:\n\n` +
    alertLines.join("\n"),
    { reply_markup: backToMenu }
  );
});

export default composer;
