# PSIHOINTEGRITET — MASTER IMPLEMENTATION PLAN

**Version:** 1.0
**Date:** 2026-07-15
**Status:** binding execution plan for Claude Code
**Owner / final authority:** Milan Dražić (CTO, Product Owner, Superadmin)
**Business owner:** Anja Stamenković (Psihointegritet)
**Location in repo:** `documentations/CLAUDE_CODE_MASTER_PLAN_v1_0.md`

---

## 0. How Claude Code must use this document

You are acting as a **senior SaaS product engineer** on this repository. The CTO (Milan) supervises every milestone. This document is your execution plan; it does not replace the binding rules below — it sequences them.

**Working agreement (non-negotiable):**

1. Work on **one milestone at a time**, in the order defined here. Never start a later milestone because it "seems ready".
2. At the start of each milestone: produce a short written plan (files, migrations, endpoints, tests) and wait for CTO approval before writing code, unless the CTO has pre-approved the milestone in the session.
3. Work on `feature/*` branches. Never commit directly to `main` or `staging`. One milestone ≈ one PR (split large milestones into reviewable PRs).
4. Every PR must pass the full quality gates (section 12) **actually executed**, not claimed. Report exact commands and results.
5. If you hit anything on the **STOP list** (section 13), stop and ask. Do not guess product, legal, pricing, or clinical decisions.
6. Any deviation from `ARCHITECTURAL_RULES_REVISED.md` or `technical-documentation-architecture-v0.3.md` requires an ADR in `documentations/adr/` approved by the CTO.
7. End every milestone with the **completion report** defined in `ARCHITECTURAL_RULES_REVISED.md` §24.
8. Never invent qualifications, prices, dates, legal text, or clinical claims. Draft copy is allowed only when explicitly marked `draft` and kept out of production publication.

**Binding documents (updated 2026-07-17).** Four documents are binding; everything else in `documentations/` is context or archive:

1. **`CLAUDE_CODE_MASTER_PLAN_v1_0.md`** (this file) — sequencing, scope, acceptance
2. **`Psihointegritet_Razvojni_Proposal_v1_1.docx`** — the business agreement with Anja (phases, budget, acceptance criteria, her decision list §4)
3. **`IZMENE_POSTOJECEG_PROJEKTA_v1_0.md`** — what changes in what already exists (R0 change-list, execution order §8)
4. **`ARCHITECTURAL_RULES_REVISED.md`** — coding contract: quality, optimization, best practice

**Read-first order of authority (highest wins):**

1. Confirmed legal/safety constraints and the guardrails in section 11 of this plan
2. `documentations/Psihointegritet_Razvojni_Proposal_v1_1.docx` (product truth — what the client agreed to)
3. This master plan (sequencing, scope, acceptance)
4. `documentations/technical-documentation-architecture-v0.3.md` (system architecture — data model, module boundaries, ADRs)
5. `documentations/ARCHITECTURAL_RULES_REVISED.md` (coding contract)
6. `documentations/PSIHOINTEGRITET_PRODUCT_ENGINES_ARCHITECTURE_v1_0.md` (engine vision — **guide, not prescriptive**; engines are module boundaries inside the FastAPI monolith, never premature microservices)
7. Design handoff and current implementation

**Live status of the work:** `documentations/TODO.md` — what is done, where each task is specified, what comes next. It tracks status only; scope changes here, never there.

If documents conflict, record the conflict in `documentations/PRODUCT_DECISIONS.md` and ask the CTO.

