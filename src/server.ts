import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initBot } from './bot';
import { db, initDb } from './db';
import apiRoutes from './api/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    // Initialize Database
    await initDb();
    console.log('Database connected successfully');

    // Initialize Telegram Bot
    initBot();
    console.log('Telegram Bot initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
