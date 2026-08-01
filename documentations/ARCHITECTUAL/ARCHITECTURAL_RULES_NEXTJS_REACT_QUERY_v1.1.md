# Psihointegritet — Architectural Rules & Coding Standards

**Version:** 1.1  
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

# Part E — Next.js 16+, React 19 i frontend implementaciona pravila

Ovaj deo precizira organizaciju frontend logike, Server/Client granice, TanStack Query, React hook-ove, forme, slike i renderovanje. Dopunjuje Part A; kada postoji konflikt, strože pravilo ima prednost.

---

## 26. Obavezni smer zavisnosti

```text
Page ili Server Component
    ↓
Feature composition / Client boundary
    ↓
UI component
    ↓
component-local ili feature hook
    ↓
TanStack query/mutation hook
    ↓
feature service ili lib/api transport
    ↓
odobrena Next adapter ruta
    ↓
FastAPI
```

Zabranjeno:

```text
UI component → direktan fetch
UI component → Redis ili PostgreSQL
UI component → provider SDK
UI component → poslovna autorizacija
helper → React hook
lib/api → toast ili JSX
Client Component → server-only modul
```

Browser komunicira isključivo sa HTTP granicom aplikacije. Redis, PostgreSQL, QStash, Resend i ostali infrastrukturni sistemi dostupni su samo server-side kodu.

---

## 27. Colocation komponentne logike

Logika koja pripada jednoj složenijoj komponenti ostaje uz tu komponentu, ali se odvaja od render fajla.

```text
features/booking/components/booking-request-form/
├── booking-request-form.tsx
├── hooks/
│   ├── use-booking-request-form.ts
│   └── use-booking-request-mutation.ts
├── helpers/
│   ├── build-booking-payload.ts
│   └── booking-form-validation.ts
├── booking-request-form.types.ts
└── booking-request-form.test.tsx
```

Kada hook ili helper koristi više komponenti istog feature-a:

```text
features/booking/
├── components/
├── hooks/
├── helpers/
├── schemas/
└── api/
```

Pravila:

- Ne kreirati folder za trivijalnu komponentu.
- Lokalni UI state može ostati u komponenti.
- Mrežni poziv, asinhroni lifecycle i cache state pripadaju query/mutation hook-u.
- Čista transformacija pripada helper-u.
- Poslovno pravilo koje mora važiti nezavisno od UI-ja pripada backendu ili eksplicitnom domain modulu.
- Hook koji koristi samo jedna komponentna porodica ne ide u globalni `src/hooks/`.
- `src/hooks/` je samo za zaista cross-feature hook-ove.

---

## 28. UI komponenta nije application service

`.tsx` komponenta treba da:

- primi tipizovane props;
- čita hook rezultat;
- upravlja kratkotrajnim UI stanjem;
- renderuje pending, error, empty i success stanja;
- emituje korisničke događaje.

Ne treba da:

- zna URL više endpoint-a;
- koristi `fetch` u event handler-u;
- ručno vodi `loading/error/success` za server mutation;
- implementira cache ili retry;
- mapira sirov provider response;
- sadrži tenant, permission ili booking autoritet;
- objedinjuje više nepovezanih workflow-a.

Dozvoljen obrazac:

```tsx
"use client";

export function BookingRequestForm() {
  const mutation = useCreateBookingRequest();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate(/* typed payload */);
      }}
    >
      {/* UI */}
    </form>
  );
}
```

Transport ostaje van komponente:

```ts
export async function createBookingRequest(
  payload: BookingRequestPayload,
): Promise<BookingRequestResponse> {
  return postJson(
    "/api/booking-request",
    payload,
    bookingRequestResponseSchema,
  );
}
```

```ts
"use client";

export function useCreateBookingRequest() {
  return useMutation({
    mutationFn: createBookingRequest,
  });
}
```

---

## 29. TanStack Query standard

TanStack Query je standardni vlasnik asinhronog server state-a u Client Components.

Koristi se za:

- privatne dashboard podatke;
- client-side pretrage i filtere;
- podatke koji se menjaju nakon mount-a;
- mutation status;
- cache, retry i invalidaciju;
- optimistic update kada je opravdan;
- cancellation kroz `AbortSignal`.

```ts
export const therapistQueryKeys = {
  all: ["therapists"] as const,
  detail: (slug: string) => [...therapistQueryKeys.all, slug] as const,
};

export function useTherapist(slug: string) {
  return useQuery({
    queryKey: therapistQueryKeys.detail(slug),
    queryFn: ({ signal }) => getTherapist(slug, signal),
    enabled: slug.length > 0,
  });
}
```

Obavezno:

