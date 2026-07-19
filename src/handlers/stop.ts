import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard, mainMenuKeyboard } from "../toolkit/index.js";
import { getUserByChatId, deleteUser, deleteSubscription, clearAlerts } from "../storage.js";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

const composer = new Composer<Ctx>();

composer.callbackQuery("stop:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.from?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.editMessageText(
      "You're not registered yet.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  await deleteUser(chatId);
  await deleteSubscription(user.prefix || "");
  await clearAlerts(chatId);

  await ctx.editMessageText(
    "✅ Unregistered. Alerts will no longer be sent to this chat.\n\n" +
    "Tap /start to re-register anytime.",
    { reply_markup: mainMenuKeyboard() }
  );
});

composer.callbackQuery("stop:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("stop:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.from?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.editMessageText(
      "You're not registered yet.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  await ctx.editMessageText(
    "⚠️ This will disable alerts for this chat.\n\n" +
    "Are you sure you want to stop?",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Stop alerts", "stop:confirm"),
          inlineButton("❌ Keep alerts", "stop:cancel"),
        ],
      ]),
    }
  );
});

composer.command("stop", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  if (!user) {
    await ctx.reply(
      "You're not registered yet.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  await ctx.reply(
    "⚠️ This will disable alerts for this chat.\n\n" +
    "Are you sure you want to stop?",
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Stop alerts", "stop:confirm"),
          inlineButton("❌ Keep alerts", "stop:cancel"),
        ],
      ]),
    }
  );
});

const WELCOME = "👋 Welcome! Tap a button below to get started.";

export default composer;
