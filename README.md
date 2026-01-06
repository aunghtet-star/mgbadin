<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MG Badin - 3D Lottery Banker Management System

A comprehensive FinTech platform for managing 3D lottery operations with real-time risk analysis, user management, and AI-powered assistance.

## 🚀 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT with bcrypt
- **AI:** Google Gemini API
- **Deployment:** Docker, Vercel

---

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- npm or yarn

---

## 🏃 Quick Start (Local Development)

### Option 1: With Docker (Recommended)

```bash
# 1. Clone and navigate to project
cd mgbadin

# 2. Create environment file
cp .env.example .env

# 3. Start all services
docker-compose up -d

# 4. Run database migrations
docker-compose --profile migrate up migrate

# 5. App is running at http://localhost:3000
```

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your DATABASE_URL and API keys

# 3. Setup database
npx prisma generate
npx prisma migrate dev

# 4. Start development server (frontend)
npm run dev

# 5. Start backend server (separate terminal)
npm run server
```

---

## 🐳 Docker Commands

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

### Production Build

```bash
# Build production image
docker build -t mgbadin:latest .

# Run standalone container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="your-secret-key" \
  mgbadin:latest
```

### Database Management

```bash
# Run migrations
docker-compose --profile migrate up migrate

# Access PostgreSQL shell
docker exec -it mgbadin-db psql -U mgbadin -d mgbadin_db

# Backup database
docker exec mgbadin-db pg_dump -U mgbadin mgbadin_db > backup.sql

# Restore database
docker exec -i mgbadin-db psql -U mgbadin mgbadin_db < backup.sql
```

---

## 🗄️ Prisma Database Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate
# or
npx prisma generate

# Create and run migrations
npm run db:migrate
# or
npx prisma migrate dev --name your_migration_name

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio

# Seed database
npx prisma db seed
```

### Database Schema Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │────<│     Bet     │>────│  GamePhase  │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │     │ id          │     │ id          │
│ username    │     │ number      │     │ name        │
│ role        │     │ amount      │     │ active      │
│ balance     │     │ timestamp   │     │ globalLimit │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       │
       ▼                                       ▼
┌─────────────┐                         ┌─────────────┐
│ Adjustment  │                         │ NumberLimit │
├─────────────┤                         ├─────────────┤
│ amount      │                         │ number      │
│ reason      │                         │ maxAmount   │
└─────────────┘                         └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ LedgerEntry │
                                        ├─────────────┤
                                        │ totalIn     │
                                        │ totalOut    │
                                        │ netProfit   │
                                        └─────────────┘
```

---

## 🔐 Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | ADMIN |
| user | user123 | COLLECTOR |

> ⚠️ **Change these immediately in production!**

---

## 📁 Project Structure

```
mgbadin/
├── components/          # React components
│   ├── Login.tsx
│   ├── BulkEntry.tsx
│   ├── RiskDashboard.tsx
│   ├── ExcessDashboard.tsx
│   ├── PhaseManager.tsx
│   ├── AdjustmentsManager.tsx
│   ├── AIAssistant.tsx
│   └── UserHistory.tsx
├── prisma/
│   └── schema.prisma    # Database schema
├── services/
│   ├── apiService.ts    # API client
│   └── geminiService.ts # AI service
├── utils/
│   └── parser.ts        # Bet parsing utilities
├── server.js            # Express backend
├── App.tsx              # Main React app
├── Dockerfile           # Production Docker image
├── docker-compose.yml   # Full stack setup
└── package.json
```

---

## 🌐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT tokens | ✅ |
| `GEMINI_API_KEY` | Google AI API key | ⚠️ For AI features |
| `PORT` | Server port (default: 3000) | ❌ |
| `NODE_ENV` | Environment (development/production) | ❌ |

---

## 🚀 Deployment

### Vercel (Frontend + Serverless)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Docker (Self-hosted)

```bash
# Pull and run
docker-compose -f docker-compose.yml up -d
```

### Railway / Render

1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

---

## 📝 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | User login | ❌ |
| GET | `/api/phases` | List game phases | ✅ |
| POST | `/api/phases` | Create phase | ✅ Admin |
| POST | `/api/bets` | Place bets | ✅ |
| GET | `/api/bets/:phaseId` | Get bets by phase | ✅ |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details