**Archived 2026-07-17** (in `documentations/archive/`, each with a SUPERSEDED banner explaining what replaced it) — never take decisions from these: `PRODUCT_CONTEXT.md` (was authority #2; stale T1/T2 terminology and a competing authority order — its role is now covered by Proposal v1.1 §3 + section 1 below; its §17 topic seed map survives only as a *draft* source for R1.1), `production-plan.md` (M0–M6, superseded per IZMENE §6), `FOUNDATION_SETUP.md`, `CLAUDE_FOUNDATION_PROMPT.md`, `quality-gate-before-production.md` (replaced by section 12), `deployment-and-environments.md` (replaced by section 14), `technical-documentation-architecture-v0.1-SUPERSEDED.md` (Next-only/Drizzle/Auth.js).

---

## 1. Locked product decisions and terminology

These are confirmed by the business owner and must be applied everywhere (UI copy, slugs, emails, seed data, docs):

| # | Decision | Locked value |
|---|---|---|
| T1 | Couples service public name | **„Bračno savetovanje"** — never „bračna psihoterapija". „Partnerska podrška" allowed only as secondary descriptive phrase, never as the service name. |
| T2 | Counseling service name | **„Psihoterapijsko savetovanje"** — never „psihološko savetovanje" (legal distinction in Serbia). |
| T3 | Qualifications | Old bios said „psihoterapeut pod supervizijom" — **outdated**. Per Anja all three are certified therapists. Publish only the exact wording each therapist confirms in writing. Until then keep credential lines as `draft`. ⚠️ Marjan's newly submitted bio still contains „pod supervizijom" — contradiction; blocked on written confirmation (STOP list item S1). |
| T4 | Person terminology | „klijent" / „korisnik" — never „pacijent". The platform is a psychotherapy/counseling center, **not** a psychiatric or medical platform. |
| T5 | Parenting | „Podrška roditeljima" is a **support area** (individual consultations for parents). Workshops/structured parent programs come later (Phase 4). No separate parenting logo replacing the main identity. |
| T6 | Booking model | **Request-first**: client requests a slot; the therapist confirms, declines, or proposes an alternative. No auto-confirmed bookings. |
| T7 | Prices | Draft public prices from client material: Individualna psihoterapija 60 min — 3.500 RSD; Bračno savjetovanje 90 min — 5.000 RSD; Psihoterapijsko savjetovanje 60 min — 3.500 RSD; online i uživo. Public site must state prices are „okvirne". Student/adolescent price: not defined (STOP S3). |
| T8 | Team | Anja Stamenković (Niš), Marija Stamenković (Leskovac), Marijan/Marjan Janković (Leskovac) — exact spelling of „Marijan" vs „Marjan" unconfirmed (STOP S2). All three work online **and** in person. |
| T9 | Language | Public content: Serbian Latin, **ekavica** — aligned with Proposal v1.1 §3 („bračno savetovanje", „psihoterapijsko savetovanje") and the Engines document, both authored 2026-07-15. **Corrected 2026-07-17** (CTO decision): this row previously said „ijekavica … the owner's authored style", which contradicted the very proposal the client signed off on. ⚠️ The shipped `frontend/src/content/homepage.ts` is still ijekavica (18 lines) and its header comment claims „Ijekavica is intentional" — the sweep is R0.2, and Anja must be informed since the copy is hers. Data model must not block later sr-Cyrl/en locales (`next-intl` already installed). |
| T10 | Adolescents | Informational content + contact pathway only. No self-service accounts, booking, chat, or payment for minors until legal/safeguarding model is approved (STOP S4). |
| T11 | Crisis boundary | The platform is not an emergency/crisis service. Exact public wording + local resources require professional/legal approval before publication (STOP S5). |
| T12 | Sensitive data | The platform does **not** store anamnesis, diagnoses, therapy notes, session recordings/transcripts, or mental-state conclusions. Do not create models/tables for these. |
| T13 | Guided selection | Deterministic, explainable, non-diagnostic. Public label family: „Pomozi mi da pronađem podršku" / „Pomoć pri izboru podrške". Answers are not persisted in Release 1. |
| T14 | Payments | No online payment in Releases 1–2. Therapy paid directly to the center/therapist; workshops via bank-transfer instructions later. Provider abstraction comes in Phase 5. |
| T15 | Google Calendar | Internal Booking Engine is the source of truth. Google contributes free/busy blocks (no private event titles) and mirrors confirmed appointments. Failure of Google sync must never block internal booking. |

---

## 2. Current repository state (verified 2026-07-15)

Repo: `Psihointegritet-digitalni-centar/` — `frontend/` + `documentations/` (+ `backend/` per README; **verify it exists locally** — the reviewed archive was truncated).

**Frontend (Next.js 16.2.10, React 19.2.4, Tailwind 4, Clerk 7, TanStack Query 5, next-intl, RHF+Zod, Resend, Upstash, motion, port 3007):**

- Homepage implemented from the Claude Design handoff: hero, trust strip, reasons (6), support paths, therapists, services, first session, workshop, resources, FAQ, final CTA, header/footer, mobile menu, sticky bar.
- Typed staging content in `src/content/homepage.ts` (ijekavica, draft data).
- Guided-selection quiz implemented (`src/features/guidance/quiz.ts` + drawer/launcher) — deterministic, client-memory only. Unit + e2e tests exist.
- Route groups scaffolded: `(public)`, `(auth)/prijava|registracija` (Clerk), `(client)/nalog`, `(staff)/radni-prostor`, `(staff)/superadmin` — placeholders.
- Quality tooling in place: strict TS, ESLint, Prettier, Vitest, Playwright (+axe), React Compiler, env validation, `api:generate` from backend OpenAPI.

**Backend:** FastAPI modular monolith, Python 3.14.6/uv, SQLAlchemy 2 async, Alembic, PostgreSQL 18.4, Redis 8.8, Railway, port 8001, OpenAPI export script. **Verified present 2026-07-17** (R0.3): the foundation is real and correct, but it is *only* a foundation — all 11 module directories are empty, there are zero models, zero migrations and zero endpoints beyond the two health checks. See `documentations/TODO.md` §4 and §9.

**Known defects to fix (R0):**

- `src/content/homepage.ts` → `footerServiceLinks` still contains „Partnersko savjetovanje" and „Psihološko savjetovanje" (violates T1/T2). Sweep the whole content layer for T1/T2/T3 terms.
- `documentations/technical-documentation-architecture.md` is the superseded v0.1 (Drizzle/Auth.js) while v0.3 sits alongside — rename/mark to prevent agents mixing architectures.
- ~~`quality-gate-before-production.md` still lists „Drizzle migration check"~~ → ✅ archived 2026-07-17; section 12 is the only source for gates.
- ~~`PRODUCT_CONTEXT.md` §6 terminology / MVP split~~ → ✅ archived 2026-07-17; Proposal v1.1 §3 + section 1 replace it.
- New therapist bios were delivered (long-form, first-person). Integrate as `draft` content; do not publish credentials until T3 confirmations.
- Repo hygiene: archives/uploads must exclude `node_modules/`, `.next/`, `test-results/` (last zip was 449 MB and truncated).

---

## 3. Release map

| Release | Name | Proposal phase | Engines milestone | Duration (active dev) | Status |
|---|---|---|---|---|---|
| **R0** | Housekeeping & doc alignment | — | E0 (lightweight) | 1–2 days | next |
| **R1** | Public Digital Center (production launch) | Faza 1 (voucher, 0 EUR) | — | ~4 weeks total incl. R0 | in progress |
| **R2** | Operational MVP + Booking Engine | Faza 2 | E1 + E2 | 7–9 weeks | after R1 acceptance + SoW |
| **R3** | Knowledge & Resources (CMS, library, access grants) | Faza 3 | E3 (content part) | 5–7 weeks | gated |
| **R4** | Workshops, Programs & B2B | Faza 4 | E4 (programs part) | 6–8 weeks | gated |
| **R5** | Online sessions, admin messaging, payments | Faza 5 | E4/E5 (payment part) | 5–7 weeks | gated |
| **R6** | Business OS: analytics, diagnostics, marketing, plans | Faza 6 | E5 | 7–9 weeks | gated |
| **R7+** | SaaS multi-tenant, marketplace, AI navigator/community | Faze 7–9 | E6+ | separate business decisions | gated |

Rule: **only R0–R2 are specified for implementation in this plan.** R3–R7 sections are backlog context; do not scaffold their tables, modules, or UI ("empty placeholder abstractions" are prohibited).

---

## 4. RELEASE 0 — Housekeeping (1–2 days, inside the voucher)

**R0.1 — Documentation alignment** — *partly done 2026-07-17; live status in `documentations/TODO.md` §4*

- ✅ v0.1 architecture moved to `documentations/archive/technical-documentation-architecture-v0.1-SUPERSEDED.md` with a SUPERSEDED banner; v0.3 is the active baseline (annotated with the two conflicts this plan overrides).
- ✅ `quality-gate-before-production.md` archived instead of patched — section 12 of this plan is the single source for gates, so the Drizzle line no longer exists anywhere.
- ✅ Six competing/stale documents archived with banners (see section 0); `documentations/` returned to git tracking (it had been added to `.gitignore` by commit `6452c70`, removing 4,059 lines of documentation from version control); Engines document brought into the repo under the exact name this plan cites.
- ✅ `documentations/TODO.md` created — the live status tracker (done / where it is specified / what is next).
- ⬜ Add `documentations/PRODUCT_DECISIONS.md` (date, decision, owner, reason, impact) and `documentations/OPEN_DECISIONS.md` seeded from section 13.
- ⬜ Add root `CLAUDE.md` → points to the four binding documents + `TODO.md`.
- ~~Update `PRODUCT_CONTEXT.md`~~ → superseded: archived instead (CTO decision 2026-07-17). Its product role is covered by Proposal v1.1 §3 + section 1 of this plan.

**R0.2 — Terminology & content sweep (frontend)**

- Replace every occurrence per T1/T2 in `src/content/**`, components, tests, e2e fixtures: „Partnersko savjetovanje" → **„Bračno savetovanje"**; „Psihološko savjetovanje" → **„Psihoterapijsko savetovanje"**.
- **Do the ekavica sweep in the same pass** (T9, corrected 2026-07-17). The affected strings are the same ones, so a separate pass would rewrite them twice. ~15 files; `src/content/homepage.ts` alone has 18 ijekavica lines and a header comment claiming „Ijekavica is intentional" that must go. Note „Za partnerski odnos" is load-bearing: it is a quiz answer used as a dictionary key at `src/features/guidance/quiz.ts:83` and asserted in `quiz.test.ts` + `tests/e2e/guidance.spec.ts` — logic and tests must change together.
- Remove/neutralize any „pod supervizijom" or unconfirmed credential strings from staging copy; keep title lines generic („geštalt psihoterapeutkinja/psihoterapeut") with `draft` status until T3 written confirmations.
- Add the three delivered long bios into typed content as `draft` (see `documentations/handoff/bios-2026-07.md` — create it from the delivered text, verbatim, with per-therapist status flags).

