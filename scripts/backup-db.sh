#!/usr/bin/env bash
# ============================================================
# SCORES21 · backup-db.sh — ежедневный бэкап PostgreSQL (pg_dump).
# Ставится в cron:
#   15 3 * * *  /opt/scores21/scripts/backup-db.sh >> /var/log/scores21-backup.log 2>&1
# Восстановление:
#   docker compose -f deploy/docker-compose.prod.yml exec -T db \
#     pg_restore -U scores21 -d scores21 --clean --if-exists < backups/pg-XXX.dump
# ============================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

COMPOSE_FILE="deploy/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/pg-$STAMP.dump"

# pg_dump --format=custom: сжатие + проверка целостности + выборочный restore
docker compose -f "$COMPOSE_FILE" exec -T db \
  pg_dump -U scores21 -d scores21 --no-owner --format=custom \
  > "$OUT"

echo "[$(date --iso-8601=seconds)] backup: $OUT ($(du -h "$OUT" | cut -f1))"

# ротация
find "$BACKUP_DIR" -name "pg-*.dump" -mtime "+$KEEP_DAYS" -delete
echo "[$(date --iso-8601=seconds)] ротация: удалены старше $KEEP_DAYS дней"
