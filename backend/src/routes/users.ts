import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

interface User {
  id: string;
  username: string;
  role: string;
  balance: number;
  created_at: string;
}

// Get all users (admin only)
router.get('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const users = await query<User>(
      'SELECT id, username, role, balance, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role } = req.body;
    
    const existing = await queryOne<User>(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const [user] = await query<User>(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, balance, created_at`,
      [username, passwordHash, role]
    );
    
    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role, balance } = req.body;
    
    let updateQuery = 'UPDATE users SET username = $1, role = $2, balance = $3';
    let params = [username, role, balance, req.params.id];
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updateQuery = 'UPDATE users SET username = $1, role = $2, balance = $3, password_hash = $4 WHERE id = $5 RETURNING id, username, role, balance, created_at';
      params = [username, role, balance, passwordHash, req.params.id];
    } else {
      updateQuery += ' WHERE id = $4 RETURNING id, username, role, balance, created_at';
    }
    
    const [user] = await query<User>(updateQuery, params);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user history (bets by user)
router.get('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Users can only see their own history, admins can see anyone's
    if (req.user!.role !== 'ADMIN' && req.user!.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const bets = await query(
      `SELECT b.*, gp.name as phase_name
       FROM bets b
       JOIN game_phases gp ON b.phase_id = gp.id
       WHERE b.user_id = $1
       ORDER BY b.timestamp DESC
       LIMIT 100`,
      [req.params.id]
    );
    
    res.json({ bets });
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