**R0.3 — Backend verification** — *verified 2026-07-17; findings in `documentations/TODO.md` §4 and §9*

- ✅ Foundation confirmed present and correct: both health endpoints, problem-details envelope (tested), CORS allowlist, Alembic harness, Dockerfile, deterministic OpenAPI export, Ruff/Pyright config, 5 tests passing.
- ⬜ Gaps found, to fix before R1.3: `db/migrations/versions/` is empty **and untracked** while `railway.json:10` runs `alembic upgrade head` on deploy → fails on a fresh clone (needs `.gitkeep` or the first migration); `/health` does not check the database yet `railway.json:8` uses it as the healthcheck; no rate limiting exists (`redis_url` is configured but never read); `backend/openapi.json` is gitignored, so the contract-drift gate in section 12 cannot fail the build.
- ⬜ Regenerate `src/types/api.generated.ts` once real endpoints exist (it currently contains only `HealthResponse`).

**Acceptance R0:** gates green on both apps; grep for forbidden terms returns zero hits in `src/content` and public components; docs updated; CTO sign-off recorded in `PRODUCT_DECISIONS.md`.

---

## 5. RELEASE 1 — Public Digital Center (voucher Phase 1)

**Goal:** production-ready public site that presents the center, team, support areas, services and prices, receives contact/B2B inquiries and **manual appointment requests**, with professional email flow. No user accounts. No automatic slots.

