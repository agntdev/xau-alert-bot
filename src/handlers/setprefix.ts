import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserByChatId, setUser } from "../storage.js";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

const composer = new Composer<Ctx>();

composer.callbackQuery("setprefix:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const chatId = ctx.from?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  const currentPrefix = user?.prefix || "None";

  await ctx.editMessageText(
    `📝 Current prefix: ${currentPrefix}\n\n` +
    "Send a new prefix to set it, or send /cancel to keep the current one.",
    { reply_markup: backToMenu }
  );
});

composer.command("setprefix", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const user = await getUserByChatId(chatId);
  const currentPrefix = user?.prefix || "None";

  await ctx.reply(
    `📝 Current prefix: ${currentPrefix}\n\n` +
    "Send a new prefix to set it, or send /cancel to keep the current one.",
    { reply_markup: backToMenu }
  );
});

composer.on("message:text", async (ctx, next) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return next();

  const text = ctx.message.text;
  if (text.startsWith("/")) return next();

  const user = await getUserByChatId(chatId);
  if (!user) return next();

  const newPrefix = text.trim();
  await setUser(chatId, { ...user, prefix: newPrefix });

  await ctx.reply(
    `✅ Prefix set to: ${newPrefix}\n\n` +
    "All future alerts will be prefixed with this.",
    { reply_markup: backToMenu }
  );
});

export default composer;
