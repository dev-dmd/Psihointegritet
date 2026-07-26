# ADR-016 - CMS Core and Content Governance Before R2, Opening `modules/content`

**Status:** Accepted
**Date:** 2026-07-26
**Decision owners:** Milan (CTO), recorded through D-043, D-044 and D-045

## Context

D-038 turned the CMS from an R3 feature into a launch prerequisite: existing copy became a fallback layer that the team overrides through the admin panel. ADR-014 then carved out the first bounded exception — a versioned legal-document registry in `modules/privacy` — while explicitly keeping `modules/content` reserved for R3.

The team still cannot edit therapist profiles, contact data, service copy or homepage sections. Building R2 Booking on top of hand-edited TypeScript files means booking flows would depend on unreviewed copy and mutable slugs. The CTO decided the content layer must stabilize first.

## Decision

1. **`modules/content` opens now** for CMS Core: persistence, review and publication of the six governed content types already defined by R1.4.i (`static_page`, `service`, `therapist`, `program`, `company_plan`, `package_offer`).
2. Backend aggregates mirror the proven `modules/privacy` shape: `ContentEntry` (stable identity, org + type + slug), `ContentRevision` (immutable once published; carries body fields, template slot data, approvals, validation snapshot), `ContentReviewDecision` (per-capability decision bound to one revision), `ContentPublicationEvent` (append-only audit). Field names follow the reservation in `CONTENT_MODEL_MATRIX_v0.1.md` §8 (`revisionId`, `createdBy`, `updatedBy`, `publishedAt`).
3. The lifecycle, severity vocabulary and check order are the ones fixed by D-029/D-032/D-044. No new statuses, no new severity words. The rule registry keeps its 13 prefixes and 32 rule IDs and gains only additive metadata (`version`, `requiresApproval`, `remediation`).
4. The public site reads through a provider resolver: a CMS-backed `ContentProvider` whose published revisions override static fallback entities **field by field** (D-038); an unfilled field renders the code fallback, and the fallback is never deleted.
5. Publication authority is the backend. The frontend runs the same rules for instant feedback (as `legal-documents.ts` mirrors `publication.py`). Frontend and backend evaluators are separate implementations of the same governed contract. A single repository-level JSON fixture set defines observable parity and is executed by both Vitest and Pytest. Backend publication authority remains unchanged.
6. A published revision can never be deleted, only archived (D-045). Hard deletion applies only to a draft revision. Published and archived revisions, review decisions and publication events are retained. Restoring archived content creates a new draft revision and never reopens the immutable archived revision.

## What this ADR does NOT open

- No article model, no knowledge library, no access grants, no media library — R3.
- No scheduled publishing (`scheduled` state stays out; Engines §9.2 reconciliation deferred to R3).
- No AI content generation, rewrite, or SEO scoring — R3 (E3).
- No Content Health dashboard in Control Center beyond the editor's own validation display; the central Diagnostic Engine stays out (D-032 negative scope).
- No new Clerk role semantics: approval capabilities remain content requirements (D-033); real reviewer identity attaches when staff accounts exist.
- No Booking, payment or R5 structures.

## Consequences

- D-043 supersedes the ordering clause of D-038 ("Ne menja D-028"); the full Content Engine remains R3, but its Core lands pre-R2.
- Migrations for `modules/content` are written alongside the models but applied together with the deferred LD-5 migration once Clerk accounts exist; until then the editor runs against the dev instance or in-memory seeds behind the existing pattern.
- The first published revision flips `listPublished()` from empty and changes sitemap/robots output — this is deliberate and gated by approval evidence (D-038 privremeni CTO potpis mechanism until real reviewers exist).
- Archiving a required legal document immediately closes the dependent Intake readiness gate when no other eligible published revision satisfies that requirement.
- R3 absorbs CMS Core rather than replacing it, exactly as it absorbs the ADR-014 registry.

Detailed contracts for deletion/archival semantics, revision reissue on `approved→draft`/`archived→draft`, the severity/approval/gate-result formula, evaluator stage ordering, the fixture file path and schema, and the `PanelErrorResource` shape are locked in `CMS_CORE_CONTENT_GOVERNANCE_PLAN_v0.1.md` §"Zaključani ugovori Faze A" (A.1–A.6), not restated here.