### R1.1 — Public routes & navigation

Create RSC-first pages (content typed in `src/content/`, per-page files; homepage stays composed of existing sections):

```text
/                       (exists — keep, wire nav links to real routes)
/pronadji-podrsku       guided selection (reuse quiz as full page + drawer entry)
/oblasti-podrske        topic overview (10 confirmed areas)
/oblasti-podrske/[slug] topic page: plain-language explanation, related therapists, services, CTA
/tim                    team page: shared approach, values, member cards → profiles
/tim/[slug]             3 therapist profiles (anja-stamenkovic, marija-stamenkovic, marijan-jankovic*)
/usluge                 service catalog: the 3 confirmed services + duration/price/format + „okvirne cijene" note
/radionice              workshop presentation („Upoznaj sebe kroz geštalt iskustvo") — informational; „Prijavite interesovanje" form; NO enrollment/date until confirmed (STOP S6)
/znanje                 resources listing: 3 planned article cards as „u pripremi" (no fake articles published)
/rad-sa-kompanijama     B2B page + dedicated inquiry form
/o-nama                 organization, mission, way of work, locations (Niš, Leskovac), first-session explanation
/zakazi                 appointment request form (see R1.3)
/kontakt                general contact
/privatnost /uslovi /kolacici /pravila-zakazivanja   legal placeholders marked „u pripremi — pravna potvrda" (S5)
```

\*slug spelling per STOP S2 before production.

Rules: therapist profile = photo placeholder (initials monogram until authentic approved photos — never stock portraits under real names), name, confirmed title only, short intro, areas, formats (online/uživo), city, CTA to `/zakazi?terapeut=slug`. Topic pages must read as life situations, not diagnoses. Areas not yet active are labeled „U pripremi" with interest form — never a booking button for an unavailable service.

### R1.2 — Guided selection page polish

- Promote the existing quiz to `/pronadji-podrsku` (same deterministic rules), results show 2–4 options with a one-line „zašto je prikazano" explanation and links to profiles/`/zakazi`.
- No persistence, no analytics on answers, no email gate before results (T13).

### R1.3 — Inquiry & appointment-request intake (backend-owned)

Business CRUD lives in FastAPI (rules §1.1) — Next Route Handlers must not implement this.

**Backend module `inquiries` (thin slice of future booking module):**

Tables (Alembic migration):

```text
organizations            seed: Psihointegritet (slug, name, timezone Europe/Belgrade)
contact_inquiries        id, organization_id, kind ENUM(general,b2b,interest), name, email,
                         phone NULL, message, source_page, status ENUM(new,handled),
                         handled_at NULL, created_at
appointment_requests     id, organization_id, therapist_slug NULL, service_slug NULL,
                         format ENUM(online,in_person,either), preferred_at TIMESTAMPTZ NULL,
                         preferred_text VARCHAR NULL, name, email, phone NULL,
                         note VARCHAR(500) NULL, consent_booking_rules BOOL NOT NULL,
                         status ENUM(new,contacted,scheduled,closed), created_at
email_deliveries         id, kind, to_email, provider_message_id, status, error_code NULL, created_at
```

Endpoints (`/api/v1`, public, rate-limited):

```text
POST /public/inquiries               operation_id: create_public_inquiry
POST /public/appointment-requests    operation_id: create_appointment_request
GET  /health, /api/v1/health         (exists)
```

Behavior: Zod (FE) + Pydantic (BE) validation; honeypot field + Upstash rate limit (per IP+email) + request size limit; on success send via Resend (a) team notification to configured org inbox(es), (b) user confirmation that clearly states **„zahtjev nije potvrda termina — javićemo se radi potvrde"**; record `email_deliveries`; failures logged with correlation ID, user gets polite retry message. The `note` field UI copy must instruct users **not** to include health details; never log message bodies.

Frontend: forms with React Hook Form + Zod, inline field errors (toast is complementary only), pending states, success screens. `/zakazi` prefills therapist/service from query params.

### R1.4 — SEO, analytics, accessibility, performance

- Metadata API per route, OpenGraph images, `sitemap.xml`, `robots.txt`, canonical URLs, JSON-LD (Organization, LocalBusiness for Niš/Leskovac — only confirmed data).
- Privacy-safe analytics (Vercel Analytics or Plausible): page-level only; **never** quiz answers, form contents, or request payloads.
- axe/Playwright accessibility pass on all public routes; Lighthouse mobile ≥ 90 perf/SEO/a11y on home, profile, /zakazi.
- Image optimization for hero/profiles; fonts via `next/font`.

### R1.5 — Production launch gate

