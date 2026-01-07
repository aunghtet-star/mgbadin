import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, adminOnly, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

const router = Router();

// Get all users (admin only)
router.get('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      balance: u.balance.toNumber(),
      created_at: u.createdAt,
    }));

    res.json({ users: formatted });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role } = req.body;

    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      user: {
        ...user,
        balance: user.balance.toNumber(),
        created_at: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role, balance } = req.body;

    const updateData: any = {
      username,
      role,
      balance: new Prisma.Decimal(balance),
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
      },
    });

    res.json({
      user: {
        ...user,
        balance: user.balance.toNumber(),
        created_at: user.createdAt,
      },
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
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

    const bets = await prisma.bet.findMany({
      where: { userId: req.params.id },
      include: {
        phase: {
          select: { name: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    const formatted = bets.map(b => ({
      ...b,
      phase_name: b.phase.name,
      amount: b.amount.toNumber(),
      phase: undefined,
    }));

    res.json({ bets: formatted });
  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
