#!/bin/bash
set -euo pipefail

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
APP_SERVICE="app"
APP_CONTAINER="agent-platform-web"

echo "🚀 Starting VPS Deployment Update..."

# 1. Pull latest images
echo "📥 Pulling latest images..."
docker compose -f $COMPOSE_FILE pull

# 2. Update containers
echo "🔄 Updating containers..."
docker compose -f $COMPOSE_FILE up -d

# 3. Database Migrations
echo "🐘 Running database migrations..."
if docker compose -f $COMPOSE_FILE ps | grep -q "$APP_CONTAINER"; then
    docker compose -f $COMPOSE_FILE exec -T $APP_SERVICE npx prisma migrate deploy
else
    echo "⚠️ Warning: App container not found, skipping migrations."
fi

# 4. Prune old images
echo "🧹 Pruning old Docker images..."
docker image prune -af

echo "✅ Deployment updated successfully!"
echo "-------------------------------------"
docker compose -f $COMPOSE_FILE ps
echo "-------------------------------------"
echo "Check logs with: docker logs $APP_CONTAINER --tail 50"