- Domain purchase on Psihointegritet's account (CTO has technical access), DNS, SSL, `www` redirect.
- Resend domain verification (SPF/DKIM/DMARC) coordinated with Zoho Mail MX records; professional addresses (e.g. `info@`, `termini@`) — Zoho account owned by Psihointegritet.
- Separate staging (staging branch → staging Vercel/Railway/DB/Clerk-less) and production envs; preview never touches production data (deployment doc).
- Error monitoring (Sentry, PII scrubbing) both apps; uptime check on `/api/v1/health`.
- Content freeze → written approval from Anja (per-page checklist) → production deploy → smoke tests → launch note in `PRODUCT_DECISIONS.md`.

### Acceptance criteria — Release 1

1. All public routes render correctly on mobile and desktop; axe reports no critical violations; e2e critical paths green (home → profile → /zakazi submit; home → quiz → recommendation → /zakazi; B2B form).
2. Both forms validate, persist to PostgreSQL, notify the team, confirm to the user, and survive Resend failure gracefully (retriable, logged).
3. Every appointment-request surface states the request is not a confirmed appointment.
4. Zero unconfirmed credentials, zero stock portraits under real names, zero forbidden terminology (T1–T4).
5. Staging/preview isolated from production data and secrets; gates green; Anja's written acceptance recorded.

**Explicitly out of R1:** accounts/dashboards, automatic slots, Google Calendar, payments, CMS, protected resources, chat/video, workshops enrollment.

---

## 6. RELEASE 2 — Operational MVP + Booking Engine (Phase 2)

**Goal:** clients, therapists and the owner work inside the platform. Accounts exist; therapists manage availability; appointment requests flow through statuses with confirmation, alternatives, reminders; owner sees operational overview; superadmin sees diagnostics. Request-first (T6) end to end.

**Entry criteria:** R1 accepted in production; signed SoW for Phase 2; booking/cancellation policy confirmed (STOP S7); Google accounts per therapist identified (for M2.6).

**Split for budgeting:** 2A = M2.1–M2.5 + M2.7 (core MVP). 2B = M2.6 Google Calendar (+ optional Notify Me M2.8). 2B may ship in a fast follow-up.

### 6.1 Data model (single Alembic chain; UTC everywhere; every tenant-owned row has `organization_id`; enums as PostgreSQL enums; `btree_gist` extension required)

**Identity & org (module `identity`, `organizations`):**

```text
users                 id, external_auth_id UNIQUE (Clerk sub), email UNIQUE, full_name,
                      status ENUM(active,disabled), locale, timezone, created_at
memberships           id, organization_id, user_id, role ENUM(owner,admin,therapist,content_editor),
                      status, UNIQUE(organization_id,user_id)
client_profiles       id, organization_id, user_id, phone NULL, notes_forbidden — (no notes column; do not add),
                      created_at, UNIQUE(organization_id,user_id)
therapist_profiles    id, organization_id, user_id NULL, slug UNIQUE per org, display_name, title,
                      short_bio, long_bio, city, works_online BOOL, works_in_person BOOL,
                      languages TEXT[], photo_asset NULL, content_status ENUM(draft,in_review,approved,published,archived)
therapist_credentials id, therapist_profile_id, label, issuer NULL, year NULL, is_public BOOL,
                      content_status (publish only after written confirmation — T3)
consents              id, user_id, kind ENUM(terms,privacy,booking_rules,marketing), version, granted_at, revoked_at NULL
audit_logs            id, organization_id NULL, actor_user_id NULL, action, entity_type, entity_id, metadata JSONB (minimal), created_at
outbox_events         id, organization_id, event_type, event_version, aggregate_type, aggregate_id,
                      payload JSONB (no sensitive text), created_at, processed_at NULL, attempts
```

Clerk webhook (`user.created/updated/deleted`) upserts `users` by `external_auth_id`; Clerk stores identity only (no roles/domain data — rules §10).

**Catalog (modules `services`, `topics`, `therapists`):**

```text
topics             id, organization_id, slug, name, description, content_status, sort
services           id, organization_id, slug, name, description, duration_min, buffer_min DEFAULT 0,
                   price_amount NUMERIC(10,2), price_currency CHAR(3) DEFAULT 'RSD',
                   formats format[] , audience ENUM(adult,couple,parent,adolescent),
                   max_participants SMALLINT DEFAULT 1 (2 for bračno savjetovanje), content_status
therapist_services therapist_profile_id, service_id, active BOOL, PK(both)
therapist_topics   therapist_profile_id, topic_id, PK(both)
```

Seed (draft): 3 services per T7; topics per the seed map in `archive/PRODUCT_CONTEXT.md` §17 — **read as draft only** (archived; its terminology violates T1/T2, so use T1/T2 names) and confirm the 10 support areas with Anja before publication.

**Booking (module `booking`):**

