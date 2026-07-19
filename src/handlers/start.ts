import { Composer } from "grammy";
import { randomBytes } from "node:crypto";
import type { Ctx } from "../bot.js";
import {
  registerMainMenuItem,
  inlineButton,
  inlineKeyboard,
  mainMenuKeyboard,
} from "../toolkit/index.js";
import {
  getUserByChatId,
  setUser,
  setSubscription,
} from "../storage.js";

const WELCOME = "👋 Welcome! Tap a button below to get started.";

registerMainMenuItem({ label: "🔗 Webhook URL", data: "webhook:show", order: 5 });
registerMainMenuItem({ label: "📋 Set prefix", data: "setprefix:show", order: 10 });
registerMainMenuItem({ label: "📊 Alert status", data: "status:show", order: 20 });

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const existing = await getUserByChatId(chatId);
  if (!existing) {
    const token = generateToken();
    const user = { telegram_chat_id: chatId, prefix: "", webhook_token: token };
    await setUser(chatId, user);
    await setSubscription(token, { webhook_token: token, telegram_chat_id: chatId });
  }

  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
