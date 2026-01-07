import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all ledger entries
router.get('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.settlementLedger.findMany({
      include: {
        phase: {
          select: { name: true },
        },
      },
      orderBy: { settledAt: 'desc' },
    });

    const formatted = entries.map(entry => ({
      id: entry.id,
      phase_id: entry.phaseId,
      phase_name: entry.phase.name,
      total_in: entry.totalIn.toNumber(),
      total_out: entry.totalOut.toNumber(),
      net_profit: entry.netProfit.toNumber(),
      settled_at: entry.settledAt,
    }));

    res.json({ entries: formatted });
  } catch (error) {
    console.error('Get ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger summary
router.get('/summary', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const aggregate = await prisma.settlementLedger.aggregate({
      _sum: {
        totalIn: true,
        totalOut: true,
        netProfit: true,
      },
      _count: true,
    });

    res.json({
      summary: {
        total_in: aggregate._sum.totalIn?.toNumber() || 0,
        total_out: aggregate._sum.totalOut?.toNumber() || 0,
        total_profit: aggregate._sum.netProfit?.toNumber() || 0,
        phases_count: aggregate._count,
      },
    });
  } catch (error) {
    console.error('Get ledger summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ledger entry for a specific phase
router.get('/phase/:phaseId', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.settlementLedger.findUnique({
      where: { phaseId: req.params.phaseId },
      include: {
        phase: {
          select: { name: true },
        },
      },
    });

    if (!entry) {
      return res.json({ entries: [] });
    }

    const formatted = {
      id: entry.id,
      phase_id: entry.phaseId,
      phase_name: entry.phase.name,
      total_in: entry.totalIn.toNumber(),
      total_out: entry.totalOut.toNumber(),
      net_profit: entry.netProfit.toNumber(),
      settled_at: entry.settledAt,
    };

    res.json({ entries: [formatted] });
  } catch (error) {
    console.error('Get phase ledger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