- Query key sadrži sve ulaze koji menjaju rezultat.
- Query function koristi `signal` kada transport podržava prekid.
- Ne kopirati `query.data` u `useState` samo radi renderovanja.
- Ne pozivati isti endpoint i kroz effect i kroz query hook.
- Mutation hook poseduje pending/error lifecycle.
- Globalni `QueryProvider` nije obavezan za ceo javni sajt; dozvoljen je scoped provider.
- Dashboard može imati provider u zaštićenom layout-u.
- React Query Devtools se prikazuje samo u development-u.
- Hydration se uvodi samo kada donosi merljivu korist.
- Query cache nikada nije authorization granica.

---

## 30. React built-in hooks

### 30.1 `useState`

Koristi se za prolazno UI stanje: otvoren drawer, aktivni korak, lokalni input draft ili izbor koji još nije server state.

Ne koristi se za:

- kopiju query rezultata;
- vrednost koja se može izračunati u renderu;
- mutation pending/error state;
- podatke koji se učitavaju pri mount-u;
- permission ili autentifikacionu istinu.

Pogrešno:

```tsx
const query = useQuery(...);
const [items, setItems] = useState<Item[]>([]);

useEffect(() => {
  setItems(query.data ?? []);
}, [query.data]);
```

Ispravno:

```tsx
const query = useQuery(...);
const items = query.data ?? [];
```

Lokalna kopija je dozvoljena samo za eksplicitni korisnički draft, sa jasnim pravilima inicijalizacije i resetovanja.

### 30.2 `useEffect`

`useEffect` sinhronizuje React sa spoljnim sistemom.

Opravdano:

- `window`/`document` listener;
- focus management;
- browser API;
- subscription;
- timer sa cleanup-om;
- ne-React biblioteka;
- odobrena analitika.

Nije opravdano:

- fetch pri mount-u kada postoji Server Component ili query hook;
- derived state;
- reakcija na klik koja pripada handler-u;
- props-to-state sinhronizacija bez draft modela;
- effect koji menja sopstvenu dependency vrednost i stvara loop.

Svaki effect mora imati kompletne dependencies, jasan razlog i cleanup. Za reset čitavog lokalnog workflow-a po identitetu resursa preferira se `key`:

```tsx
<ProfileEditor key={profileId} profileId={profileId} />
```

### 30.3 `useMemo`

Koristi se samo kada je izračunavanje dokazivo skupo, kada je stabilan identitet potreban drugoj optimizaciji ili kada profilisanje pokaže korist. Ne koristi se za trivijalne stringove, male boolean izraze ili jednostavan `map`.

### 30.4 `useCallback`

Koristi se kada stabilna callback referenca ima konkretan razlog: memoizovani child, listener lifecycle ili zahtev biblioteke. Ne dodaje se mehanički svakom handler-u.

### 30.5 `useRef`

Koristi se za DOM, timer ID, idempotency key i tehničku vrednost koja ne utiče na render. Ne koristi se za skrivanje server state-a ili zaobilaženje hook dependencies.

---

## 31. React 19 `useActionState`

`useActionState` je preporučen kada forma direktno koristi Server Function kroz `<form action={formAction}>` i progressive enhancement ima vrednost.

Nije obavezan za svaku formu.

TanStack mutation je prikladniji kada:

- UI je deo interaktivnog client workflow-a;
- forma poziva FastAPI/BFF endpoint;
- potreban je query invalidation ili optimistic update;
- mutation deli cache lifecycle sa drugim query-jima.

`useActionState` je prikladniji kada:

- submit prirodno pripada Server Action granici;
- treba da radi pre hidratacije;
- nema složen client cache workflow;
- Next sloj je namerno odobren adapter prema FastAPI-ju.

Obavezno:

- state je strogo tipizovan;
- Server Action ponovo validira `FormData`;
- FastAPI ostaje autoritet za poslovna pravila;
- ne koristi se `any`;
- toast ili drugi side-effect se ne pokreće tokom renderovanja.

```ts
interface NotifyActionState {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: {
    email?: string[];
  };
}
```

Success poruka može direktno da se renderuje. Toast se pokreće iz kontrolisanog effect-a nad stabilnim rezultatom ili iz mutation callback-a.

---

## 32. Server i Client Components

### 32.1 Server-first

Page, layout i javni sadržaj ostaju Server Components po default-u.

Server Component:

- učitava SEO-relevantne podatke;
- generiše metadata;
- sastavlja statičku strukturu;
- izvršava server-only auth kada je potreban;
- prosleđuje minimalne serializable props client leaf-u.

Client boundary se spušta što niže. Cela javna stranica se ne pretvara u Client Component zbog jednog dugmeta ili animacije.

### 32.2 Serializable granica

