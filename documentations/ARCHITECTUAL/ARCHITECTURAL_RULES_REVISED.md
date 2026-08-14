# Psihointegritet — Architectural Rules & Coding Standards

**Version:** 1.0  
**Status:** binding implementation contract  
**Applies to:** `frontend/`, `backend/`, tests, migrations, scripts, CI and all AI coding agents  
**Primary architecture:** Next.js frontend + FastAPI backend + PostgreSQL

---

## 0. Rule hierarchy and change control

These rules are mandatory unless a documented Architecture Decision Record (ADR) explicitly changes them.

Priority order:

1. Privacy, security and legal constraints.
2. Data integrity and authorization.
3. Domain boundaries and API contracts.
4. Correctness and testability.
5. Accessibility and user experience.
6. Performance.
7. Style and convenience.

The coding agent must not silently replace a selected library, introduce a new state manager, change authentication, move business logic between frontend and backend, or alter the database model. Any such change requires an ADR in `documentations/adr/`.

---

## 1. Repository boundaries

The repository is organized as:

```text
/
├── frontend/          # Next.js 16+ application
├── backend/           # FastAPI application
├── documentations/    # architecture, ADRs, product scope and handoff docs
├── compose.yaml       # local infrastructure only
├── .editorconfig
├── .gitignore
└── README.md
```

No application source code is allowed at repository root. Root files are limited to repository-level orchestration and configuration.

### 1.1 Ownership of responsibilities

**Frontend owns:**

- HTML rendering, SEO and metadata;
- user interface and accessibility;
- client interaction and form presentation;
- Clerk session acquisition;
- typed communication with the backend;
- localized user-facing error messages;
- public assets and design system.

**Backend owns:**

- business rules and use cases;
- all business CRUD operations;
- authorization decisions;
- tenant scoping;
- PostgreSQL access and transactions;
- booking, availability and recommendation rules;
- audit logs and diagnostics;
- email, jobs, webhooks and future payments;
- OpenAPI contract.

**Critical rule:** when FastAPI is present, Next.js Route Handlers are not a second business backend. Do not duplicate CRUD logic in `frontend/src/app/api`. Route Handlers may only act as web-specific adapters, callbacks, upload signers or a deliberately approved BFF endpoint.

---

# Part A — Frontend rules

## 2. Frontend technology baseline

- Node.js: pinned project version.
- npm: pinned project version.
- Next.js 16+ App Router.
- React 19.2+.
- TypeScript strict mode.
- Tailwind CSS 4+.
- React Compiler enabled after the initial compatibility gate.
- TanStack Query v5 only for client-side server state.
- Zod for runtime boundary validation.
- React Hook Form for complex client forms.
- Motion for React through `motion/react`.
- Sonner for user-facing toast notifications.

## 3. Frontend directory structure

```text
frontend/src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (client)/
│   ├── (staff)/
│   ├── api/                  # adapters only; no duplicated domain CRUD
│   ├── layout.tsx
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── not-found.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                   # generic design-system primitives
│   ├── shared/               # reusable domain presentation
│   ├── sections/             # page section composition
│   └── motion/               # reusable client animation boundaries
│
├── features/
│   ├── auth/
│   ├── therapists/
│   ├── services/
│   ├── booking/
│   ├── guidance/
│   ├── programs/
│   └── resources/
│
├── hooks/                    # truly cross-feature React hooks only
├── helpers/                  # pure deterministic functions
├── lib/                      # SDKs, API clients, config and infrastructure
│   ├── api/
│   ├── auth/
│   ├── errors/
│   ├── query/
│   └── validation/
├── providers/
├── schemas/                  # shared Zod boundary schemas
├── types/                    # shared/public TypeScript contracts only
├── content/                  # typed draft/static content
└── styles/
```

### 3.1 Colocation rule

Do not turn `types/`, `hooks/`, `helpers/` or `components/` into global dumping grounds.

- Feature-local UI, hooks, schemas and types belong under `features/<feature>/`.
- `src/types/` contains only contracts shared by multiple features or generated API contracts.
- A component-local props type may remain in the same file when it is not reused.
- API types generated from OpenAPI are the source of truth for backend payloads; do not manually duplicate them.

## 4. Component boundaries

### 4.1 Server Components first

React Server Components are the default.

Keep these server-rendered unless there is a concrete interactive requirement:

- pages and layouts;
- public landing sections;
- static cards;
- article, therapist and service presentation;
- SEO content;
- server-side data composition.

Add `"use client"` only when a component requires:

