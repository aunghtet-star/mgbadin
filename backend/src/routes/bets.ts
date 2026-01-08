import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const router = Router();

const createBetSchema = z.object({
  phaseId: z.string().uuid(),
  number: z.string().regex(/^([0-9]{2,3}|ADJ|EXC)$/).transform(val =>
    val === 'ADJ' || val === 'EXC' ? val : val.padStart(3, '0')
  ),
  amount: z.number(),
});

const bulkBetSchema = z.object({
  phaseId: z.string().uuid(),
  bets: z.array(z.object({
    number: z.string().regex(/^([0-9]{2,3}|ADJ|EXC)$/).transform(val =>
      val === 'ADJ' || val === 'EXC' ? val : val.padStart(3, '0')
    ),
    amount: z.number(),
  })),
});

// Get all bets for a phase
router.get('/phase/:phaseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bets = await prisma.bet.findMany({
      where: { phaseId: req.params.phaseId },
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Flatten the response to include username
    const formattedBets = bets.map(bet => ({
      ...bet,
      username: bet.user.username,
      user: undefined,
    }));

    res.json({ bets: formattedBets });
  } catch (error) {
    console.error('Get bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get aggregated bets by number for a phase
router.get('/phase/:phaseId/aggregated', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const aggregated = await prisma.bet.groupBy({
      by: ['number'],
      where: { phaseId: req.params.phaseId },
      _sum: { amount: true },
      orderBy: {
        _sum: { amount: 'desc' },
      },
    });

    const formatted = aggregated.map(item => ({
      number: item.number,
      total: item._sum.amount?.toNumber() || 0,
    }));

    res.json({ aggregated: formatted });
  } catch (error) {
    console.error('Get aggregated bets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's bets for a phase
router.get('/phase/:phaseId/my', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const bets = await prisma.bet.findMany({
      where: {
        phaseId: req.params.phaseId,
        userId: req.user!.id,
      },
      orderBy: { timestamp: 'desc' },
    });
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
    const phase = await prisma.gamePhase.findUnique({
      where: { id: phaseId },
      select: { active: true },
    });

    if (!phase?.active) {
      return res.status(400).json({ error: 'Phase is not active' });
    }

    const bet = await prisma.bet.create({
      data: {
        phaseId,
        userId: req.user!.id,
        number,
        amount: new Prisma.Decimal(amount),
      },
    });

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
    const phase = await prisma.gamePhase.findUnique({
      where: { id: phaseId },
      select: { active: true },
    });

    if (!phase?.active) {
      return res.status(400).json({ error: 'Phase is not active' });
    }

    const createdBets = await prisma.$transaction(
      betData.map(bet =>
        prisma.bet.create({
          data: {
            phaseId,
            userId: req.user!.id,
            number: bet.number,
            amount: new Prisma.Decimal(bet.amount),
          },
        })
      )
    );

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
    const bet = await prisma.bet.findUnique({
      where: { id: req.params.id },
    });

    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    await prisma.bet.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a bet amount (admin only)
router.patch('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;

    if (amount === undefined || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Amount is required and must be a number' });
    }

    const existingBet = await prisma.bet.findUnique({
      where: { id: req.params.id },
    });

    if (!existingBet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    const updatedBet = await prisma.bet.update({
      where: { id: req.params.id },
      data: { amount: new Prisma.Decimal(amount) },
    });

    res.json({ bet: updatedBet });
  } catch (error) {
    console.error('Update bet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
