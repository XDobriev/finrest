#!/usr/bin/env bash
# ==============================================================================
# FinRest - Production VPS Deployment Script
# Targets: Selectel, Timeweb Cloud, Yandex Cloud, Reg.ru
# ==============================================================================

set -euo pipefail

echo "🚀 Starting FinRest deployment..."

# 1. Check Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# 2. Ensure environment file exists
if [ ! -f .env.production ]; then
    echo "⚠️ .env.production not found, creating from default template..."
    cat <<EOF > .env.production
NODE_ENV=production
POSTGRES_USER=finrest_admin
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=finrest_prod
JWT_SECRET=$(openssl rand -hex 32)
EOF
    echo "✅ Generated secure credentials in .env.production"
fi

# 3. Pull / Build images
echo "🔨 Building Docker containers..."
docker compose --env-file .env.production build

# 4. Start database first
echo "🐘 Starting PostgreSQL container..."
docker compose --env-file .env.production up -d postgres

# 5. Wait for database healthcheck
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker compose --env-file .env.production exec -T postgres pg_isready -U finrest_admin -d finrest_prod; do
    sleep 2
done

# 6. Run database migrations inside container
echo "🔄 Running Prisma migrations..."
docker compose --env-file .env.production run --rm app npx prisma migrate deploy

# 7. Start full application stack
echo "🌐 Starting Next.js app and Nginx..."
docker compose --env-file .env.production up -d

echo "🎉 Deployment successfully completed!"
echo "👉 FinRest is running on port 80/443."
