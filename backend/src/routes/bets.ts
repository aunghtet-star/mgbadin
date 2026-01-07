import { Router, Response } from 'express';
import { query, queryOne, transaction } from '../db';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

interface Bet {
  id: string;
  phase_id: string;
  user_id: string;
  user_role: string;
  number: string;
  amount: number;
  timestamp: string;
}

const createBetSchema = z.object({
  phaseId: z.string().uuid(),
  number: z.string().regex(/^([0-9]{2,3}|ADJ)$/),
  amount: z.number(),
});

const bulkBetSchema = z.object({
  phaseId: z.string().uuid(),
  bets: z.array(z.object({
    number: z.string().regex(/^([0-9]{2,3}|ADJ)$/),
    amount: z.number(),
  })),
});

// Get all bets for a phase
router.get('/phase/:phaseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bets = await query<Bet>(
      `SELECT b.*, u.username 
       FROM bets b 
       JOIN users u ON b.user_id = u.id 
       WHERE b.phase_id = $1 
       ORDER BY b.timestamp DESC`,
      [req.params.phaseId]
    );
    res.json({ bets });
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get aggregated bets by number for a phase
router.get('/phase/:phaseId/aggregated', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const aggregated = await query<{ number: string; total: number }>(
      `SELECT number, SUM(amount) as total 
       FROM bets 
       WHERE phase_id = $1 
       GROUP BY number 
       ORDER BY total DESC`,
      [req.params.phaseId]
    );
    res.json({ aggregated });
  } catch (error) {
    console.error('Get aggregated bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's bets for a phase
router.get('/phase/:phaseId/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bets = await query<Bet>(
      `SELECT * FROM bets 
       WHERE phase_id = $1 AND user_id = $2 
       ORDER BY timestamp DESC`,
      [req.params.phaseId, req.user!.id]
    );
    res.json({ bets });
  } catch (error) {
    console.error('Get my bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a single bet
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { phaseId, number, amount } = createBetSchema.parse(req.body);

    // Check if phase is active
    const phase = await queryOne<{ active: boolean }>(
      'SELECT active FROM game_phases WHERE id = $1',
      [phaseId]
    );

    if (!phase?.active) {
      return res.status(400).json({ error: 'Phase is not active' });
    }

    const [bet] = await query<Bet>(
      `INSERT INTO bets (phase_id, user_id, user_role, number, amount)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [phaseId, req.user!.id, req.user!.role, number, amount]
    );

    // Update phase totals
    await query(
      `UPDATE game_phases 
       SET total_bets = total_bets + 1, 
           total_volume = total_volume + $1 
       WHERE id = $2`,
      [Math.abs(amount), phaseId]
    );

    res.status(201).json({ bet });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk create bets
router.post('/bulk', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { phaseId, bets: betData } = bulkBetSchema.parse(req.body);

    // Check if phase is active
    const phase = await queryOne<{ active: boolean }>(
      'SELECT active FROM game_phases WHERE id = $1',
      [phaseId]
    );

    if (!phase?.active) {
      return res.status(400).json({ error: 'Phase is not active' });
    }

    const createdBets = await transaction(async (client) => {
      const results: Bet[] = [];
      let totalVolume = 0;

      for (const bet of betData) {
        const result = await client.query(
          `INSERT INTO bets (phase_id, user_id, user_role, number, amount)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [phaseId, req.user!.id, req.user!.role, bet.number, bet.amount]
        );
        results.push(result.rows[0]);
        totalVolume += Math.abs(bet.amount);
      }

      // Update phase totals
      await client.query(
        `UPDATE game_phases 
         SET total_bets = total_bets + $1, 
             total_volume = total_volume + $2 
         WHERE id = $3`,
        [betData.length, totalVolume, phaseId]
      );

      return results;
    });

    res.status(201).json({ bets: createdBets });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Bulk create bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a bet (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const bet = await queryOne<Bet>('SELECT * FROM bets WHERE id = $1', [req.params.id]);

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    await query('DELETE FROM bets WHERE id = $1', [req.params.id]);

    // Update phase totals
    await query(
      `UPDATE game_phases 
       SET total_bets = total_bets - 1, 
           total_volume = total_volume - $1 
       WHERE id = $2`,
      [Math.abs(bet.amount), bet.phase_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
