#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

OUTPUT_DIR="${1:-./backups}"
MOUNTED_BACKUP_DIR="./backups"

if [[ ! -f .env ]]; then
  echo "未找到 .env，无法读取部署配置。"
  exit 1
fi

mkdir -p "$MOUNTED_BACKUP_DIR"
mkdir -p "$OUTPUT_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_NAME="internal-platform-$TIMESTAMP.dump"
BACKUP_FILE="$OUTPUT_DIR/$BACKUP_NAME"
MOUNTED_BACKUP_FILE="$MOUNTED_BACKUP_DIR/$BACKUP_NAME"

echo "正在备份数据库到：$BACKUP_FILE"
docker compose exec -T postgres pg_dump -U postgres -d windmill -Fc -f "/backups/$BACKUP_NAME"
if [[ "$(cd "$OUTPUT_DIR" && pwd)" != "$(cd "$MOUNTED_BACKUP_DIR" && pwd)" ]]; then
  cp -f "$MOUNTED_BACKUP_FILE" "$BACKUP_FILE"
fi
echo "备份完成：$BACKUP_FILE"
