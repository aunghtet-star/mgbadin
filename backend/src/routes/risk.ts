import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';

const router = Router();

// Get risk analysis for a phase (top numbers by exposure)
router.get('/phase/:phaseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const riskData = await query<{ number: string; total: number; potential_payout: number }>(
      `SELECT 
         number, 
         SUM(amount) as total,
         SUM(amount) * 80 as potential_payout
       FROM bets 
       WHERE phase_id = $1 AND amount > 0
       GROUP BY number 
       ORDER BY total DESC
       LIMIT 20`,
      [req.params.phaseId]
    );
    
    // Get total volume for the phase
    const totals = await queryOne<{ total_volume: number; total_bets: number }>(
      'SELECT total_volume, total_bets FROM game_phases WHERE id = $1',
      [req.params.phaseId]
    );
    
    res.json({ 
      riskData,
      totalVolume: totals?.total_volume || 0,
      totalBets: totals?.total_bets || 0
    });
  } catch (error) {
    console.error('Get risk data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get excess numbers (numbers exceeding limits)
router.get('/phase/:phaseId/excess', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const excessData = await query<{ 
      number: string; 
      current_amount: number; 
      max_amount: number;
      excess: number;
    }>(
      `SELECT 
         nl.number,
         COALESCE(SUM(b.amount), 0) as current_amount,
         nl.max_amount,
         GREATEST(COALESCE(SUM(b.amount), 0) - nl.max_amount, 0) as excess
       FROM number_limits nl
       LEFT JOIN bets b ON nl.phase_id = b.phase_id AND nl.number = b.number
       WHERE nl.phase_id = $1
       GROUP BY nl.number, nl.max_amount
       HAVING COALESCE(SUM(b.amount), 0) > nl.max_amount
       ORDER BY excess DESC`,
      [req.params.phaseId]
    );
    
    res.json({ excessData });
  } catch (error) {
    console.error('Get excess data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set number limit (admin only)
router.post('/limits', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { phaseId, number, maxAmount } = req.body;
    
    await query(
      `INSERT INTO number_limits (phase_id, number, max_amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (phase_id, number) 
       DO UPDATE SET max_amount = $3`,
      [phaseId, number, maxAmount]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Set limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk set number limits (admin only)
router.post('/limits/bulk', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { phaseId, limits } = req.body;
    
    for (const limit of limits) {
      await query(
        `INSERT INTO number_limits (phase_id, number, max_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (phase_id, number) 
         DO UPDATE SET max_amount = $3`,
        [phaseId, limit.number, limit.maxAmount]
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Bulk set limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all limits for a phase
router.get('/limits/:phaseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limits = await query<{ number: string; max_amount: number }>(
      'SELECT number, max_amount FROM number_limits WHERE phase_id = $1',
      [req.params.phaseId]
    );
    res.json({ limits });
  } catch (error) {
    console.error('Get limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
