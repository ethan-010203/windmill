#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEPLOY_DIR"

NO_BUILD=0
if [[ "${1:-}" == "--no-build" ]]; then
  NO_BUILD=1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "未找到 docker 命令。请先安装 Docker 和 Docker Compose。"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "未找到 .env。请先复制 .env.example 为 .env，并修改密码和密钥。"
  exit 1
fi

docker compose version >/dev/null

get_env_value() {
  local name="$1"
  grep -E "^[[:space:]]*$name[[:space:]]*=" .env | head -n 1 | sed -E 's/^[^=]+=//' | tr -d '"'"'"'[:space:]'
}

is_local_image_reference() {
  local image="$1"
  local first_part="${image%%/*}"
  [[ "$image" != */* || ( "$first_part" != *.* && "$first_part" != *:* && "$first_part" != "localhost" ) ]]
}

if [[ "$NO_BUILD" -eq 0 ]]; then
  WINDMILL_IMAGE_VALUE="$(get_env_value WINDMILL_IMAGE || true)"
  if [[ -n "$WINDMILL_IMAGE_VALUE" ]] && is_local_image_reference "$WINDMILL_IMAGE_VALUE"; then
    if ! docker image inspect "$WINDMILL_IMAGE_VALUE" >/dev/null 2>&1; then
      echo "未找到本地镜像 '$WINDMILL_IMAGE_VALUE'。请先运行 ./build-image.sh，或把 WINDMILL_IMAGE 改成可拉取的远程镜像。"
      exit 1
    fi
    echo "使用本地运行镜像：$WINDMILL_IMAGE_VALUE"
  else
    docker compose pull
  fi
fi

docker compose up -d

echo
echo "系统已启动。"
echo "请打开 .env 中的 BASE_URL，默认地址：http://127.0.0.1:8000"
echo "首次访问时，按页面提示创建管理员账号。"
