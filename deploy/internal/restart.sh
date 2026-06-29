#!/usr/bin/env bash
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$DEPLOY_DIR/stop.sh"
"$DEPLOY_DIR/start.sh" "$@"
