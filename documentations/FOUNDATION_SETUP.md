# Psihointegritet — Foundation Setup

**Version:** 1.0  
**Goal:** create a reproducible frontend/backend foundation before importing the Claude Design JSX/Tailwind handoff.

---

## 1. Final foundation decisions

| Area             | Decision                                                                  |
| ---------------- | ------------------------------------------------------------------------- |
| Repository       | one Git repository with `frontend/`, `backend/`, `documentations/`        |
| Frontend         | Next.js 16+ App Router, React 19.2+, TypeScript, Tailwind 4               |
| Backend          | FastAPI modular monolith on Railway                                       |
| Database         | PostgreSQL 18.x                                                           |
| Cache/queue      | Redis locally; Upstash Redis + QStash in hosted environments              |
| Auth             | Clerk for MVP identity; internal roles/tenant authorization in PostgreSQL |
| API contract     | FastAPI OpenAPI → generated TypeScript client                             |
| Frontend hosting | Vercel                                                                    |
| Backend hosting  | Railway using Dockerfile                                                  |
| Local Docker     | PostgreSQL + Redis + backend; Next.js runs natively                       |
| Package managers | npm for frontend, uv for backend                                          |

### Why Clerk now

The earlier Next-only architecture favored a self-hosted auth library. The project now intentionally has a separate FastAPI backend. Clerk is selected for the MVP because it supplies a mature Next.js session flow and short-lived signed tokens that the Python backend can verify. This avoids building password storage, verification, recovery and session rotation from scratch.

Constraints:

- Clerk stores identity only.
- Domain roles and organization membership stay in PostgreSQL.
- No therapy, booking or guided-selection data in Clerk metadata.
- Clerk-specific code stays behind provider adapters.
- A future migration remains possible because domain tables reference an external subject ID rather than Clerk SDK objects.

### Docker recommendation

Use partial Dockerization:

- **Yes:** PostgreSQL, Redis and FastAPI backend.
- **No for normal local development:** Next.js, because native Turbopack development and file watching are faster and match Vercel deployment.
- A frontend Dockerfile may be added later only if a non-Vercel deployment is required.

---

## 2. Required tool versions

Pin these versions for reproducibility:

```text
Node.js 24.13.1
npm 11.14.1
Python 3.14.6
PostgreSQL 18.4
Redis 8.8
```

Node 24.13.1 is an LTS release, although newer Node 24 LTS patches exist. Keep the requested version until the team intentionally upgrades it through an ADR/dependency PR.

Create at repository root:

### `.nvmrc`

```text
24.13.1
```

### `.node-version`

```text
24.13.1
```

Frontend `package.json` must contain:

```json
{
  "packageManager": "npm@11.14.1",
  "engines": {
    "node": "24.13.1",
    "npm": "11.14.1"
  }
}
```

Backend `.python-version`:

```text
3.14.6
```

---

## 3. Repository initialization

```bash
mkdir psihointegritet
cd psihointegritet

git init
mkdir -p documentations/adr
```

Copy into `documentations/`:

```text
ARCHITECTURAL_RULES.md
technical-documentation-architecture.md
FOUNDATION_SETUP.md
product-scope.md
content-and-user-flow.md
```

Root should contain no application source.

---

## 4. Install the pinned Node and npm versions

Using nvm:

```bash
nvm install 24.13.1
nvm use 24.13.1
npm install --global npm@11.14.1

node --version
npm --version
```

Expected:

```text
v24.13.1
11.14.1
```

---

## 5. Create the Next.js frontend

From repository root:

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm
```

Then:

```bash
cd frontend
npm install --global npm@11.14.1
npm install
```

Verify the installed Next.js version is 16 or newer and React is 19.2 or newer before continuing.

### 5.1 Install foundation runtime dependencies

```bash
npm install \
  @clerk/nextjs \
  @tanstack/react-query \
  @tanstack/react-query-devtools \
  zod \
  react-hook-form \
  @hookform/resolvers \
  sonner \
  motion \
  next-intl \
  @headlessui/react \
  @heroicons/react \
  class-variance-authority \
  clsx \
  tailwind-merge \
  date-fns \
  rrule \
  openapi-fetch \
  server-only
