import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { getUserByChatId } from "../storage.js";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

const composer = new Composer<Ctx>();

composer.callbackQuery("webhook:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.from?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.editMessageText(
      "You're not registered yet. Tap /start to set up alerts.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  const baseUrl = process.env.WEBHOOK_BASE_URL ?? "https://your-domain.com";
  const webhookUrl = `${baseUrl}/webhook/${user.webhook_token}`;

  await ctx.editMessageText(
    "🔗 Your webhook URL:\n\n" +
    `<code>${webhookUrl}</code>\n\n` +
    "Configure this URL in TradingView to receive alerts here.",
    { reply_markup: backToMenu, parse_mode: "HTML" }
  );
});

export default composer;
