# Project Context: MGBadin (App 1)

## 🏗 Tech Stack
- **Frontend:** React + Vite (Typescript)
- **Backend:** Node.js + Express (Typescript)
- **Database:** PostgreSQL with Prisma ORM
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx

## 🌐 Environment & Networking
- **Main Domain:** mgbadin.top
- **Backend API Port:** 3001
- **Frontend Dev Port:** 5173
- **Database Port:** 5432
- **Internal API Prefix:** `/api` (e.g., https://mgbadin.top/api/auth/login)

## 📁 Folder Structure
- `/`: React application using Vite.
- `/var/www/mgbadin` : is copy of frontend code that is used for nginx
- `/backend`: Express server with Prisma.
- `/backend/src/routes`: Contains auth, bets, ledger, and scan routes.
- `/backend/src/models`: Prisma schema and TypeScript types.

## 🚀 Deployment Rules
- **PM2 Process Name:** `mgbadin-backend`
- **Nginx Config Path:** `/etc/nginx/sites-available/mgbadin`
- **Build Command:** `npm run build` in both folders.

## 📝 Business Logic Rules
1. **Auth:** All protected routes require a Bearer Token in the header.
2. **Scanning:** The scan route handles high-limit ledger entries.
3. **Naming Convention:** Use camelCase for variables and PascalCase for Components.