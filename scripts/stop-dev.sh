#!/usr/bin/env bash
# Gasi Docker deo radnog okruženja (frontend se gasi sa Ctrl+C u svom terminalu).
# Podaci u PostgreSQL/Redis volumenima ostaju sačuvani.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

docker compose --profile backend down
echo "==> Docker servisi zaustavljeni."