```

### 5.2 Install server/integration dependencies

```bash
npm install \
  resend \
  @react-email/components \
  @upstash/redis \
  @upstash/qstash \
  jose \
  cloudinary
```

Install `web-push` only when push notifications enter the milestone:

```bash
npm install web-push
npm install --save-dev @types/web-push
```

### 5.3 Install development and test dependencies

```bash
npm install --save-dev \
  babel-plugin-react-compiler \
  eslint-plugin-react-hooks \
  prettier \
  prettier-plugin-tailwindcss \
  vitest \
  @vitejs/plugin-react \
  jsdom \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @playwright/test \
  @axe-core/playwright \
  openapi-typescript
```

Initialize Playwright:

```bash
npx playwright install --with-deps chromium
```

### 5.4 Recommended scripts

Add to `frontend/package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "api:generate": "openapi-typescript ../backend/openapi.json -o src/types/api.generated.ts"
  }
}
```

### 5.5 Next.js configuration

Use `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
```

Do not add remote image hosts until the actual Unsplash/Cloudinary strategy is confirmed.

### 5.6 Frontend foundation folders

```bash
mkdir -p \
  src/components/{ui,shared,sections,motion} \
  src/features/{auth,therapists,services,booking,guidance,programs,resources} \
  src/hooks \
  src/helpers \
  src/lib/{api,auth,errors,query,validation} \
  src/providers \
  src/schemas \
  src/types \
  src/content \
  src/styles
```

Create `src/proxy.ts` only when route-level interception is needed. It is not the final authorization layer.

---

## 6. Create the FastAPI backend

Install uv, then from repository root:

```bash
uv python install 3.14.6
uv init --package --python 3.14.6 backend
cd backend
```

### 6.1 Runtime dependencies

```bash
uv add \
  fastapi \
  "uvicorn[standard]" \
  pydantic-settings \
  sqlalchemy \
  asyncpg \
  alembic \
  "psycopg[binary]" \
  "PyJWT[crypto]" \
  httpx \
  structlog \
  orjson \
  email-validator \
  python-multipart \
  redis \
  tenacity
```

Add provider libraries when their milestones begin:

```bash
uv add resend
uv add "sentry-sdk[fastapi]"
```

### 6.2 Development dependencies

```bash
uv add --dev \
  ruff \
  pyright \
  pytest \
  pytest-asyncio \
  pytest-cov \
  testcontainers \
  pip-audit
```

### 6.3 Backend source structure

```bash
mkdir -p \
  src/psihointegritet/api/v1 \
  src/psihointegritet/core \
  src/psihointegritet/db \
  src/psihointegritet/infrastructure/{auth,email,queue,storage,payments} \
  src/psihointegritet/shared/{domain,application,types} \
  src/psihointegritet/modules/{organizations,identity,therapists,services,booking,guidance,programs,content,notifications,privacy,diagnostics} \
  tests/{unit,integration,contract,security}
```

Every Python package folder needs `__init__.py` where required.

### 6.4 Minimal FastAPI application

`src/psihointegritet/main.py`:

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Initialize shared clients/resources here.
    yield
    # Close shared clients/resources here.


app = FastAPI(
    title="Psihointegritet API",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", tags=["health"], operation_id="get_health")
async def get_health() -> dict[str, str]:
    return {"status": "ok"}
```

### 6.5 Backend commands

```bash
uv run uvicorn psihointegritet.main:app --reload --app-dir src
uv run ruff format .
uv run ruff check .
uv run pyright
uv run pytest
```

### 6.6 Alembic

```bash
uv run alembic init alembic
```

Required rules:

- business schema is managed only by Alembic;
- no `create_all()` in application startup;
- app uses async SQLAlchemy;
- migrations may use the synchronous `psycopg` connection;
- staging and production run `alembic upgrade head` as a release step.

---

## 7. Local Docker infrastructure

Use Docker Compose for reproducible PostgreSQL and Redis. The frontend remains native.

