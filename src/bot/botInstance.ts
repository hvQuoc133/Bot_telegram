import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not defined in .env');
  process.exit(1);
}

export const bot = new TelegramBot(token, { polling: true });

export let botUsername = '';
bot.getMe().then(me => {
  if (me.username) botUsername = me.username;
}).catch(console.error);
