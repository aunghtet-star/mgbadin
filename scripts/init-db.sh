#!/bin/bash

# Initialize database for a specific instance
# Usage: ./scripts/init-db.sh <instance-number>

INSTANCE=${1:-1}
CONTAINER_NAME="mgbadin-backend-$INSTANCE"

echo "🔄 Running database migrations for instance $INSTANCE..."

docker exec $CONTAINER_NAME npm run db:migrate

echo "🌱 Seeding database with default users..."

docker exec $CONTAINER_NAME npm run db:seed

echo "✅ Database initialization complete for instance $INSTANCE!"
echo ""
echo "Default credentials:"
echo "  Admin: admin / admin123"
echo "  User:  user / user123"
