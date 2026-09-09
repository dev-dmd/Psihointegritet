#!/usr/bin/env bash
# Pokreće kompletno radno okruženje:
#   - PostgreSQL + Redis + backend (FastAPI) u Dockeru
#   - frontend (Next.js) nativno, u foreground-u (Ctrl+C ga gasi)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Nothing to prepare before compose any more.
#
# This used to build `backend/.env.compose.local` and refuse to start unless
# CLERK_ISSUER and CLERK_JWKS_URL were filled in. Clerk was removed in AUTH-6
# (D-083) and the backend no longer reads either variable, so the check only
# stopped a fresh clone from starting for a verifier that does not exist.
# Sign-in is now the PDC auth engine: sessions live in `auth_sessions` in the
# same database compose brings up, so local dev needs no auth configuration at
# all — run `scripts/platform_accounts.py --activate` against it to get in.

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