```text
availability_rules      id, organization_id, therapist_profile_id, weekday SMALLINT(0–6),
                        start_time TIME, end_time TIME, format ENUM(online,in_person,both),
                        valid_from DATE NULL, valid_to DATE NULL
availability_exceptions id, therapist_profile_id, period TSTZRANGE, kind ENUM(block,extra),
                        format NULL, note VARCHAR(200) NULL (operational only — never health text)
external_busy_blocks    id, therapist_profile_id, source ENUM(google), external_id, period TSTZRANGE,
                        synced_at   — free/busy only, never event titles (T15)
appointment_holds       id, organization_id, therapist_profile_id, service_id, period TSTZRANGE,
                        expires_at, session_key, idempotency_key UNIQUE,
                        EXCLUDE USING gist (therapist_profile_id WITH =, period WITH &&)
appointments            id, organization_id, therapist_profile_id, service_id, client_user_id,
                        status appointment_status, period TSTZRANGE, format ENUM(online,in_person),
                        booking_timezone TEXT (IANA), price_amount, price_currency,
                        client_note VARCHAR(300) NULL (logistics only; UI forbids health detail),
                        cancellation_reason_code NULL, google_event_id NULL,
                        idempotency_key UNIQUE, created_from_hold NULL, created_at,
                        EXCLUDE USING gist (therapist_profile_id WITH =, period WITH &&)
                          WHERE (status IN ('requested','confirmed','change_requested'))
appointment_participants id, appointment_id, role ENUM(owner,participant), user_id NULL,
                        invite_email NULL, invite_status, consent_at NULL   — bračno savjetovanje: 2 participants, 1 owner; no relationship/reason data (engines §7.6)
appointment_events      id, appointment_id, event_type, actor_user_id NULL, metadata JSONB minimal, created_at
cancellation_policies   id, organization_id, service_id NULL, min_notice_hours INT DEFAULT 24,
                        late_cancellation_rule TEXT, active BOOL   — values from S7, seeded from client material (24 h)
```

Status enum (engines §7.3): `held, requested, alternative_proposed, confirmed, change_requested, cancelled_by_client, cancelled_by_therapist, completed, no_show, declined, expired`. Allowed transitions live in one domain policy (`booking/domain/status_machine.py`) with exhaustive tests.

**Notifications (module `notifications`):**

```text
notification_preferences id, user_id, channel ENUM(email), kind, enabled BOOL
notification_jobs        id, organization_id, kind, appointment_id NULL, scheduled_for,
                         status ENUM(pending,sent,failed,cancelled), attempts, dedupe_key UNIQUE
notification_deliveries  id, job_id, channel, to_email, provider_message_id NULL, status, error_code NULL, created_at
```

R1 `email_deliveries` migrates into this structure. Templates via react-email in frontend package or backend Jinja — decide by ADR; content is neutral (never topic/reason — engines §8.4).

### 6.2 Milestones

**M2.1 — Identity, organization, roles (1 week)**
Clerk end-to-end (sign-up/sign-in/verification/recovery; staff MFA on), Clerk webhook sync, internal `users/memberships/roles`, provider-neutral `Identity` dependency in FastAPI (JWKS verification per rules §10.2), capability policies (RBAC+ABAC evaluator), tenant scoping in every repository, cross-tenant security tests, audit log writes for privileged mutations. Frontend: `(auth)` finalized in Serbian; `(client)/nalog` and `(staff)` shells behind proxy redirect (never authorization truth).

**M2.2 — Catalog & availability (1–1.5 weeks)**
Services/topics/therapist CRUD (admin), therapist availability rules + exceptions UI with conflict validation, timezone handling (Europe/Belgrade default; client timezone captured at booking), public read endpoints powering `/tim`, `/usluge`, `/oblasti-podrske` from DB (replacing typed static content, which remains the seed source).

**M2.3 — Booking domain (1.5–2 weeks)**
Slot computation (rules + exceptions − active appointments − holds − external busy), `POST /public/availability` query, hold creation (10 min TTL, released by QStash job + reconciliation cron), request-first flow: hold → registration/sign-in → `requested`; therapist actions: confirm / decline / propose alternative (with expiry); client accepts/declines alternative; change/cancel per policy; completed/no_show marking; idempotency keys on all mutating booking endpoints; appointment + event + outbox in one transaction; **concurrency test proving two simultaneous requests cannot both become active for the same slot** (DB exclusion constraint is the last line).

**M2.4 — Client & therapist & admin panels (1.5–2 weeks)**
Client (`/nalog`): next appointment + status, history (došao/nije došao), request change/cancel, notification prefs, consents, data export/delete request entry point. Therapist (`/radni-prostor`): today/upcoming, new requests queue with confirm/alternative actions, attendance marking, availability management, own profile edit (content_status workflow). Org admin: team, catalog, all org appointments (metadata level), manual appointment creation for phone bookings. TanStack Query only in these interactive areas.

**M2.5 — Email notifications & reminders (3–4 days)**
Events → notification jobs: request received (client+therapist), confirmed, alternative proposed, change, cancellations, reminders (T-24h, T-2h) — QStash delayed delivery + retry, delivery evidence, dedupe, reconciliation cron for stuck jobs. Unsubscribe applies to non-essential kinds only; service messages remain.

**M2.6 — Google Calendar Connect (4–7 days) — package 2B**
Per-therapist OAuth (minimal scopes; tokens encrypted server-side), free/busy pull → `external_busy_blocks`, mirror of `confirmed` appointments (create/update/delete), watch webhook + periodic reconciliation, connection states surfaced in therapist panel: `connected / sync_delayed / reauth_required / disabled`. Internal engine keeps working when Google fails (T15). Never import private event titles.

