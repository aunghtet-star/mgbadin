import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const router = Router();

const createPhaseSchema = z.object({
  name: z.string().min(1).max(100),
});

// Get all phases
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const phases = await prisma.gamePhase.findMany({
      orderBy: { startDate: 'desc' },
    });
    res.json({ phases });
  } catch (error) {
    console.error('Get phases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active phase
router.get('/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const phase = await prisma.gamePhase.findFirst({
      where: { active: true },
      orderBy: { startDate: 'desc' },
    });
    res.json({ phase });
  } catch (error) {
    console.error('Get active phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get phase by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const phase = await prisma.gamePhase.findUnique({
      where: { id: req.params.id },
    });

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

    // Deactivate all existing phases and create new one in transaction
    const phase = await prisma.$transaction(async (tx) => {
      await tx.gamePhase.updateMany({
        where: { active: true },
        data: { active: false },
      });

      return tx.gamePhase.create({
        data: {
          name,
          active: true,
        },
      });
    });

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

    const phase = await prisma.gamePhase.findUnique({
      where: { id: req.params.id },
    });

    if (!phase) {
      return res.status(404).json({ error: 'Phase not found' });
    }

    // Calculate totals
    const betsAggregate = await prisma.bet.aggregate({
      where: {
        phaseId: req.params.id,
        amount: { gt: 0 },
      },
      _sum: { amount: true },
    });

    const totalIn = betsAggregate._sum.amount?.toNumber() || 0;

    let totalOut = 0;
    if (winningNumber) {
      const winningBets = await prisma.bet.aggregate({
        where: {
          phaseId: req.params.id,
          number: winningNumber,
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      });
      totalOut = (winningBets._sum.amount?.toNumber() || 0) * 80;
    }

    const profit = totalIn - totalOut;

    // Create settlement and close phase in transaction
    const [settlement, updatedPhase] = await prisma.$transaction([
      prisma.settlementLedger.create({
        data: {
          phaseId: req.params.id,
          totalIn: new Prisma.Decimal(totalIn),
          totalOut: new Prisma.Decimal(totalOut),
          netProfit: new Prisma.Decimal(profit),
        },
      }),
      prisma.gamePhase.update({
        where: { id: req.params.id },
        data: {
          active: false,
          endDate: new Date(),
        },
      }),
    ]);

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
    await prisma.gamePhase.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set phase as active (admin only)
router.post('/:id/activate', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    // Deactivate all phases and activate the selected one
    const phase = await prisma.$transaction(async (tx) => {
      await tx.gamePhase.updateMany({
        where: { active: true },
        data: { active: false },
      });

      return tx.gamePhase.update({
        where: { id: req.params.id },
        data: { active: true },
      });
    });

    res.json({ phase });
  } catch (error) {
    console.error('Activate phase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update global limit for a phase (admin only)
router.patch('/:id/limit', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { globalLimit } = req.body;

    if (typeof globalLimit !== 'number' || globalLimit < 0) {
      return res.status(400).json({ error: 'Invalid global limit value' });
    }

    const phase = await prisma.gamePhase.update({
      where: { id: req.params.id },
      data: { globalLimit: new Prisma.Decimal(globalLimit) },
    });

    res.json({ phase });
  } catch (error) {
    console.error('Update global limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
