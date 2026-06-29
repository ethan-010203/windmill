#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

BACKUP_FILE="${1:-}"
FORCE="${2:-}"

if [[ -z "$BACKUP_FILE" ]]; then
  echo "用法：./restore.sh ./backups/internal-platform-YYYYMMDD-HHMMSS.dump [--force]"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "备份文件不存在：$BACKUP_FILE"
  exit 1
fi

echo "准备从备份恢复数据库：$BACKUP_FILE"
echo "恢复操作会覆盖当前数据库。请确认当前数据已经备份。"
if [[ "$FORCE" != "--force" ]]; then
  read -r -p "输入 RESTORE 继续：" CONFIRM
  if [[ "$CONFIRM" != "RESTORE" ]]; then
    echo "已取消恢复。"
    exit 0
  fi
fi

docker compose up -d postgres
docker compose stop windmill_worker_native windmill_worker windmill_server

docker compose exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS windmill WITH (FORCE);"
docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE windmill;"
docker compose cp "$BACKUP_FILE" postgres:/tmp/internal-restore.dump
docker compose exec -T postgres pg_restore -U postgres -d windmill --clean --if-exists /tmp/internal-restore.dump
docker compose exec -T postgres rm -f /tmp/internal-restore.dump

docker compose up -d
echo "恢复完成，服务已重新启动。"
