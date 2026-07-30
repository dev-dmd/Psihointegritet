# ADR-018 - Documents, Assets and Access Policy

**Status:** Accepted
**Date:** 2026-07-29
**Decision owners:** Milan (CTO), recorded through D-047, D-048 and D-049
**Extends** ADR-016 (which opened `modules/content` for the six governed types) and ADR-017 (which fixed the authoring format). **Supersedes nothing.**

## Context

D-047 split the CMS into four content kinds with different editing models. Two of them — downloadable documents (PDF guides, worksheets) and video — are not text and cannot be expressed as `RichDoc`. They need an asset aggregate, a place to live, a storage strategy and an access rule.

ADR-016 explicitly deferred all of this: *"No article model, no knowledge library, no access grants, no media library — R3."* This ADR does not overturn that. It authorizes the **narrow slice** that the legal-document and static-page flows actually need, and writes down the boundaries for the rest so the R3 work has a contract to build against instead of a blank page.

Three forces constrain the design and are not negotiable here:

- **Money is R5.** D-031 and BDS-014 block purchases, credits, subscriptions, payments, invoices and refunds — *"bez R2 tabela, migracija, endpointa, UI-ja ili provider integracija."* `PUB-003` enforces it as a CI **error**.
- **Company entitlement is R4.** BDS-013, and the seam requires ADR-015, which is still unwritten.
- **There is no `resources` or `media` module.** The approved module list (`ARCHITECTURAL_RULES_REVISED.md` §13, `technical-documentation-architecture-v0.3.md` §4.2) does not contain one, and `infrastructure/storage/` is a **port** (rules §14.4), not a domain owner.

## Decision

### 1. `ResourceAsset` lives in `modules/content`, not a new module

Not for tidiness — because it must share the D-029 lifecycle, `ContentReviewDecision`, `ContentPublicationEvent` and `check_publishable()`. Those were consolidated into `shared/domain/publication.py` by CG-B1 precisely to remove a third copy of the lifecycle. A new `modules/resources` would reintroduce it, and would also require scaffolding a module that the approved list does not contain (master plan §3).

`VideoAsset` is **not** created. No provider is chosen, no video content exists, and nothing would consume it. "A provider adapter with no provider" is the rules §25 anti-pattern verbatim. Its boundaries are described in §7 below as prose only.

### 2. `access_policy` carries only tiers that can actually be evaluated today

```
public | registered | staff_only
```

Rejected: the full six-value enum (`PUBLIC/REGISTERED/SUBSCRIBER/PURCHASED/COMPANY_ENTITLEMENT/ADMIN_ONLY`) with paid tiers hard-denying. A persisted column containing `PURCHASED` **is** a table and a migration — exactly what D-031 blocks — and it denies with no purchase record to point at, so support cannot distinguish "not entitled" from "lookup broken". It also creates gravity toward a "Kupi" button, which trips `PUB-003` and burns a build.

`staff_only` resolves through the existing `resolve_staff_actor()` in `modules/guidance/authorization.py`. **No new role semantics** — ADR-016 forbids them.

### 3. Access is decided by a port that returns a reason, never by an enum comparison at the router

```
resolve_access(resource, actor) -> Grant | Denial{reason_code}
```

R5 adds `subscriber` as a policy value and `payment_required` as a reason code. Both are additive: no migration of existing rows, no change to call sites. The port is an application-layer decision materialized as a short-lived grant; the policy value is never a field the frontend acts on (rules §10.3 — authentication is not authorization; frontend hiding is never authorization).

### 4. `priceId` is not a field on `ResourceAsset`

It would be a foreign key to a table that must not exist before R5. R5 adds it.

### 5. Storage is split by threat model, and the split is explicit

| Content | Store | Why |
|---|---|---|
| Public marketing images | Cloudinary CDN | Already the ADR-017 §6 decision; public by nature; wants CDN and transforms |
| Gated / downloadable documents | Private object bucket via `infrastructure/storage/` | Must never be publicly readable; the application is the only reader |

The bucket is **private**. Unguessable keys on a public-read bucket is security by obscurity and ends up indexed. Note that `cloudinary` is currently an unused dependency and `next.config.ts` `images.remotePatterns` allows only `img.clerk.com` — neither path exists yet, and whichever lands first must add its own configuration.

