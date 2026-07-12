#!/usr/bin/env bash
# Pokreće kompletno radno okruženje:
#   - PostgreSQL + Redis + backend (FastAPI) u Dockeru
#   - frontend (Next.js) nativno, u foreground-u (Ctrl+C ga gasi)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Podižem PostgreSQL, Redis i backend (Docker)..."
docker compose --profile backend up -d --build

echo "==> Čekam backend health na http://localhost:8001/health ..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    echo "==> Backend OK: $(curl -s http://localhost:8001/health)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "!! Backend nije odgovorio za 30s. Logovi:" >&2
    docker compose logs --tail 30 backend >&2
    exit 1
  fi
  sleep 1
done

echo "==> Pokrećem frontend na http://localhost:3007 (Ctrl+C za izlaz)..."
cd frontend
npm run dev
