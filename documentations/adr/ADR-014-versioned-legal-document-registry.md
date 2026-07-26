# ADR-014 - Versioned Legal and Consent Document Registry Before R3

**Status:** Accepted
**Date:** 2026-07-26
**Decision owners:** Milan (CTO), recorded through D-038 and D-039

## Context

The production Intake & Matching Engine is implemented but closed. `settings.intake_submission_ready` requires `intake_data_processing_notice_version` and `intake_request_acknowledgement_version` to be non-empty, and the backend rejects sensitive submissions until both are set. Those two strings are meant to identify legal texts that were never written, because writing them belongs to the owner and a lawyer, not to the development team (master plan §0, point 8).

Setting the env vars by hand would open the gate while `ConsentRecord.document_version` pointed at a text nobody approved. That is weak evidence of what a person actually agreed to, and it is the one place where the fallback pattern from D-038 is not safe: a fallback marketing paragraph is a cosmetic problem, a fallback consent text is an evidentiary one.

D-028 reserves CMS persistence, CRUD and editors for R3. Waiting for R3 would leave Intake closed for two more releases.

## Decision

1. A versioned document registry lands now, in `modules/privacy`, not in `modules/content`. `content` stays reserved for the R3 Content Engine.
2. The registry models two aggregates:
   - `LegalDocument`: a stable identity per document kind, scoped by organization;
   - `LegalDocumentRevision`: an immutable revision carrying body, locale, version label, publication status and approval evidence.
3. Revisions follow the D-029 publication lifecycle. Only a `published` revision is a valid consent target.
4. `settings.intake_submission_ready` resolves the expected consent versions from the published revisions instead of env strings. The env variables survive only as a local-development override and are no longer the production path.
5. Publishing a new revision of a consent document does not rewrite history. Existing `ConsentRecord` rows keep pointing at the version that was actually shown; the new revision applies to submissions made after it is published.
6. The registry stores document bodies. It does not store, infer or generate legal text. An empty registry means the gate stays closed and the public flow keeps its current pre-flag behaviour.

## Consequences

- The Intake activation gate stops being an ops task waiting on an email and becomes a product action: Anja publishes, the gate opens.
- The same registry later serves privacy policy, terms of use, cookie policy and booking rules, which D-038 moved out of the launch-blocking set.
- This is a deliberate, narrow deviation from D-028. It is a document registry with a publish action, not a Content Engine: no page composition, no sections, no scheduling, no media library, no article model.
- R3 will absorb this registry rather than replace it. Revisions, approval evidence and the lifecycle already match the D-029 contract that R1.4.i defined.
- Because publication now controls a legal gate, the publish action needs a real audit record from day one, unlike the in-memory activity feed used by the D-026 Feature Gates preview.

## Boundaries this ADR does not cross

- It does not approve any consent, retention or safety wording. Legal and Clinical still own BDS-011.
- It does not enable `intake_sensitive_submission_enabled`. That remains an explicit, separate operational step.
- It does not create Booking, payment or R5 financial structures.
