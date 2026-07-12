# Claude Code Task — Foundation Only

Read these files before changing code:

1. `documentations/ARCHITECTURAL_RULES.md`
2. `documentations/technical-documentation-architecture.md`
3. `documentations/FOUNDATION_SETUP.md`

## Objective

Create the project foundation only. Do not import the Claude Design JSX/Tailwind handoff yet and do not implement booking, guided selection, profiles, payments or production content.

## Required repository structure

```text
frontend/
backend/
documentations/
compose.yaml
README.md
.editorconfig
.gitignore
```

## Frontend foundation

- Next.js 16+ App Router.
- React 19.2+.
- Node 24.13.1 and npm 11.14.1 pinned.
- TypeScript strict flags from `ARCHITECTURAL_RULES.md`.
- Tailwind CSS 4.
- React Compiler enabled.
- ESLint flat config with zero warnings.
- Prettier + Tailwind plugin.
- Empty architectural folders from the documentation.
- Root providers separated into small Client Components.
- Minimal public page proving SSR/RSC works.
- Minimal error, global-error and not-found boundaries.
- Environment validation.
- Vitest and Playwright smoke tests.
- No business CRUD in Next.js.

## Backend foundation

- Python 3.14.6 managed through uv.
- FastAPI modular monolith structure.
- Pydantic Settings environment validation.
- SQLAlchemy 2 async session factory.
- Alembic initialized.
- `/health` and `/api/v1/health` endpoints.
- Structured logging with correlation ID.
- Global problem-details error envelope.
- Exact CORS allowlist.
- Placeholder provider-neutral auth interface; do not implement domain authorization yet.
- Ruff, Pyright strict and Pytest configured.
- One unit test and one API smoke test.
- Production backend Dockerfile.

## Infrastructure

- Root `compose.yaml` for PostgreSQL 18.4 and Redis 8.8.
- `.env.example` files only; no secrets.
- Separate staging/production configuration structure.

## Contract generation

- Add a deterministic command to export FastAPI OpenAPI.
- Add frontend command to generate TypeScript API types.
- Generated types must be excluded from manual editing.

## Prohibitions

- Do not implement the design handoff.
- Do not add Clerk Organizations.
- Do not create database tables for future features beyond the minimum foundation/migration smoke test.
- Do not add generic repository abstractions without a real use case.
- Do not put fetch calls in UI primitives.
- Do not add global state management.
- Do not add `any` or type assertions to silence errors.
- Do not mark the entire app or page as `"use client"`.
- Do not duplicate backend CRUD in Next Route Handlers.
- Do not claim tests passed unless executed.

## Completion report

Return:

1. final tree;
2. dependencies installed with versions;
3. files created;
4. architecture choices made;
5. commands run;
6. exact gate results;
7. unresolved issues;
8. the next safe step for importing Claude Design.