- browser APIs;
- event handlers;
- React state or client-only context;
- interactive forms;
- TanStack Query hooks;
- Clerk client hooks;
- Motion hooks;
- dialogs, drawers, accordions, menus or carousels.

A server parent may render a client child. Do not convert an entire page or section to a Client Component only to support one button or animation.

### 4.2 One component per file

- One meaningful exported component per file.
- Do not define React components inside another component function.
- Small file-private render helpers are allowed only when they are not components and do not use hooks.
- A component family may have its own folder with component, test and supporting files.
- Do not create a folder for every trivial primitive when one file is sufficient.

### 4.3 Size limits

These are review thresholds, not excuses to compress unreadable code:

- UI component target: <= 200 lines.
- UI component review threshold: 300 lines.
- Hook target: <= 120 lines.
- Function target: <= 50 logical lines.
- Files over 400 lines require decomposition or an explicit justification.
- A 1,000–2,000 line component is prohibited.

### 4.4 Presentation-only rule

A component under `components/ui` must not:

- call `fetch`;
- call a database;
- use TanStack Query;
- know API routes;
- contain authorization rules;
- contain booking calculations;
- transform raw backend responses.

It receives already prepared, typed props and emits typed events.

## 5. Props, composition and state ownership

### 5.1 Prop drilling

Do not enforce an arbitrary provider for every value. Explicit props are preferred for local composition.

When data crosses multiple unrelated branches:

1. first use composition (`children`, slots, render props);
2. use a narrowly scoped feature context when values are genuinely shared;
3. use URL state for shareable navigation/filter state;
4. use TanStack Query for remote server state;
5. introduce a global client store only through an ADR.

Prop drilling through more than two purely forwarding layers is a design smell and must be reviewed, but context/provider proliferation is also prohibited.

### 5.2 State ownership matrix

| State type | Required owner |
|---|---|
| Public/SSR data | Server Component fetch |
| Remote client data | TanStack Query |
| Filters, pagination, selected public tab | URL/search params where practical |
| Complex form state | React Hook Form + Zod |
| Server form action state | `useActionState` / `useFormStatus` when appropriate |
| Temporary local UI state | local `useState` |
| Optimistic UI | `useOptimistic` or TanStack mutation strategy |
| Cross-feature global state | prohibited without ADR |

Do not copy TanStack Query data into local state unless the user is explicitly editing a draft detached from the server snapshot.

## 6. Data fetching and mutations

### 6.1 No fetching from leaf UI

Data fetching is allowed only in:

- async Server Components through a server-only API client;
- feature query hooks;
- server-only loaders/services;
- approved Route Handlers;
- centralized transport modules.

Do not call `fetch()` directly inside visual cards, buttons, accordions or modal content.

### 6.2 Typed backend client

- FastAPI OpenAPI is the canonical network contract.
- Generate TypeScript types/client from OpenAPI.
- All transport code lives under `frontend/src/lib/api/`.
- Validate untrusted runtime data at external boundaries when generated typing alone is insufficient.
- Never spread raw backend errors into UI.

### 6.3 TanStack Query

Use TanStack Query only in interactive client areas that need caching, invalidation, polling, optimistic updates or cross-component synchronization.

Every mutation hook must define:

- a typed mutation function;
- typed variables and result;
- `onSuccess` cache update/invalidation;
- `onError` mapped user feedback;
- `onSettled` only when cleanup is required;
- rollback through `onMutate` for optimistic updates.

Use `mutate` for event-driven operations. Use `mutateAsync` only when the caller must sequence/await the result in a `try/catch` flow.

Query success/error side effects do not belong in deprecated query callbacks. Derive query state during render or use a narrow effect only when synchronizing an external system.

## 7. Hooks, effects and React 19 rules

### 7.1 Custom hooks

Custom hooks are for reusable React behavior. They must not be used as generic service classes.

- Hooks use other hooks and manage React lifecycle/state.
- Pure calculations belong in `helpers/`.
- SDK initialization belongs in `lib/`.
- Domain use cases belong in backend services.
- Feature hooks belong beside their feature; root `hooks/` is cross-feature only.

### 7.2 Effects

Effects are an escape hatch for synchronizing with an external system.

Prohibited:

- derived state in `useEffect`;
- immediate state synchronization from props when it can be calculated during render;
- an `async` effect callback;
- disabling `exhaustive-deps` without a documented reason;
- effects used as event handlers;
- state updates that create dependency loops.

When asynchronous work is genuinely required in an effect:

- define and invoke an inner async function;
- use `AbortController` or an equivalent cancellation strategy;
- ignore/abort stale results on cleanup;
- handle rejection explicitly;
- keep every reactive dependency correct.