Iz Server u Client Component ne prosleđivati database client, provider SDK objekat, tajnu, raw auth token, ne-serializable class instance ili običnu funkciju koja nije Server Action.

### 32.3 `server-only`

Moduli sa internim API ključevima, server auth-om, Redis/QStash/Resend klijentom ili server-to-server FastAPI klijentom moraju biti iza `server-only` granice.

---

## 33. Strategija renderovanja

SSG, ISR, SSR i CSR opisuju ponašanje, ali implementacija prati stvarne Next.js 16 primitive i konfiguraciju projekta.

Trenutni `next.config.ts` nema `cacheComponents`, zato dokumentacija ne sme tvrditi da je ruta keširana samo zato što je Server Component.

Za svaku rutu mora biti poznato:

- da li koristi dinamičke request API-je;
- da li je rezultat user-specific;
- da li i kako se kešira;
- kako se invalidira;
- da li je indeksabilan;
- da li sadrži osetljive podatke.

| Površina | Strategija | Cache / invalidacija | Indeksiranje |
|---|---|---|---|
| Marketing početna | statički Server Components | build-time ili eksplicitni cache | da |
| Javni terapeut | statički ili keširani server render | publication/tag invalidacija | da |
| Objavljeni CMS tekst | keširani server render | on-demand posle publish-a | da |
| Kompas uvod i javne teme | javni Server Components | objavljeni sadržaj može biti keširan | da |
| Personalizovani Kompas rezultat | dinamički/private workflow | bez shared cache-a | ne |
| Request-first booking uvod | Server Component + client forma | javni sadržaj može biti keširan | da |
| Buduća live dostupnost | server shell + client query | kratki stale time | ne |
| Staff dashboard | zaštićeni server layout + client leaf | TanStack Query | ne |
| Client portal | zaštićeni server layout + client leaf | TanStack Query | ne |

### 33.1 Javni CMS

- Draft nije dostupan javnoj ruti.
- Metadata i body koriste istu objavljenu reviziju.
- Publish događaj invalidira odgovarajući cache tag ili verziju.
- Fiksni vremenski ISR interval nije zamena za publication-aware invalidaciju.
- Raw HTML se ne renderuje bez sanitizacije; typed CMS blokovi imaju prednost.

### 33.2 Personalizovani Kompas

- Nije SEO landing page i ne indeksira se.
- Osetljivi odgovori ne idu u URL query parametre.
- Rezultat se ne deli kroz public shared cache.
- Koristi anonimni session token ili autentifikovani kontekst.
- FastAPI je autoritet kada je production matching uključen.
- Suspense se koristi kada stvarno strimuje nezavisan server rad, ne dekorativno.
- Javne uredničke stranice tema mogu se indeksirati odvojeno.

### 33.3 Dashboard

Koristi server layout za auth gate i shell, a client leaf komponente za tabele, filtere, forme i real-time interakcije. Filteri koji treba da budu bookmark-able pripadaju URL state-u. Ne označavati celu dashboard granu sa `"use client"` ako su samo pojedini paneli interaktivni.

### 33.4 Booking

U request-first fazi nema real-time slot autoriteta: javni sadržaj je server-renderovan, a višekoračna forma je client workflow.

Kada se uvede live availability:

- client poziva FastAPI, nikada Redis direktno;
- FastAPI i PostgreSQL odlučuju da li je slot dostupan;
- Redis lock je samo backend optimizacija;
- optimistic UI nikada nije potvrda termina.

---

## 34. `next/image`

Sadržajne slike koriste `next/image`.

Obavezno:

- `width`/`height`, ili `fill` sa pozicioniranim roditeljem;
- ispravan `sizes` uz `fill` i responsive prikaz;
- smislen `alt`, odnosno `alt=""` za dekorativnu sliku;
- remote hostname kroz `remotePatterns`;
- stabilan aspect ratio;
- validiran remote URL.

U Next.js 16 koristi se `preload` samo za stvarnu LCP hero sliku. Ne označavati više slika kao preload bez merenja.

```tsx
<Image
  src={therapist.image}
  alt={therapist.name}
  fill
  sizes="(min-width: 1024px) 40vw, 100vw"
  className="object-cover"
/>
```

---

## 35. `next/link`

Interna navigacija koristi `next/link`.

Običan `<a>` je prikladan za spoljne URL-ove, `mailto:`, `tel:` i download resurse.

Zabranjeno:

- `window.location` za običnu internu navigaciju;
- button unutar link-a ili link unutar button-a;
- nevalidiran dinamički URL;
- automatsko isključivanje prefetch-a bez razloga.

Typed routes se koriste gde je moguće.

---

## 36. Forme