**M2.7 — Diagnostics baseline + pilot (1 week)**
Diagnostic framework per engines §18: read-only collectors returning `ok/warning/error/failed` with evidence IDs — initial set: overlapping active appointments; expired hold still blocking; confirmed appointment without event; alternative without expiry; participant/tenant mismatch; appointment↔calendar mirror mismatch (when 2B live); stuck notification jobs; user without membership; membership without user. Superadmin `/superadmin` shows platform health + findings (metadata only). Full Playwright critical flows (visitor→request→confirm; alternative flow; cancel per policy; therapist availability→confirm), backup/restore drill, staging pilot with the three therapists, fixes, production.

**M2.8 (optional) — Notify Me** per engines §7.7: subscription (therapist, window, expiry 60–90 days, consent), matching on `booking.slot_released`/`availability_expanded`, neutral email, claim window, fairness rules. Only if ordered in SoW.

### 6.3 API surface (v1, indicative — freeze operation_ids at M2.1 plan review)

```text
Public:    GET  /public/organization | /public/therapists | /public/therapists/{slug}
           GET  /public/services | /public/topics | /public/topics/{slug}
           GET  /public/availability?therapist&service&from&to
           POST /public/appointment-holds
Client:    GET  /me            POST /me/consents
           GET  /me/appointments           POST /appointments/{id}/request (finalize hold)
           POST /appointments/{id}/accept-alternative | /decline-alternative
           POST /appointments/{id}/change-request | /cancel
Therapist: GET  /therapist/appointments?status=…
           POST /appointments/{id}/confirm | /decline | /propose-alternative | /complete | /no-show
           CRUD /therapist/availability-rules | /therapist/availability-exceptions
           POST /therapist/calendar/connect|disconnect (2B)
Admin:     CRUD /admin/team | /admin/services | /admin/topics | /admin/therapist-profiles
           GET  /admin/appointments        POST /admin/appointments (manual)
Superadmin:GET  /superadmin/diagnostics    POST /superadmin/diagnostics/run
Webhooks:  POST /webhooks/clerk | /webhooks/qstash | /webhooks/google (2B)  — signature-verified, idempotent
```

### 6.4 Event catalog v1 (outbox `event_type`, payload = IDs + status only)

`user.registered`, `consent.granted`, `consent.revoked`, `appointment.requested`, `appointment.confirmed`, `appointment.alternative_proposed`, `appointment.change_requested`, `appointment.cancelled_by_client`, `appointment.cancelled_by_therapist`, `appointment.completed`, `appointment.no_show`, `appointment.expired`, `booking.slot_released`, `inquiry.received`, `calendar.sync_failed`, `notification.delivery_failed`.

### Acceptance criteria — Release 2

1. Two simultaneous requests can never both become active for the same therapist slot (proven by automated concurrency test + DB constraint).
2. Every new request requires explicit therapist confirmation or alternative; alternatives expire.
3. Client sees only own appointments; therapist only assigned; admin only own tenant — enforced by backend tests.
4. Google outage does not block internal booking; sync recovers via reconciliation (2B).
5. Reminders have delivery evidence, retry and diagnostics; no duplicate sends.
6. No sensitive free text stored or logged anywhere in the booking flow; audit trail on privileged mutations.
7. Backup/restore executed once on staging; all gates green; pilot feedback addressed; Anja's written acceptance.

---

## 7. Backlog — R3–R6 (context only; do not implement)

| Release | Core modules | Key boundaries already decided |
|---|---|---|
| **R3 Knowledge & Resources** | Content Engine (articles, review workflow, categories, SEO), ThemeLayout block registry for articles, Resource library (PDF/audio/video), Access Grant Engine (signed URLs, private S3-compatible storage) | Professional review required before publish; no AI-invented clinical articles; educational PDFs/worksheets only — standardized psychological instruments are out (license/legal project); reading in browser + download |
| **R4 Workshops, Programs, B2B** | Workshop/Program Engine (sessions, capacity, waitlist, enrollment, attendance, materials), parent programs (incl. anonymous question flow for workshops), B2B module (inquiry → offer → aggregated-only reporting) | Employer never sees individual usage; publish workshop only with confirmed date/facilitator/price/capacity/cancellation rules |
| **R5 Online sessions, messaging, payments** | Meeting-link handling on confirmed appointments (external provider, no recording/transcription), administrative appointment/program threads (bounded, not therapy chat), Payment abstraction: Manual → PayPal Business (workshops/diaspora first) → Serbian bank/PSP hosted checkout; entitlements + reconciliation | Payment receiver/invoicing model must be confirmed first (S8); card data never touches our servers |
| **R6 Business OS** | Analytics event catalog + owner dashboards (allowed metrics table in Proposal §7), full Diagnostic Engine + repair actions (separate, audited), Marketing Engine (consent-first newsletter, segments per engines §10.2 restrictions, campaigns; AI Content Studio strictly on-click with diff/preview), Plan & Feature Registry + gates (`canUse(featureKey)` FE, authoritative BE) | No mental-state metrics; no marketing segments derived from individual counseling use; AI never auto-publishes |

---

## 8. Multi-tenant posture (now → R7)

Build every tenant-owned table with `organization_id` and scope every query from day one (already required by rules §11) — that is the entire multi-tenant investment allowed before R7. No tenant onboarding UI, custom domains, tenant theming, subscription billing, or cross-tenant features before the SaaS decision gate (after ≥ 8–12 weeks of internal production use).

## 9. Superadmin scope (Milan)

