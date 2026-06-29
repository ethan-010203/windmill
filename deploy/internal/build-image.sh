#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DEPLOY_DIR/../.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

IMAGE="${WINDMILL_IMAGE:-}"
NO_CACHE=""
BUILD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --image)
      IMAGE="${2:-}"
      shift 2
      ;;
    --no-cache)
      NO_CACHE="--no-cache"
      shift
      ;;
    --build-arg)
      BUILD_ARGS+=(--build-arg "${2:-}")
      shift 2
      ;;
    *)
      echo "未知参数：$1" >&2
      exit 1
      ;;
  esac
done

if ! command -v docker >/dev/null 2>&1; then
  echo "未找到 docker 命令。请先安装 Docker 和 Docker Compose。"
  exit 1
fi

if [[ -z "$IMAGE" && -f "$ENV_FILE" ]]; then
  IMAGE="$(grep -E '^[[:space:]]*WINDMILL_IMAGE[[:space:]]*=' "$ENV_FILE" | head -n 1 | sed -E 's/^[^=]+=//' | tr -d '"'"'"'[:space:]')"
fi

if [[ -z "$IMAGE" ]]; then
  IMAGE="internal-platform:ce-source"
fi

echo "开始构建内部运行镜像：$IMAGE"
echo "源码目录：$REPO_ROOT"
docker build -t "$IMAGE" -f "$REPO_ROOT/Dockerfile" ${NO_CACHE:+$NO_CACHE} "${BUILD_ARGS[@]}" "$REPO_ROOT"
echo "镜像构建完成：$IMAGE"
echo "下一步可以运行：cd deploy/internal && ./start.sh"