Jednostavna forma može koristiti kontrolisani `useState` kada ostaje mala i submit ide kroz mutation hook ili Server Action.

Složena forma koristi React Hook Form + Zod kada ima veliki broj polja, uslovna polja, ponovljive sekcije, kompleksne field errors ili draft/reset zahteve.

Submit pravila:

- Server ponovo validira sve podatke.
- UI ne prikazuje raw backend error.
- Kritične javne mutation operacije koriste idempotency key.
- Pending stanje onemogućava dupli submit.
- Success rezultat ne pretpostavlja potvrdu termina kada je kreiran samo zahtev.
- Osetljivi tekst se ne čuva u localStorage-u.

---

## 37. TypeScript strict standard

`strict: true` je obavezan. `noUncheckedIndexedAccess` i `exactOptionalPropertyTypes` uvode se kroz zasebnu proverenu promenu ako već nisu aktivni.

Pravila:

- `any` je zabranjen osim izolovane bibliotečke granice sa trenutnom validacijom;
- cast nije zamena za runtime proveru mrežnog odgovora;
- OpenAPI generated types su autoritet za backend ugovore;
- Zod validira nepoverljive runtime granice;
- discriminated union ima prednost nad grupom nevezanih boolean-a;
- `switch` nad unijom mora biti exhaustive;
- callback props imaju eksplicitne tipove;
- opciono polje se izostavlja umesto slanja `undefined` kada to zahteva ugovor.

---

## 38. Loading, error i empty states

Svaki async UI pokriva:

- initial pending;
- refetch kada se razlikuje od initial pending-a;
- error;
- empty;
- success;
- mutation pending i error;
- unavailable capability.

Error boundary ne zamenjuje lokalni recoverable query error state.

---

## 39. Granice veličine

Fajl iznad 400 linija zahteva dekompoziciju ili dokumentovano privremeno odstupanje.

Redosled izdvajanja:

1. query/mutation hook;
2. payload mapper i helper;
3. podkomponente po ekranu;
4. reducer ili state machine za složen workflow;
5. drawer/modal shell;
6. test fixture i konstante.

Komponenta od 1.000+ linija ne može ostati trajno stanje. Cilj nije samo manji broj linija, već jasna odgovornost i testabilnost.

---

## 40. Review checklist za Client Component

```text
[ ] Da li je "use client" potreban?
[ ] Može li server parent da pripremi podatke?
[ ] Da li komponenta direktno poziva fetch ili servis?
[ ] Da li server state pripada TanStack Query-ju?
[ ] Postoji li kopija query podataka u useState?
[ ] Da li useEffect stvarno sinhronizuje spoljni sistem?
[ ] Može li effect zameniti handler, derived vrednost ili key reset?
[ ] Imaju li useMemo/useCallback konkretan razlog?
[ ] Da li mutation hook već daje pending/error?
[ ] Jesu li mrežni odgovori tipizovani i validirani?
[ ] Jesu li pending, error, empty i success stanja pokrivena?
[ ] Koristi li interna navigacija next/link?
[ ] Koriste li slike next/image, sizes i ispravan alt?
[ ] Da li je preload samo na LCP slici?
[ ] Da li fajl prelazi 300/400 linija?
[ ] Da li osetljiv podatak završava u URL-u, logu ili storage-u?
```

---

## 41. Automatske provere

Frontend gate:

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:e2e
```

Arhitektonska provera se uvodi postepeno i treba da pokrije:

- direktan `fetch(` u vizuelnom `.tsx`;
- client fajlove iznad 400 linija;
- server-only import u Client Component;
- provider SDK van `lib/` adaptera;
- React Query Devtools u production renderu;
- native `<img>`;
- `next/image fill` bez `sizes`;
- raw `any` i nevalidirane mrežne cast-ove.

Poznati legacy dug prvo dobija baseline. Nova odstupanja se blokiraju odmah, a postojeći fajlovi se uklanjaju iz baseline-a tokom refaktora.

---

## 42. Definition of Done za frontend refaktor

```text
[ ] vizuelna komponenta nema direktan transport kod
[ ] query/mutation lifecycle je u hook-u
[ ] payload transformacija je testabilna van JSX-a
[ ] server/client granica je minimalna
[ ] nema nove kopije remote data u useState
[ ] effects imaju opravdanje i cleanup
[ ] TypeScript ugovor je strog
[ ] images i links koriste Next primitive
[ ] accessibility ponašanje je očuvano
[ ] testovi su dodati ili prilagođeni
[ ] typecheck, lint, format, test i build su stvarno pokrenuti
[ ] neizvršeni gate je jasno prijavljen
```

Kod agent ne sme da tvrdi da je refaktor potpun samo zato što je kod premešten iz jednog fajla u drugi.
