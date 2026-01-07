import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// Get risk analysis for a phase (top numbers by exposure)
router.get('/phase/:phaseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const aggregated = await prisma.bet.groupBy({
      by: ['number'],
      where: {
        phaseId: req.params.phaseId,
        amount: { gt: 0 },
      },
      _sum: { amount: true },
      orderBy: {
        _sum: { amount: 'desc' },
      },
      take: 20,
    });

    const riskData = aggregated.map(item => ({
      number: item.number,
      total: item._sum.amount?.toNumber() || 0,
      potential_payout: (item._sum.amount?.toNumber() || 0) * 80,
    }));

    // Get total volume and bets count
    const totals = await prisma.bet.aggregate({
      where: {
        phaseId: req.params.phaseId,
        amount: { gt: 0 },
      },
      _sum: { amount: true },
      _count: true,
    });

    res.json({
      riskData,
      totalVolume: totals._sum.amount?.toNumber() || 0,
      totalBets: totals._count || 0,
    });
  } catch (error) {
    console.error('Get risk data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get excess numbers (numbers exceeding limits)
router.get('/phase/:phaseId/excess', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limits = await prisma.numberLimit.findMany({
      where: { phaseId: req.params.phaseId },
    });

    const excessData = [];

    for (const limit of limits) {
      const betSum = await prisma.bet.aggregate({
        where: {
          phaseId: req.params.phaseId,
          number: limit.number,
        },
        _sum: { amount: true },
      });

      const currentAmount = betSum._sum.amount?.toNumber() || 0;
      const maxAmount = limit.maxAmount.toNumber();
      const excess = Math.max(currentAmount - maxAmount, 0);

      if (excess > 0) {
        excessData.push({
          number: limit.number,
          current_amount: currentAmount,
          max_amount: maxAmount,
          excess,
        });
      }
    }

    excessData.sort((a, b) => b.excess - a.excess);

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

    await prisma.numberLimit.upsert({
      where: {
        phaseId_number: { phaseId, number },
      },
      update: { maxAmount: new Prisma.Decimal(maxAmount) },
      create: {
        phaseId,
        number,
        maxAmount: new Prisma.Decimal(maxAmount),
      },
    });

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

    await prisma.$transaction(
      limits.map((limit: { number: string; maxAmount: number }) =>
        prisma.numberLimit.upsert({
          where: {
            phaseId_number: { phaseId, number: limit.number },
          },
          update: { maxAmount: new Prisma.Decimal(limit.maxAmount) },
          create: {
            phaseId,
            number: limit.number,
            maxAmount: new Prisma.Decimal(limit.maxAmount),
          },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Bulk set limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all limits for a phase
router.get('/limits/:phaseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limits = await prisma.numberLimit.findMany({
      where: { phaseId: req.params.phaseId },
    });

    const formatted = limits.map(l => ({
      number: l.number,
      max_amount: l.maxAmount.toNumber(),
    }));

    res.json({ limits: formatted });
  } catch (error) {
    console.error('Get limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
