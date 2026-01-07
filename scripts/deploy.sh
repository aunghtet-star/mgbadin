#!/bin/bash

# Deploy all 3 instances
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 Deploying MG Badin - 3 Instances"
echo "===================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your production values before deploying!"
    exit 1
fi

# Build and start all containers
echo "🔨 Building Docker images..."
docker-compose build

echo "🚀 Starting all containers..."
docker-compose up -d

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Initialize databases for all instances
for i in 1 2 3; do
    echo ""
    echo "📦 Initializing database for instance $i..."
    docker exec mgbadin-backend-$i npm run db:migrate || true
    docker exec mgbadin-backend-$i npm run db:seed || true
done

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your instances at:"
echo "   Instance 1: http://localhost:8081"
echo "   Instance 2: http://localhost:8082"
echo "   Instance 3: http://localhost:8083"
echo ""
echo "📊 Default credentials for all instances:"
echo "   Admin: admin / admin123"
echo "   User:  user / user123"