Wrapping code in an async function does not itself prevent infinite rendering. The dependency model and state ownership must be correct.

Use `useEffectEvent` when current React semantics require non-reactive event logic inside an effect.

### 7.3 Memoization

React Compiler is the default optimization mechanism.

`useMemo`, `useCallback` and `React.memo` are not mandatory and must not be added mechanically. Use them only when:

- profiling identifies a meaningful cost;
- a stable reference is required by a memoized child or third-party API;
- a value is an effect dependency and cannot be structurally simplified;
- an expensive deterministic computation is repeated.

Every manual memoization should have a clear reason. Premature memoization that makes dependencies harder to reason about is prohibited.

### 7.4 `<Activity>`

Use React `<Activity>` only when hidden content must preserve state or be pre-rendered. Standard conditional rendering remains correct when state reset is desired. Do not wrap every conditional UI in `<Activity>`.

## 8. TypeScript rules

`tsconfig.json` must enable at least:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true
  }
}
```

Rules:

- Explicit `any` is prohibited.
- Use `unknown` plus a type guard for untrusted data.
- `as unknown as X` is prohibited except in isolated tested adapter code with a comment.
- Non-null assertions (`!`) require proof or must be replaced by validation.
- Exhaustive discriminated unions must use a `never` assertion.
- Use `interface` for extendable object contracts.
- Use `type` for unions, intersections, mapped types and schema inference.
- Avoid declaration merging unless intentional and documented.
- Do not maintain duplicate handwritten types for Zod schemas or generated OpenAPI contracts.

## 9. Errors, loading and user feedback

### 9.1 Standard error contract

All network errors are normalized into a stable envelope:

```ts
interface ApiProblem {
  type: string;
  title: string;
  status: number;
  code: string;
  detail?: string;
  correlationId: string;
  fieldErrors?: Record<string, string[]>;
}
```

The UI must never rely on arbitrary backend exception strings.

### 9.2 Frontend handling

- Route-level failures use `error.tsx` or `global-error.tsx`.
- Expected form/API failures are rendered inline and/or through Sonner.
- A toast complements the UI; it must not be the only place where a form validation error exists.
- Messages must be polite, localized and actionable.
- Never expose stack traces, SQL errors, provider responses or security details.
- Loading states must prevent duplicate submission.
- Mutating buttons must expose pending state and remain keyboard accessible.

### 9.3 Logging

Client logs must not contain:

- guided-selection answers;
- health-related free text;
- appointment details;
- access tokens;
- session identifiers;
- private messages.

---

# Part B — Authentication and authorization

## 10. Authentication decision

For the separated Next.js + FastAPI architecture, use **Clerk as the MVP identity provider**.

Clerk responsibilities:

- email/password and optional OAuth;
- email verification and password recovery;
- session lifecycle;
- short-lived session token;
- staff MFA when enabled.

Clerk must contain identity data only. Do not store booking reasons, therapy topics, appointment metadata, notes, organization-sensitive domain data or authorization policy in Clerk metadata.

The backend maps Clerk `sub` to the internal `users.external_auth_id`.

### 10.1 Provider isolation

All Clerk-specific frontend code belongs in `frontend/src/lib/auth/clerk/`.
All Clerk-specific backend verification belongs in `backend/src/psihointegritet/infrastructure/auth/clerk/`.

Domain and application modules depend on a provider-neutral identity contract, not on Clerk SDK types.

### 10.2 Backend token verification

FastAPI must verify on every authenticated request:

- JWT signature using cached JWKS/public key;
- issuer;
- audience/authorized party;
- expiration and not-before;
- session/user subject;
- expected token type.

Tokens are never stored in `localStorage` by application code.

### 10.3 Authorization is internal

Authentication is not authorization.

Roles, organization membership, resource ownership and service permissions are stored in PostgreSQL and loaded by the backend. Do not trust a client-provided role and do not make long-lived domain authorization depend on editable Clerk metadata.

## 11. RBAC, ABAC and tenant isolation

Every protected use case verifies:

1. authenticated subject;
2. internal user status;
3. organization membership;
4. role/capability;
5. resource ownership or assignment;
6. current resource state;
7. temporal/policy constraints where relevant.

- RBAC capabilities are centralized.
- ABAC policies handle ownership, therapist assignment, time windows and appointment status.
- Every organization-owned row has `organization_id`.
- Tenant scope is mandatory in repository queries.
- Cross-tenant access tests are required.
- PostgreSQL RLS may be added as defense in depth; it does not replace application authorization.

---

# Part C — Backend rules

## 12. Backend technology baseline

- Python 3.14.x, pinned.
- `uv` for Python/version/dependency management.
- FastAPI.
- Pydantic v2 + `pydantic-settings`.
- SQLAlchemy 2.x typed ORM.
- PostgreSQL through async driver.
- Alembic migrations.
- PyJWT + cryptography for token verification.
- Structlog for structured logging.
- Ruff for linting and formatting.
- Pyright strict for static typing.
- Pytest for tests.

## 13. Backend directory structure

```text
backend/
├── pyproject.toml
├── uv.lock
├── alembic.ini
├── Dockerfile
├── src/
│   └── psihointegritet/
│       ├── main.py
│       ├── api/
│       │   ├── dependencies.py
│       │   ├── errors.py
│       │   └── v1/
│       │       ├── router.py
│       │       └── health.py
│       ├── core/
│       │   ├── config.py
│       │   ├── logging.py
│       │   ├── security.py
│       │   └── observability.py
│       ├── db/
│       │   ├── base.py
│       │   ├── session.py
│       │   └── migrations/
│       ├── modules/
│       │   ├── organizations/
│       │   ├── identity/
│       │   ├── therapists/
│       │   ├── services/
│       │   ├── booking/
│       │   ├── guidance/
│       │   ├── programs/
│       │   ├── content/
│       │   ├── notifications/
│       │   ├── privacy/
│       │   └── diagnostics/
│       ├── infrastructure/
│       │   ├── auth/
│       │   ├── email/
│       │   ├── queue/
│       │   ├── storage/
│       │   └── payments/
│       └── shared/
│           ├── domain/
│           ├── application/
│           └── types/
└── tests/
    ├── unit/
    ├── integration/
    ├── contract/
    └── security/
