# Psihointegritet Digitalni centar

## Tehnička dokumentacija i arhitektura — v0.3

**Status:** implementation baseline  
**Supersedes:** v0.2  
**Change:** project now intentionally uses separate `frontend/` and `backend/` applications.

---

## 0. Why v0.3 changes the previous decision

Version 0.2 recommended a Next.js-only modular monolith. The implementation plan now requires a dedicated Python backend from foundation in order to support:

- a stable public API contract;
- future AI/knowledge-processing workloads;
- independent backend scaling and jobs;
- possible mobile clients;
- Python-based diagnostics and recommendation services;
- clear separation between presentation and domain data.

The system remains simple at the domain level: one Next.js frontend and one FastAPI modular monolith, not microservices.

---

# 1. Final architecture

```text
Browser
   │
   ├── public/server-rendered navigation
   │
   ▼
Next.js 16 frontend — Vercel
   ├── RSC/SSR public pages
   ├── Client interaction
   ├── Clerk identity/session
   ├── TanStack Query client cache
   └── typed OpenAPI client
            │
            │ HTTPS + Clerk session token
            ▼
FastAPI backend — Railway
   ├── REST API / OpenAPI
   ├── authorization and tenant scope
   ├── booking and guidance use cases
   ├── content/program administration
   ├── notifications/jobs/webhooks
   ├── audit and diagnostics
   └── future AI adapter
            │
      ┌─────┼───────────────┐
      ▼     ▼               ▼
 PostgreSQL Redis/QStash  Object storage
```

## 1.1 Deployment units

- `frontend/`: one Vercel project.
- `backend/`: one Railway service built from Dockerfile.
- PostgreSQL: managed, EU region preferred.
- Redis/QStash: Upstash in staging/production.
- Local PostgreSQL and Redis: Docker Compose.

## 1.2 Architectural style

Both applications are modular monoliths.

Do not create separate services for booking, notifications, payments or AI until actual scaling, isolation or deployment requirements justify them.

---

# 2. MVP product scope

## Public

- approved landing page design;
- Psihointegritet presentation;
- reasons for seeking support;
- team and therapist profiles;
- services, duration, format and price;
- first-session explanation;
- workshop/program presentation;
- knowledge and resources;
- FAQ and trust/privacy sections;
- guided support selection;
- booking.

## Client account

- authentication and email verification;
- own appointments;
- cancellation/reschedule request;
- enrolled programs;
- notification preferences.

## Therapist area

- own public profile;
- services and prices;
- availability and exceptions;
- assigned appointments;
- appointment confirmation/status actions;
- program participation.

## Organization admin

- team memberships and roles;
- profiles, services and topics;
- content and workshops;
- booking administration;
- audit and diagnostics.

## Explicitly outside MVP

- therapy notes;
- diagnoses or medical records;
- therapy-session recordings/transcripts;
- unrestricted therapist-client chat;
- community groups;
- adolescent accounts before legal/safeguarding design;
- open therapist marketplace;
- split payouts;
- AI therapy, diagnosis or risk assessment;
- native mobile app.

---

# 3. Frontend architecture

## 3.1 Rendering

- Server Components are default.
- Public pages and page sections remain server-rendered.
- Client Components are limited to interactive leaves.
- Motion wrappers are small Client boundaries around server-rendered content.
- Use Suspense at meaningful data boundaries.
- Use `<Activity>` only when preserving hidden client state is intentional.

## 3.2 Data access

- Public RSC data is fetched server-side through `frontend/src/lib/api/server-client.ts`.
- Interactive authenticated client data uses TanStack Query and a centralized authenticated transport.
- UI primitives never fetch.
- API shapes are generated from FastAPI OpenAPI.
- No handwritten duplicate network DTOs.

## 3.3 Route Handlers

Allowed:

- Clerk callbacks/web-specific adapters;
- upload signing when browser-to-storage requires it;
- same-origin adapter only when security or framework integration requires it;
- frontend health/build metadata.

Not allowed:

- duplicate therapist/service/booking CRUD;
- direct business database access;
- domain authorization source of truth.

## 3.4 Design handoff

