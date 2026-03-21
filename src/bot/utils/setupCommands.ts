import TelegramBot from 'node-telegram-bot-api';
import { db } from '../../db';

const userPrivateCommands = [
  { command: '/start', description: 'Bắt đầu bot' },
  { command: '/menu', description: 'Bảng điều khiển (cho user)' },
  { command: '/cancel', description: 'Hủy thao tác' }
];

const adminPrivateCommands = [
  { command: '/start', description: 'Bắt đầu bot' },
  { command: '/menu', description: 'Bảng điều khiển (cho admin)' },
  { command: '/cancel', description: 'Hủy thao tác' }
];

export async function setupCommands(bot: TelegramBot) {
  try {
    // 1. Clear all global commands first to ensure a clean state
    await bot.deleteMyCommands();

    // 2. Clear all chat administrator commands
    await bot.deleteMyCommands({ scope: { type: 'all_chat_administrators' } });

    // 3. Default for all private chats (Users)
    await bot.setMyCommands(userPrivateCommands, { scope: { type: 'all_private_chats' } });

    // 4. Default for all group chats (Users)
    await bot.setMyCommands([
      { command: '/start', description: 'Bắt đầu bot' },
      // { command: '/info_personnel', description: 'Xem thông tin nhân sự' }
    ], { scope: { type: 'all_group_chats' } });

    // 5. Commands for group administrators (only /start, no /admin)
    await bot.setMyCommands([
      { command: '/start', description: 'Bắt đầu bot' },
      // { command: '/info_personnel', description: 'Xem thông tin nhân sự' }
    ], { scope: { type: 'all_chat_administrators' } });

    // 6. Set specific commands for existing admins in private chat
    try {
      const adminRes = await db.query("SELECT id FROM users WHERE role = 'admin'");
      for (const row of adminRes.rows) {
        await setAdminPrivateCommands(bot, row.id);
      }
    } catch (dbErr) {
      console.error('Error fetching admins for commands setup:', dbErr);
    }

    console.log('Bot commands setup successfully.');
  } catch (err) {
    console.error('Failed to setup bot commands:', err);
  }
}

export async function setAdminPrivateCommands(bot: TelegramBot, userId: number) {
  try {
    await bot.setMyCommands(adminPrivateCommands, { scope: { type: 'chat', chat_id: userId } });
  } catch (err) {
    console.error(`Failed to set admin commands for user ${userId}:`, err);
  }
}

export async function removeAdminPrivateCommands(bot: TelegramBot, userId: number) {
  try {
    // Explicitly set the basic user commands to force UI update, instead of just deleting
    await bot.setMyCommands(userPrivateCommands, { scope: { type: 'chat', chat_id: userId } });
  } catch (err) {
    console.error(`Failed to remove admin commands for user ${userId}:`, err);
  }
}
