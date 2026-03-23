import { Router } from 'express';
import { db } from '../../db';
import { bot } from '../../bot/botInstance';

const router = Router();

// Webhook endpoint to receive contact form data from WordPress
router.post('/webhook/contact', async (req, res) => {
  console.log('=========================================');
  console.log(`[Webhook] 📥 RECEIVED NEW REQUEST at ${new Date().toISOString()}`);
  console.log('[Webhook] 🌐 IP:', req.ip);
  console.log('[Webhook] 📝 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[Webhook] 📦 Body:', JSON.stringify(req.body, null, 2));
  console.log('=========================================');

  const secret = req.headers['x-webhook-secret'] || req.query.secret || req.body.secret;

  // Verify secret key
  if (secret !== process.env.WEBHOOK_SECRET) {
    console.warn(`[Webhook] ❌ Unauthorized: Secret mismatch.`);
    console.warn(`[Webhook] Expected: "${process.env.WEBHOOK_SECRET}"`);
    console.warn(`[Webhook] Got: "${secret}"`);
    return res.status(401).json({ error: 'Unauthorized: Invalid secret key' });
  }

  try {
    const { name, email, phone, message, service } = req.body;

    console.log('[Webhook] 🔍 Querying database for contact topic...');
    // Find the topic configured for 'contact'
    const topicRes = await db.query(
      "SELECT chat_id, topic_id FROM topics WHERE feature_type = 'contact' LIMIT 1"
    );

    if (topicRes.rows.length === 0) {
      console.warn('[Webhook] ⚠️ No contact topic configured in database.');
      return res.status(404).json({ error: 'No contact topic configured' });
    }

    const { chat_id, topic_id } = topicRes.rows[0];
    console.log(`[Webhook] ✅ Found topic. Chat ID: ${chat_id}, Topic ID: ${topic_id}`);

    const escapeHtml = (text: string) => {
      return (text || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };

    const safeName = escapeHtml(name).trim();
    const safePhone = escapeHtml(phone).trim();
    const safeEmail = escapeHtml(email).trim();
    const safeService = escapeHtml(service).trim();
    const safeMessage = escapeHtml(message).trim();

    const timeString = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const text = `🚨 <b>CÓ KHÁCH HÀNG LIÊN HỆ MỚI</b> 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>Khách hàng:</b> ${safeName ? safeName : '<i>Không cung cấp</i>'}\n` +
      `📱 <b>Số điện thoại:</b> ${safePhone ? `<code>${safePhone}</code>` : '<i>Không cung cấp</i>'}\n` +
      `📧 <b>Email:</b> ${safeEmail ? safeEmail : '<i>Không cung cấp</i>'}\n` +
      `💼 <b>Dịch vụ quan tâm:</b> <b>${safeService ? safeService : '<i>Không chọn</i>'}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📝 <b>Nội dung tư vấn:</b>\n` +
      `${safeMessage ? `<i>${safeMessage}</i>` : '<i>Không có nội dung</i>'}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏱ <b>Thời gian:</b> ${timeString}`;

    // Send message to the configured topic
    await bot.sendMessage(chat_id, text, {
      message_thread_id: topic_id || undefined,
      parse_mode: 'HTML'
    });

    res.json({ success: true, message: 'Contact forwarded to Telegram' });
  } catch (err) {
    console.error('Error handling contact webhook:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Example API endpoint
router.get('/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
