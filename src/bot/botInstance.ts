import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not defined in .env');
  process.exit(1);
}

export const bot = new TelegramBot(token, {
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

bot.on('polling_error', (error: any) => {
  console.error('Polling Error:', error.code, error.message);
  if (error.code === 'EFATAL' || error.code === 'ETIMEDOUT') {
    console.log('Network error detected. Bot will attempt to reconnect automatically.');
  }
});

export let botUsername = '';
bot.getMe().then(me => {
  if (me.username) botUsername = me.username;
}).catch(console.error);
