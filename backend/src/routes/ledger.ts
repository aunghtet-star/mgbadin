import { Router, Response } from 'express';
import { query } from '../db';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';

const router = Router();

interface LedgerEntry {
  id: string;
  phase_id: string;
  phase_name: string;
  winning_number: string | null;
  total_in: number;
  total_out: number;
  profit: number;
  closed_at: string;
}

// Get all ledger entries
router.get('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await query<LedgerEntry>(
      `SELECT sl.*, gp.name as phase_name
       FROM settlement_ledger sl
       JOIN game_phases gp ON sl.phase_id = gp.id
       ORDER BY sl.closed_at DESC`
    );
    res.json({ entries });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger summary
router.get('/summary', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const summary = await query<{ 
      total_in: number; 
      total_out: number; 
      total_profit: number;
      phases_count: number;
    }>(
      `SELECT 
         COALESCE(SUM(total_in), 0) as total_in,
         COALESCE(SUM(total_out), 0) as total_out,
         COALESCE(SUM(profit), 0) as total_profit,
         COUNT(*) as phases_count
       FROM settlement_ledger`
    );
    res.json({ summary: summary[0] });
  } catch (error) {
    console.error('Get ledger summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger entry for a specific phase
router.get('/phase/:phaseId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await query<LedgerEntry>(
      `SELECT sl.*, gp.name as phase_name
       FROM settlement_ledger sl
       JOIN game_phases gp ON sl.phase_id = gp.id
       WHERE sl.phase_id = $1`,
      [req.params.phaseId]
    );
    res.json({ entries });
  } catch (error) {
    console.error('Get phase ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
