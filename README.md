# Psihointegritet — Digitalni centar

Platforma za pronalaženje stručne psihološke podrške i zakazivanje razgovora sa terapeutima.

## Struktura repozitorijuma

```text
frontend/          Next.js 16 (App Router, React 19, Tailwind 4) — Vercel
backend/           FastAPI modularni monolit (Python 3.14, uv)   — Railway
documentations/    Arhitektura, ADR-ovi, produkt i handoff dokumenti
compose.yaml       Lokalna infrastruktura (PostgreSQL 18.4, Redis 8.8)
```

Binding pravila: [documentations/ARCHITECTURAL_RULES_REVISED.md](documentations/ARCHITECTURAL_RULES_REVISED.md)

## Pinovane verzije

| Alat       | Verzija |
| ---------- | ------- |
| Node.js    | 24.13.1 |
| npm        | 11.14.1 |
| Python     | 3.14.6  |
| PostgreSQL | 18.4    |
| Redis      | 8.8     |

## Lokalni razvoj

```bash
# 1. Infrastruktura
docker compose up -d postgres redis

# 2. Backend (http://localhost:8001)
cd backend
cp .env.example .env
uv sync --locked
uv run alembic upgrade head
uv run uvicorn psihointegritet.main:app --reload --app-dir src --port 8001

# 3. Frontend (http://localhost:3007)
cd frontend
cp .env.example .env.local   # popuni vrednosti
npm ci
npm run dev
```

## API kontrakt (OpenAPI → TypeScript)

```bash
cd backend && uv run python scripts/export_openapi.py   # piše backend/openapi.json
cd frontend && npm run api:generate                      # piše src/types/api.generated.ts
```

`src/types/api.generated.ts` se ne menja ručno.

## Quality gates

Frontend: `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && npm run test:e2e`

Backend: `uv sync --locked && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest && uv run alembic upgrade head && uv run alembic check`

## Okruženja

- `main` → production, `staging` → staging, `feature/*` → preview deploy.
- Staging i production imaju odvojene baze, secrets i Clerk aplikacije — vidi [documentations/deployment-and-environments.md](documentations/deployment-and-environments.md).

### Poktretanje dev servera

./scripts/start-dev.sh

adding roles: set -a; . ./.env.local; set +a; npm run roles:assign
