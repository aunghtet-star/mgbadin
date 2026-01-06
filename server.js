
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mgbadin-super-secret-key';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  
  // For demo deployment, if user doesn't exist, create default ones
  if (!user) {
    if (username === 'admin' && password === 'admin123') {
       const hashed = await bcrypt.hash('admin123', 10);
       const newUser = await prisma.user.create({ data: { username, passwordHash: hashed, role: 'ADMIN' } });
       const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET);
       return res.json({ user: { id: newUser.id, username: newUser.username, role: newUser.role, balance: newUser.balance }, token });
    }
    if (username === 'user' && password === 'user123') {
       const hashed = await bcrypt.hash('user123', 10);
       const newUser = await prisma.user.create({ data: { username, passwordHash: hashed, role: 'COLLECTOR' } });
       const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET);
       return res.json({ user: { id: newUser.id, username: newUser.username, role: newUser.role, balance: newUser.balance }, token });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
  res.json({ user: { id: user.id, username: user.username, role: user.role, balance: user.balance }, token });
});

// Phase Routes
app.get('/api/phases', authenticateToken, async (req, res) => {
  const phases = await prisma.gamePhase.findMany({ 
    include: { ledgerEntry: true },
    orderBy: { startDate: 'desc' } 
  });
  res.json(phases);
});

app.post('/api/phases', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  const { name } = req.body;
  const phase = await prisma.gamePhase.create({ data: { name } });
  res.json(phase);
});

// Betting Routes
app.post('/api/bets', authenticateToken, async (req, res) => {
  const { phaseId, bets } = req.body;
  
  // Transaction to ensure data integrity
  try {
    const result = await prisma.$transaction(async (tx) => {
      const createdBets = await Promise.all(bets.map(bet => 
        tx.bet.create({
          data: {
            phaseId,
            userId: req.user.id,
            number: bet.number,
            amount: bet.amount
          }
        })
      ));

      const totalVolume = bets.reduce((acc, curr) => acc + curr.amount, 0);
      await tx.gamePhase.update({
        where: { id: phaseId },
        data: {
          totalBets: { increment: bets.length },
          totalVolume: { increment: totalVolume }
        }
      });
      
      return createdBets;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Transaction failed' });
  }
});

app.get('/api/bets/:phaseId', authenticateToken, async (req, res) => {
  const bets = await prisma.bet.findMany({ where: { phaseId: req.params.phaseId } });
  res.json(bets);
});

// Catch-all to serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
