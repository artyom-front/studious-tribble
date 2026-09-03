#!/usr/bin/env bash
# SCORES21 — бэкап SQLite-базы (безопасный online-backup).
# Ставится в cron:  15 3 * * *  /home/scores21/scripts/backup-db.sh >> /var/log/scores21-backup.log 2>&1
set -euo pipefail

DB_PATH="${DB_PATH:-/home/z/my-project/db/custom.db}"
BACKUP_DIR="${BACKUP_DIR:-/home/z/my-project/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/scores21-$STAMP.db"

# sqlite3 online backup корректен даже при открытых соединениях;
# при отсутствии sqlite3 в системе — cp c предварительной проверкой целостности
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$OUT'"
else
  bun -e "const{PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.\\\$queryRaw\`PRAGMA integrity_check\`.then(async r=>{if(!String(r[0]).includes('ok'))throw new Error('integrity');await db.\\\$disconnect();process.exit(0)}).catch(()=>process.exit(1))" \
    && cp "$DB_PATH" "$OUT"
fi

gzip -f "$OUT"
echo "[$(date --iso-8601=seconds)] backup: $OUT.gz"

# ротация
find "$BACKUP_DIR" -name "scores21-*.db.gz" -mtime "+$KEEP_DAYS" -delete
echo "[$(date --iso-8601=seconds)] ротация: удалены старше $KEEP_DAYS дней"
