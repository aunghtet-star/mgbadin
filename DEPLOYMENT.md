# MG Badin - Betting Management System

## Overview

MG Badin is a betting management system with a React frontend and Node.js/Express backend using PostgreSQL for data storage.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Digital Ocean                         │
├─────────────┬─────────────┬─────────────────────────────┤
│  Instance 1 │  Instance 2 │  Instance 3                 │
├─────────────┼─────────────┼─────────────────────────────┤
│  Frontend   │  Frontend   │  Frontend                   │
│  (nginx)    │  (nginx)    │  (nginx)                    │
│  :8081      │  :8082      │  :8083                      │
├─────────────┼─────────────┼─────────────────────────────┤
│  Backend    │  Backend    │  Backend                    │
│  (Node.js)  │  (Node.js)  │  (Node.js)                  │
│  :3001      │  :3001      │  :3001                      │
├─────────────┼─────────────┼─────────────────────────────┤
│  PostgreSQL │  PostgreSQL │  PostgreSQL                 │
│  Database   │  Database   │  Database                   │
└─────────────┴─────────────┴─────────────────────────────┘
```

Each instance is completely isolated with its own:
- Frontend container (nginx serving React app)
- Backend container (Node.js/Express API)
- PostgreSQL database (persistent volume)

## Prerequisites

- Docker & Docker Compose installed
- Git
- At least 4GB RAM (for running 3 instances)

## Quick Start

### 1. Clone and Configure

```bash
git clone <your-repo>
cd mgbadin

# Copy environment template
cp .env.example .env

# Edit .env with your production values
nano .env
```

### 2. Configure Environment Variables

Edit `.env` file:

```env
# Database passwords for each instance (use strong passwords!)
DB_PASSWORD_1=your-secure-password-1
DB_PASSWORD_2=your-secure-password-2
DB_PASSWORD_3=your-secure-password-3

# JWT secrets for each instance (use different random strings!)
JWT_SECRET_1=your-jwt-secret-instance-1
JWT_SECRET_2=your-jwt-secret-instance-2
JWT_SECRET_3=your-jwt-secret-instance-3

# Gemini API key for AI features (optional)
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Deploy

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy all instances
./scripts/deploy.sh
```

### 4. Access Your Instances

| Instance | URL | Purpose |
|----------|-----|---------|
| 1 | http://localhost:8081 | First app |
| 2 | http://localhost:8082 | Second app |
| 3 | http://localhost:8083 | Third app |

### Default Credentials

Each instance has its own users. Default:
- **Admin:** admin / admin123
- **User:** user / user123

⚠️ **Change these in production!**

## Digital Ocean Deployment

### Option 1: Docker Droplet (Recommended)

1. Create a Droplet with Docker pre-installed (4GB+ RAM recommended)
2. SSH into the Droplet
3. Clone your repo and follow Quick Start steps
4. Configure firewall to allow ports 8081-8083

```bash
# Allow ports on Digital Ocean firewall
ufw allow 8081
ufw allow 8082
ufw allow 8083
```

### Option 2: App Platform

For managed deployment, you can deploy each instance separately:

1. Connect your GitHub repo to App Platform
2. Create 3 separate apps
3. Configure each with its own managed PostgreSQL database

## Management Commands

```bash
# View all running containers
docker-compose ps

# View logs for a specific instance
docker-compose logs -f backend-1
docker-compose logs -f frontend-1

# Stop all instances
docker-compose down

# Stop and remove all data (⚠️ destroys databases)
docker-compose down -v

# Restart a specific instance
docker-compose restart backend-1 frontend-1 db-1

# Run database migration for instance
docker exec mgbadin-backend-1 npm run db:migrate

# Access database directly
docker exec -it mgbadin-db-1 psql -U postgres -d mgbadin
```

## Backup & Restore

### Backup Database

```bash
# Backup instance 1 database
docker exec mgbadin-db-1 pg_dump -U postgres mgbadin > backup-instance-1.sql
```

### Restore Database

```bash
# Restore to instance 1
cat backup-instance-1.sql | docker exec -i mgbadin-db-1 psql -U postgres -d mgbadin
```

## Project Structure

```
mgbadin/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── db/             # Database connection & migrations
│   │   ├── middleware/     # Auth middleware
│   │   ├── routes/         # API routes
│   │   └── index.ts        # Server entry point
│   ├── Dockerfile
│   └── package.json
├── components/              # React components
├── services/
│   ├── api.ts              # Frontend API service
│   └── geminiService.ts    # AI OCR service
├── docker-compose.yml       # Multi-instance configuration
├── Dockerfile              # Frontend Dockerfile
├── nginx.conf              # Nginx configuration
└── scripts/
    ├── deploy.sh           # Deployment script
    └── init-db.sh          # Database initialization
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | Create user |
| `/api/auth/me` | GET | Get current user |
| `/api/phases` | GET/POST | Manage game phases |
| `/api/phases/:id/close` | POST | Close a phase |
| `/api/bets` | GET/POST | Manage bets |
| `/api/bets/bulk` | POST | Bulk create bets |
| `/api/risk/phase/:id` | GET | Risk analysis |
| `/api/ledger` | GET | Settlement history |
| `/api/users` | GET/POST/PUT/DELETE | User management |

## Troubleshooting

### Database connection failed

```bash
# Check if database is running
docker-compose ps db-1

# Check database logs
docker-compose logs db-1
```

### Backend not starting

```bash
# Check backend logs
docker-compose logs backend-1

# Verify environment variables
docker exec mgbadin-backend-1 env | grep DATABASE
```

### Frontend shows "Connection error"

1. Check if backend is running: `docker-compose ps`
2. Verify nginx configuration proxies to correct backend
3. Check browser console for CORS errors

## Security Recommendations

1. **Change default passwords** - Update all passwords in `.env`
2. **Use HTTPS** - Set up SSL certificates with nginx
3. **Firewall** - Only expose necessary ports
4. **Regular backups** - Schedule automated database backups
5. **Updates** - Keep Docker images updated

## License

Private - All rights reserved