Claude Design JSX/Tailwind is treated as design source, not production architecture.

Extraction order:

1. design tokens;
2. generic UI primitives;
3. Motion wrappers;
4. shared cards;
5. homepage sections;
6. typed content;
7. route composition;
8. accessibility and responsive verification.

---

# 4. Backend architecture

## 4.1 Framework

- FastAPI with lifespan management.
- Pydantic v2 for API and configuration boundaries.
- SQLAlchemy 2 async ORM.
- Alembic for migrations.
- PostgreSQL 18.
- Python 3.14 managed by uv.

## 4.2 Module boundaries

```text
organizations
identity
therapists
services
topics
booking
guidance
programs
content
notifications
privacy
diagnostics
payments (adapter only, later)
```

Each module separates:

- domain rules;
- application use cases;
- infrastructure adapters;
- API routers/DTOs.

## 4.3 API conventions

- versioned under `/api/v1`;
- stable `operation_id` values;
- request/response Pydantic models;
- problem-details error envelope;
- correlation ID in every response/error;
- bounded pagination;
- idempotency for critical mutations;
- no raw ORM serialization.

---

# 5. Authentication and authorization

## 5.1 Identity provider

Use Clerk for MVP identity because the backend is separate.

Clerk handles:

- sign-up/sign-in;
- email verification;
- password reset;
- session token lifecycle;
- optional OAuth;
- staff MFA.

## 5.2 Domain data remains internal

Clerk stores no mental-health, booking, program or clinical data.

PostgreSQL stores:

- internal user;
- external auth subject;
- organization membership;
- therapist/client profile;
- roles/capabilities;
- all resource ownership.

Do not use Clerk Organizations in MVP. The product's organization model stays provider-neutral.

## 5.3 Backend verification

FastAPI verifies the Clerk session JWT using cached JWKS and validates issuer, audience/authorized party and expiry.

Authentication dependency returns provider-neutral claims. Authorization then loads the internal user and policy context from PostgreSQL.

## 5.4 Authorization model

- RBAC for coarse capabilities.
- ABAC for organization, resource assignment, ownership, appointment status and policy time windows.
- `proxy.ts` may redirect unauthenticated users but is never the final authorization layer.

---

# 6. Data model baseline

## Identity/organization

```text
organizations
users
memberships
client_profiles
therapist_profiles
therapist_credentials
```

## Catalog

```text
topics
services
therapist_topics
therapist_services
service_formats
```

## Booking

```text
availability_rules
availability_exceptions
appointment_holds
appointments
appointment_events
cancellation_policies
```

## Guidance

```text
guidance_sessions
guidance_answers
recommendation_rules
recommendation_results
```

## Programs/content

```text
programs
program_sessions
program_facilitators
enrollments
articles
article_authors
content_categories
resources
media_assets
```

## Platform integrity

```text
consents
privacy_requests
audit_logs
security_events
notification_jobs
notification_deliveries
outbox_events
feature_flags
```

Future tables are added only when their feature enters scope. Do not create empty speculative schemas.

---

# 7. Booking architecture

- Store instants in UTC.
- Store organization/therapist timezone as IANA identifiers.
- Generate slots from recurring rules + exceptions.
- Create a short appointment hold before final confirmation.
- Use a database constraint to prevent overlapping active appointments.
- Run booking creation inside one transaction.
- Emit appointment event and outbox event in the same transaction.

Statuses:

```text
held
requested
confirmed
reschedule_requested
cancelled_by_client
cancelled_by_therapist
completed
no_show
```

No payment requirement in the first booking transaction.

---

# 8. Guided selection

This is assistance with choice, not a psychological test or clinical triage.

MVP inputs:

- who support is for;
- reason/category;
- service format;
- online/in-person;
- schedule preference;
- language/timezone where relevant.

Rules are deterministic and explainable.

Output:

- two to four relevant therapist/service options;
- why each was shown;
- direct access to profiles and booking.

Do not require email before showing results. Do not collect free-form health text in MVP.

---

# 9. Privacy and security

MVP stores the minimum necessary identity, booking, service and enrollment data.

It does not store:

