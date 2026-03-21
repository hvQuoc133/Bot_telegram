import { Router } from 'express';
import { db } from '../../db';

const router = Router();

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
