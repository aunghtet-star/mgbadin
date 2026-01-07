import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

interface GamePhase {
  id: string;
  name: string;
  active: boolean;
  start_date: string;
  end_date: string | null;
  total_bets: number;
  total_volume: number;
}

const createPhaseSchema = z.object({
  name: z.string().min(1).max(100),
});

// Get all phases
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const phases = await query<GamePhase>(
      'SELECT * FROM game_phases ORDER BY created_at DESC'
    );
    res.json({ phases });
  } catch (error) {
    console.error('Get phases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active phase
router.get('/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const phase = await queryOne<GamePhase>(
      'SELECT * FROM game_phases WHERE active = true ORDER BY created_at DESC LIMIT 1'
    );
    res.json({ phase });
  } catch (error) {
    console.error('Get active phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get phase by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const phase = await queryOne<GamePhase>(
      'SELECT * FROM game_phases WHERE id = $1',
      [req.params.id]
    );
    
    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    
    res.json({ phase });
  } catch (error) {
    console.error('Get phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new phase (admin only)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = createPhaseSchema.parse(req.body);
    
    // Deactivate all existing phases
    await query('UPDATE game_phases SET active = false');
    
    const [phase] = await query<GamePhase>(
      `INSERT INTO game_phases (name, active)
       VALUES ($1, true)
       RETURNING *`,
      [name]
    );
    
    res.status(201).json({ phase });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close phase (admin only)
router.post('/:id/close', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { winningNumber } = req.body;
    
    const phase = await queryOne<GamePhase>(
      'SELECT * FROM game_phases WHERE id = $1',
      [req.params.id]
    );
    
    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }
    
    // Calculate totals
    const totals = await queryOne<{ total_in: number }>(
      'SELECT COALESCE(SUM(amount), 0) as total_in FROM bets WHERE phase_id = $1 AND amount > 0',
      [req.params.id]
    );
    
    let totalOut = 0;
    if (winningNumber) {
      const winnings = await queryOne<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) * 80 as total FROM bets WHERE phase_id = $1 AND number = $2 AND amount > 0',
        [req.params.id, winningNumber]
      );
      totalOut = winnings?.total || 0;
    }
    
    const totalIn = totals?.total_in || 0;
    const profit = totalIn - totalOut;
    
    // Create settlement record
    await query(
      `INSERT INTO settlement_ledger (phase_id, winning_number, total_in, total_out, profit)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, winningNumber, totalIn, totalOut, profit]
    );
    
    // Close the phase
    const [updatedPhase] = await query<GamePhase>(
      `UPDATE game_phases 
       SET active = false, end_date = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    
    res.json({ 
      phase: updatedPhase,
      settlement: { totalIn, totalOut, profit, winningNumber }
    });
  } catch (error) {
    console.error('Close phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete phase (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM game_phases WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
