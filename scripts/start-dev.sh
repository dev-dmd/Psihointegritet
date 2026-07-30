#!/usr/bin/env bash
# Pokreće kompletno radno okruženje:
#   - PostgreSQL + Redis + backend (FastAPI) u Dockeru
#   - frontend (Next.js) nativno, u foreground-u (Ctrl+C ga gasi)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

prepare_backend_clerk_verifier() {
  local compose_env="$ROOT_DIR/backend/.env.compose.local"
  local source_env="$compose_env"
  if [ ! -f "$source_env" ] && [ -f "$ROOT_DIR/backend/.env.local" ]; then
    source_env="$ROOT_DIR/backend/.env.local"
    local temp_env
    temp_env="$(mktemp "$ROOT_DIR/backend/.env.compose.local.tmp.XXXXXX")"
    chmod 600 "$temp_env"
    # Persist only public verifier configuration. Compose can now safely
    # recreate the backend later without depending on this shell's exports.
    awk -F= '
      $1 == "CLERK_ISSUER" ||
      $1 == "CLERK_JWKS_URL" ||
      $1 == "CLERK_AUDIENCE" { print }
    ' "$source_env" > "$temp_env"
    mv "$temp_env" "$compose_env"
    source_env="$compose_env"
    echo "==> Napravljen backend/.env.compose.local samo sa javnim Clerk verifier vrednostima."
  fi

  if [ ! -f "$source_env" ]; then
    echo "!! Nedostaje backend/.env.compose.local (vidi .env.compose.local.example)." >&2
    exit 1
  fi

  if ! grep -Eq '^CLERK_ISSUER=.+$' "$source_env" ||
    ! grep -Eq '^CLERK_JWKS_URL=.+$' "$source_env"; then
    echo "!! CLERK_ISSUER i CLERK_JWKS_URL moraju biti popunjeni u $source_env." >&2
    exit 1
  fi
}

prepare_backend_clerk_verifier

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