```

Each feature module uses:

```text
module/
├── domain/          # entities, value objects, domain errors, policies
├── application/     # commands, queries, use cases, ports
├── infrastructure/  # SQLAlchemy repositories and provider adapters
├── api/             # FastAPI router and request/response DTOs
└── tests/
```

Small modules may omit unnecessary folders, but boundaries must remain clear.

## 14. Backend layering rules

### 14.1 Routers are adapters

FastAPI routers must only:

- parse/validate input;
- resolve dependencies;
- call one application use case;
- map output to a response DTO;
- map known application errors to API problems.

Routers must not contain SQL, booking calculations, tenant policy or multi-step business workflows.

### 14.2 Application layer

Application use cases:

- define transaction boundaries;
- orchestrate repositories and domain services;
- enforce authorization policies;
- emit domain/outbox events;
- return application DTOs.

A use case must not import FastAPI request/response types.

### 14.3 Domain layer

Domain code:

- contains no FastAPI, SQLAlchemy, Pydantic settings or provider SDK imports;
- expresses invariants through entities, value objects and policies;
- raises typed domain errors;
- remains independently unit-testable.

### 14.4 Infrastructure layer

Infrastructure implements ports for:

- PostgreSQL;
- Clerk verification;
- Resend;
- Redis/QStash;
- object storage;
- future payment providers.

Provider responses are translated into internal types at the boundary.

## 15. Python typing and style

- Pyright strict must pass with zero errors.
- Public functions and methods require complete annotations.
- Avoid `Any`; use `Unknown`-equivalent patterns, protocols, generics or validated Pydantic models.
- Do not use untyped dictionaries as business DTOs.
- Use `Protocol` for ports/interfaces.
- Use immutable/frozen value objects where practical.
- Use enums or literal unions for stable state machines.
- Use timezone-aware `datetime`; store UTC.
- Avoid implicit optional values.
- Do not use mutable default arguments.
- No wildcard imports.
- No circular imports solved through runtime hacks.

## 16. Pydantic and API contracts

- Pydantic models are boundary DTOs, not domain entities.
- Request and response models are separate when write/read shapes differ.
- Use strict validation for identifiers, enums, dates and money.
- Never return SQLAlchemy ORM objects directly.
- Do not expose internal columns, audit metadata or provider identifiers unless required.
- Every public endpoint has a stable `operation_id`.
- Version API routes under `/api/v1`.
- Errors use `application/problem+json` style fields.
- Pagination, sorting and filtering have explicit schemas and limits.

## 17. SQLAlchemy, repositories and transactions

- SQLAlchemy 2.x typed mappings only.
- One `AsyncSession` per request/use-case scope.
- No global session.
- Use `async with` and explicit transaction boundaries.
- Repositories never commit independently; the Unit of Work/use case owns commit/rollback.
- No implicit lazy loading in response serialization.
- Prevent N+1 queries through explicit loading strategies.
- All tenant-owned queries include organization scope.
- Use database constraints for invariants that must survive concurrency.
- Booking overlap protection must exist at database level, not only in Python.
- Production schema changes occur only through Alembic migrations.
- `create_all()` is prohibited outside isolated tests.

## 18. Async and external I/O

- Use async routes for async I/O.
- Never call blocking SDK/database/file operations directly from the event loop.
- Use an async client or explicitly move blocking work to a thread pool.
- Reuse configured HTTP clients; do not instantiate one per request.
- Every external call has timeout, bounded retry and typed failure mapping.
- Retries are allowed only for safe/idempotent operations.
- Do not use FastAPI `BackgroundTasks` for critical durable jobs.
- Critical delayed work is persisted and sent through QStash/queue infrastructure.

## 19. Backend errors and logging

- Domain errors are not HTTP errors.
- `HTTPException` is limited to the API adapter layer.
- Do not catch broad `Exception` inside domain/use-case code unless adding context and re-raising.
- A global exception handler maps unexpected errors to a generic 500 problem with correlation ID.
- Structured logs include correlation ID, route, organization ID where allowed, event name and duration.
- Logs must never contain tokens, guided answers, therapy-related free text or private files.
- Sentry/observability must scrub PII.

## 20. Security baseline

Required from foundation:

- exact CORS allowlist; never `*` with credentials;
- trusted host configuration;
- request size limits;
- rate limiting for auth-adjacent and public mutation endpoints;
- security headers at frontend/edge;
- token verification on every protected endpoint;
- idempotency keys for booking creation, payment and webhook processing;
- webhook signature verification;
- least-privilege database credentials;
- separate staging and production secrets;
- no secrets in source, logs or client bundles;
- dependency scanning;
- audit log for privileged mutations.

Health-related text must never appear in URL paths or query strings. Use request bodies for sensitive inputs.

## 21. Diagnostics rule

Every risky workflow that touches several models or reassigns ownership must ship with a read-only integrity diagnostic in the same PR.

A diagnostic:

- reads only;
- returns `ok`, `warning`, `error` or `failed`;
- distinguishes “collector failed” from “zero findings”;
- includes evidence identifiers safe for administrators;
- recommends repair as text;
- never mutates production data.

Diagnostic model/reference coverage must remain synchronized with the workflow it protects.

---

# Part D — Testing and delivery

## 22. Testing strategy

### Frontend

- Unit tests for helpers and business-free UI logic.
- Component tests for interactive components.
- Contract tests for generated API client assumptions.
- Playwright for critical journeys.
- axe accessibility checks.

### Backend

- Domain/use-case unit tests without database.
- Repository integration tests against real PostgreSQL.
- API contract tests.
- Authorization and cross-tenant isolation tests.
- Migration upgrade tests.
- Concurrency test for double booking.

Mock provider boundaries, not internal business logic.

## 23. Required verification gates

### Frontend gate

Run in this order:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:e2e
```