### 6. Download is a consumed grant, not a token in a URL

```
POST /resources/{id}/download-grant   -> { grantId, expiresAt }
GET  /resources/{id}/download          (grant redeemed server-side)
```

Rejected: `GET /downloads/{shortLivedToken}`. A bearer token in a URL path is written to proxy logs (rules §19 forbids tokens in logs), persists in browser history, and is trivially shareable. It also breaks HTTP range requests, so any resumed or multi-connection download fails.

The grant is single-use, TTL 60–120 s, bound to `resource_id` + `user_id`, with `jti` consumed at redemption. **Not bound to IP** — mobile networks rotate addresses mid-download. The filename stays out of the path.

Every request re-checks: tenant, actor, access policy, resource status, grant validity. The real IDOR surface is the `/resources/{id}` metadata endpoints and the bucket, not the download URL.

### 7. Boundaries recorded, not built

- **`VideoAsset`** — when it lands it is an asset row plus a provider adapter, with the same access policy and the same public card shape (title, teaser, cover, duration, author, topic). The provider is chosen when scope, privacy and expected viewing volume are known, not before. Engines §15.2 already bars recording, transcripts and AI analysis of *sessions*; that is a separate concern from educational video and must not be conflated.
- **`previewPolicy`** — see §8. Not built in this slice.
- **Paid and company tiers** — R5 and R4 respectively, additively, per §2–§4.

## What this ADR does NOT open

- No purchase, credit, subscription, payment, invoice or refund model, field or UI — R5 (D-031, BDS-014, `PUB-003`).
- No company entitlement — R4 (BDS-013), and it needs ADR-015 first.
- No `VideoAsset` table, adapter or player.
- No media library UI — ADR-016 and ADR-017 both keep it in R3.
- No article model — R3; see ADR-019 when written.
- No Google Drive API integration (D-049): files arrive by plain upload.
- No new backend module, and no new role semantics.

## Consequences

- `infrastructure/storage/` gets its first real consumer — but **not** from `.docx` import. CG-B8 converts and discards under a size limit, which is a streaming parse needing no storage. Whether import source files are retained for audit is a separate decision, deliberately not taken here.
- `infrastructure/queue/` gets its first consumer from async scanning (§8). `@upstash/qstash` is already a dependency.
- The first authenticated file-ingestion endpoint is CG-B8 (ADR-017); this ADR adds the second class of ingestion and inherits the same limits: magic-byte sniffing, size caps, decompression-ratio limits, rate limiting.
- `PUB-003` continues to guard the money boundary; nothing here relaxes it.

## Technical constraints recorded with the decision

1. **`previewPolicy` as originally imagined is not buildable.** A preview served from the same signed URL *is* the download. Real preview means server-side rasterization of the first N pages into a **separate derivative asset** — a native parser over untrusted PDF, the same class of risk ADR-017 §7 refused when it rejected headless LibreOffice. Preview is a pre-generated derivative or it does not ship.
2. **Watermarking is forensic, not preventive — and here it is a privacy hazard.** A watermark carrying a name or email inside a *therapy* resource means a leaked file discloses that a named person sought mental-health material — the category MP §11 and O-22 treat as most sensitive. If watermarking is wanted, use an opaque per-grant identifier resolvable only server-side.
3. **Antivirus and CDR never run in the request path.** Upload → quarantine → status `scanning` → worker → `clean | infected`. Nothing is downloadable while `scanning`. Streaming SHA-256 during write is cheap and stays inline; the scan does not.
4. **The client's `Content-Type` is not evidence.** Sniff magic bytes and reject on mismatch. A `.docx`, some PDFs and a zip bomb are all archive-shaped; the decompression-ratio limit applies to every accepted binary.
5. **`estimatedTime` is computed, never authored.** `RichDoc` yields exact block and character counts; an authored field drifts the moment anyone edits.
6. **There is no technical way to stop a user who legitimately views a document from saving or photographing it.** Access can be controlled, downloads logged, and a per-grant identifier embedded — non-copying cannot be guaranteed, and the product must not claim otherwise.
