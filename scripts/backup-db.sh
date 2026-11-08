#!/usr/bin/env bash
# ==============================================================================
# FinRest - Automated PostgreSQL Database Backup Script
# Compliant with Russian Data Protection Law (152-FZ)
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${HOME}/finrest_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/finrest_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="finrest-postgres"
DB_NAME="${POSTGRES_DB:-finrest_prod}"
DB_USER="${POSTGRES_USER:-finrest_admin}"

mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date)] Starting backup of database '${DB_NAME}'..."

docker exec -i "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_FILE}"

echo "✅ Backup successfully created at: ${BACKUP_FILE}"
echo "📊 Backup size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Keep only the last 7 days of backups
echo "🧹 Removing backups older than 7 days..."
find "${BACKUP_DIR}" -type f -name "finrest_backup_*.sql.gz" -mtime +7 -delete

echo "🎉 Backup rotation complete."