Create root `compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:18.4-alpine
    environment:
      POSTGRES_DB: psihointegritet
      POSTGRES_USER: psihointegritet
      POSTGRES_PASSWORD: local_only_change_me
    ports:
      - "5434:5432"
    volumes:
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U psihointegritet -d psihointegritet"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:8.8-alpine
    ports:
      - "6381:6379"
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres_data:
  redis_data:
```

Start:

```bash
docker compose up -d postgres redis
docker compose ps
```

### 7.1 Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.14.6-slim AS builder

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY src ./src
RUN uv sync --locked --no-dev

FROM python:3.14.6-slim AS runtime

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN useradd --create-home --uid 10001 appuser
COPY --from=builder --chown=appuser:appuser /app /app

USER appuser
EXPOSE 8000

CMD ["uvicorn", "psihointegritet.main:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
```

Pin the uv image digest/version before production; do not leave `latest` in the final production Dockerfile.

---

## 8. Environment files

Never commit real secrets.

### `frontend/.env.example`

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3007
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_KEY=
```

### `backend/.env.example`

```dotenv
ENVIRONMENT=development
API_HOST=0.0.0.0
API_PORT=8001
DATABASE_URL=postgresql+asyncpg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet
MIGRATION_DATABASE_URL=postgresql+psycopg://psihointegritet:local_only_change_me@localhost:5434/psihointegritet
REDIS_URL=redis://localhost:6381/0
CORS_ORIGINS=["http://localhost:3007"]
CLERK_ISSUER=
CLERK_JWKS_URL=
CLERK_AUDIENCE=
```

Pydantic Settings validates backend environment at startup. Zod validates frontend environment in server-only code.

---

## 9. Auth foundation sequence

1. Create separate Clerk development and production applications.
2. Configure email/password first; OAuth remains optional.
3. Add Clerk provider to Next.js root layout.
4. Use `proxy.ts` only for early route redirect/protection.
5. Create a provider-neutral backend `IdentityClaims` model.
6. Implement JWKS caching and JWT verification in FastAPI.
7. Map Clerk subject to an internal user row.
8. Store roles and organization memberships in PostgreSQL.
9. Add cross-tenant authorization tests.
10. Enable/enforce MFA for staff before production access.

Do not enable Clerk Organizations for MVP. Psihointegritet organization, staff memberships and future tenant model remain in the application database.

---

## 10. OpenAPI → TypeScript contract

FastAPI owns the API schema.

Export OpenAPI during development/CI:

```bash
cd backend
uv run python -c 'import json; from psihointegritet.main import app; print(json.dumps(app.openapi()))' > openapi.json
```

Generate frontend types:

```bash
cd frontend
npm run api:generate
```

The coding agent must not manually recreate request/response interfaces already present in `api.generated.ts`.

---

## 11. Foundation quality gates

### Frontend

```bash
cd frontend
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

### Backend

```bash
cd backend
uv sync --locked
uv run ruff format --check .
uv run ruff check .
uv run pyright
uv run pytest
```

### Infrastructure

```bash
docker compose config
docker compose up -d postgres redis
docker compose ps
```

Foundation is complete only when:

- both apps start;
- frontend renders a minimal page;
- backend `/health` returns 200;
- database migration runs;
- OpenAPI generation works;
- TypeScript client generation works;
- all gates are green.

---

## 12. Importing the Claude Design handoff

Only after the foundation gate is green:

1. Copy the generated JSX/Tailwind source into a temporary `frontend/design-handoff/` folder.
2. Do not use that folder directly as production architecture.
3. Extract design tokens and fonts.
4. Move primitives to `components/ui`.
5. Move reusable business cards to `components/shared`.
6. Move homepage compositions to `components/sections`.
7. Move animations to `components/motion`.
8. Keep page/layout as Server Components.
9. Add Client boundaries only at interactive leaves.
10. Replace mock arrays with typed content/data files.
11. Preserve the approved visual design while removing duplicated markup.
12. Run the complete frontend gate after every extraction milestone.