- diagnoses;
- therapy notes;
- detailed mental-state journals;
- recordings;
- session transcripts;
- clinical assessment conclusions.

Required controls:

- encryption in transit and managed encryption at rest;
- exact CORS allowlist;
- tenant scoping;
- RBAC + ABAC;
- staff MFA;
- secure provider token verification;
- request/rate limits;
- signed private file URLs;
- structured audit log;
- PII scrubbing;
- backup and restore test;
- retention/deletion policy;
- legal review before public release.

---

# 10. Notifications and jobs

- Resend is the primary email provider.
- Email is the required appointment reminder channel.
- Web push is optional after the email flow is proven.
- QStash handles delayed/retried jobs.
- PostgreSQL notification job/delivery tables remain source of truth.
- Critical jobs are not delegated only to in-process background tasks.

---

# 11. Payments

No mandatory online payment in first MVP.

Initial flows:

- therapy booking: payment directly to center/therapist according to business policy;
- workshop: registration plus manual bank-payment instructions/confirmation.

Future provider abstraction:

```text
ManualPaymentProvider
PayPalPaymentProvider
SerbianBankPaymentProvider
```

Payoneer is not an architectural dependency.

---

# 12. Docker and environments

## Local

- Next.js runs natively.
- Docker Compose runs PostgreSQL and Redis.
- FastAPI may run natively or through its Dockerfile.

## Staging

- Vercel staging frontend;
- separate Railway backend;
- separate PostgreSQL database;
- separate Clerk application;
- test Resend sender/domain;
- no production secrets or data.

## Production

- Vercel frontend;
- Railway backend Docker image;
- managed PostgreSQL with backups;
- Upstash Redis/QStash;
- production Clerk application;
- verified email domain.

---

# 13. Observability

- correlation ID from edge/frontend to backend;
- structured backend logs;
- route latency and error metrics;
- Sentry with PII scrubbing;
- audit trail for privileged mutations;
- diagnostic collectors for risky multi-model workflows.

No sensitive guided-selection answer or appointment context in logs/analytics.

---

# 14. Testing gates

## Frontend

```text
typecheck
lint
format check
unit/component tests
production build
Playwright critical flows
axe accessibility checks
```

## Backend

```text
Ruff format/check
Pyright strict
unit tests
PostgreSQL integration tests
API contract tests
authorization/tenant tests
migration checks
booking concurrency test
```

## Contract

- FastAPI OpenAPI export is deterministic.
- Generated TypeScript types are current.
- CI fails on contract drift.

---

# 15. Implementation order

## Foundation

- repository and toolchain;
- frontend/backend scaffolds;
- Docker infrastructure;
- lint/type/test gates;
- environment validation;
- health endpoints;
- OpenAPI generation.

## Design integration

- tokens and fonts;
- UI primitives;
- Motion system;
- sections and responsive behavior;
- static typed content;
- accessibility.

## Identity and organization

- Clerk integration;
- internal user mapping;
- organization/membership model;
- role/capability policies.

## Public data/CMS baseline

- therapists;
- services/topics;
- content and workshops.

## Booking

- availability;
- holds;
- confirmation/cancellation/reschedule;
- reminders;
- timezone and concurrency tests.

## Guided selection

- deterministic rules;
- result explanation;
- booking handoff.

## Hardening and pilot

- privacy/legal copy;
- audit and diagnostics;
- performance/accessibility;
- staging pilot with Psihointegritet team.

---

# 16. Architecture decisions to record

```text
ADR-001 Split frontend/backend modular monolith
ADR-002 PostgreSQL 18 as primary data store
ADR-003 FastAPI owns business CRUD and authorization
ADR-004 Next.js RSC-first frontend
ADR-005 OpenAPI-generated TypeScript contract
ADR-006 Clerk identity with internal PostgreSQL authorization
ADR-007 Provider-neutral organization model; no Clerk Organizations in MVP
ADR-008 Partial Dockerization
ADR-009 No online payment requirement in first MVP
ADR-010 Guided selection is non-clinical and deterministic
ADR-011 No clinical notes/chat in MVP
ADR-012 Outbox preparation for durable domain events
```