R2 delivers: diagnostics dashboard (primary screen), org/user integrity view, notification/job health. R6 adds: plans/feature registry, subscription/trial administration, provider usage & cost view, audit/security events, time-bound support access. Superadmin never gets routine access to private client content; metadata-first everywhere (engines §24).

## 10. Design & content rules

- Visual system: modern, minimalist, warm, editorial; palette dark forest green / sage / pale meadow / warm beige / coffee brown / warm white; generous whitespace; no distressed-person imagery, no medical clichés, no aggressive red (Proposal v1.1 §3 „Vizuelni pravac"; also `archive/PRODUCT_CONTEXT.md` §12).
- The shipped homepage design is the reference; extend its tokens/primitives — do not restyle ad hoc.
- All public copy in Serbian Latin ijekavica following Anja's authored style; developers/AI may restructure copy but never invent credentials, prices, dates, or clinical guidance; publication requires `approved` content status by the named owner.

## 11. Guardrails (hard rules — apply to every release)

Never build or store: anamnesis, diagnoses, therapy notes, session recordings/transcripts, mood journals, unrestricted therapist-client chat, AI therapy/diagnosis/risk scoring, automated „mental state" conclusions, marketplace features, adolescent self-service. Never log or emit in events/analytics: quiz answers, reasons for coming, message bodies, health-related free text, tokens. Health-related text never in URLs/query strings. All public confidentiality statements must reflect real legal exceptions and carry the crisis disclaimer once approved (S5). Frontend hiding is never authorization. Every risky multi-model workflow ships a read-only diagnostic collector in the same PR (rules §21).

## 12. Definition of Done & quality gates (every PR)

Frontend: `npm ci && npm run typecheck && npm run lint && npm run format:check && npm run test && npm run build && npm run test:e2e`
Backend: `uv sync --locked && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest && uv run alembic upgrade head && uv run alembic check`
Contract: OpenAPI export deterministic; `npm run api:generate` produces zero diff in CI; contract drift fails the build.
Plus per-milestone acceptance criteria, security/tenant tests where the milestone touches authorization, and the §24 completion report.

## 13. STOP list — open decisions (never guess; ask CTO, who coordinates with Anja)

| ID | Decision | Blocks |
|---|---|---|
| S1 | **OPEN** — Written confirmation of each therapist's exact professional title/certification wording (Marjan's new bio still says „pod supervizijom"; all three currently carry it in `homepage.ts`) | publishing credentials (R1.5), `/tim/[slug]` |
| S2 | ✅ **RESOLVED 2026-07-17 (D-006): „Marjan Janković"** → slug `marjan-jankovic`. ⬜ Still open: final cities/locations wording (O-02) | profile slugs unblocked; `/o-nama` still waiting |
| S3 | Adolescent/student price: amount, criteria, which therapists, online/in-person | price display extension |
| S4 | Adolescent consent/safeguarding model | any adolescent self-service (post-R2) |
| S5 | 🟡 **PARTIAL** — direction set 2026-07-17 (D-008): platform not liable; therapists take responsibility as independent entrepreneurs registered in APR; pages = privacy, terms, cookies, booking rules; informative tone. **Not legally approved.** Still open (O-03): (1) verify each therapist's APR registration — it is a factual claim in legal text; (2) **crisis-disclaimer wording + local resources (T11) still missing**; (3) lawyer must confirm the liability clause is enforceable | production legal pages (R1.5) |
| S6 | First workshop: date, facilitator, price, capacity, cancellation rules | workshop publication |
| S7 | Final cancellation/late/no-show policy (draft: 24 h, full charge after, lateness shortens session) | M2.3 policy seed |
| S8 | Payment receiver & invoicing model (who issues invoices for sessions/workshops/tenant subscriptions) | R5 |
| S9 | Meeting-link provider per therapist (Google Meet/Zoom) + fallback procedure | R5 (link handling on confirmed online appointments) |
| S10 | 🟡 **PARTIAL** — resolved 2026-07-17 (D-007): footer = legal links (privatnost, uslovi, kolačići, pravila zakazivanja) + quick links (tim, radionice, rad sa kompanijama); **logo = the current one**. No longer a launch blocker for footer structure. ⬜ Still open (O-06): contact emails, phone, social links, location addresses | `/kontakt`, Resend (`info@`/`termini@`), JSON-LD, R1.5 |
| S11 | Guided-selection question set final review by the team (current quiz is the draft) | R1.2 sign-off |
| S12 | Google Calendar: which calendar per therapist, chosen scopes | M2.6 |

## 14. Environments & secrets

| Resource | Preview (`feature/*`) | Staging (`staging`) | Production (`main`) |
|---|---|---|---|
| Frontend | Vercel preview | Vercel staging | Vercel prod |
| Backend | shared staging API or ephemeral | Railway staging | Railway prod |
| PostgreSQL | staging branch/db | staging db | prod db (backups + tested restore) |
| Clerk | staging app | staging app | prod app |
| Resend | test sender | staging sender | verified domain |
| Redis/QStash | staging | staging | prod |
| Secrets | never production; `.env.example` only in repo; secret manager per platform | | |

---

*End of master plan v1.0. Update this document (and PRODUCT_DECISIONS.md) whenever a STOP item is resolved or a milestone is accepted.*
