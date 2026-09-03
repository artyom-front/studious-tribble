#!/usr/bin/env bash
# ============================================================
# SCORES21 · deploy.sh — поставка новой версии на сервере
# Вызывается из GitHub Actions (cd.yml) или вручную:
#   ./scripts/deploy.sh 1.2.3
# Шаги: pull образ → бэкап БД → схема (prisma db push) → up →
# health-check → фиксация тега. Авто-откат при провале health.
# ============================================================
set -euo pipefail

TAG="${1:?Использование: ./scripts/deploy.sh <тег образа, например 1.2.3>}"
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

STATE_DIR=".deploy"
COMPOSE_FILE="deploy/docker-compose.prod.yml"
BACKUP_DIR="backups"
mkdir -p "$STATE_DIR" "$BACKUP_DIR"

# GHCR-образ (переопределяется .deploy-env из CI)
DEPLOY_IMAGE="${DEPLOY_IMAGE:-ghcr.io/ffchuvashia/scores21}"
[ -f "$STATE_DIR/env" ] && . "$STATE_DIR/env"

echo "==> Деплой SCORES21 $DEPLOY_IMAGE:$TAG"

# ---------- 1. Бэкап SQLite (online-копия перед изменениями) ----------
TS=$(date +%Y%m%d-%H%M%S)
docker run --rm -v scores21-data:/data:ro -v "$BACKUP_DIR":/backup alpine \
  sh -c "cp /data/custom.db /backup/db-$TS.db && gzip -f /backup/db-$TS.db" || true
echo "    бэкап: $BACKUP_DIR/db-$TS.db.gz"

# ---------- 2. Схема БД одним прогоном нового контейнера ----------
echo "==> Обновление схемы (prisma db push)"
TAG="$TAG" DEPLOY_IMAGE="$DEPLOY_IMAGE" docker compose -f "$COMPOSE_FILE" run --rm --no-deps app \
  bun node_modules/prisma/build/index.js db push --skip-generate

# ---------- 3. Запуск новой версии ----------
echo "==> docker compose up -d"
TAG="$TAG" DEPLOY_IMAGE="$DEPLOY_IMAGE" docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
docker image prune -f --filter "label=com.docker.compose.project" >/dev/null 2>&1 || true

# ---------- 4. Health-check (до 90 секунд) ----------
echo "==> health-check"
ok=0
for i in $(seq 1 30); do
  if curl -sf http://localhost/api/health | grep -q '"ok":true'; then ok=1; break; fi
  sleep 3
done
if [ "$ok" != "1" ]; then
  echo "!! health-check не прошёл — откат на предыдущую версию"
  ./scripts/rollback.sh
  exit 1
fi
echo "    прод здоров ✓"

# ---------- 5. Фиксация истории ----------
echo "$TAG" > "$STATE_DIR/current"
echo "$TS $TAG" >> "$STATE_DIR/history"
# держим последние 20 записей истории
tail -20 "$STATE_DIR/history" > "$STATE_DIR/history.tmp" && mv "$STATE_DIR/history.tmp" "$STATE_DIR/history"

echo "==> Деплой $TAG завершён успешно"
