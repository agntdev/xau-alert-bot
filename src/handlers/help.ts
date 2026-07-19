import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const HELP =
  "ℹ️ This bot delivers TradingView alerts to your Telegram chat.\n\n" +
  "Tap /start to open the menu, then pick what you want from the buttons.\n\n" +
  "Everything in this bot is reachable by tapping — you don't need to remember any commands.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

const composer = new Composer<Ctx>();

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
