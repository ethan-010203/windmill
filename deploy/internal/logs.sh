#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

echo "正在跟随输出日志，按 Ctrl+C 停止。"
docker compose logs -f --tail=200 "$@"