### Backend gate

```bash
uv sync --locked
uv run ruff format --check .
uv run ruff check .
uv run pyright
uv run pytest
uv run alembic upgrade head
uv run alembic check
```

No task is complete with failing tests, type errors, migration drift or build warnings that indicate correctness/security issues.

Remove the previous non-standard `fallow`/skills installation commands from the mandatory gate. A tool may be added later only after it is intentionally adopted and pinned.

## 24. Agent completion contract

Before reporting completion, the coding agent must provide:

1. files created/modified;
2. architecture decisions made;
3. migrations added;
4. tests added/updated;
5. exact verification commands and results;
6. known limitations;
7. follow-up work explicitly out of scope.

The agent must not claim a gate is green unless it was actually executed.

---

## 25. Explicit anti-patterns

The following are prohibited:

- giant page/component files;
- nested component definitions inside parent components;
- fetching inside presentational UI;
- duplicated CRUD in Next.js and FastAPI;
- business rules in Route Handlers or FastAPI routers;
- `any`, unvalidated casts and duplicated DTO types;
- provider-specific types leaking into domain code;
- localStorage auth tokens;
- storing authorization truth in client state;
- mechanical `useMemo`/`useCallback` everywhere;
- derived state and event handling through effects;
- swallowing errors and returning empty arrays;
- toast-only field validation;
- catch-all repository methods with unbounded queries;
- database commits inside repositories;
- auto-generating production schemas;
- sensitive data in logs, analytics, URLs or error messages;
- empty placeholder abstractions added “for future use” without a current contract.
