#!/bin/bash
# ============================================
# Run Prisma Migrations for All 3 Databases
# ============================================

set -e

echo "🗄️ Running migrations for all databases..."

# Wait for postgres to be ready
sleep 5

# Migrate User 1 Database
echo "Migrating user1_db..."
DATABASE_URL="postgresql://mgbadin:mgbadin_secret@postgres:5432/user1_db?schema=public" npx prisma migrate deploy

# Migrate User 2 Database
echo "Migrating user2_db..."
DATABASE_URL="postgresql://mgbadin:mgbadin_secret@postgres:5432/user2_db?schema=public" npx prisma migrate deploy

# Migrate User 3 Database
echo "Migrating user3_db..."
DATABASE_URL="postgresql://mgbadin:mgbadin_secret@postgres:5432/user3_db?schema=public" npx prisma migrate deploy

echo "✅ All migrations complete!"
