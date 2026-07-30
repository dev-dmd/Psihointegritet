# ADR-017 - Rich Text Authoring Format, Document Import and Slot Schemas

**Status:** Accepted
**Date:** 2026-07-29
**Decision owners:** Milan (CTO), recorded through D-046
**Supersedes nothing.** Extends ADR-016 with the authoring contract its editor phase (CG-C) presupposed.

## Context

ADR-016 opened `modules/content` and fixed persistence, lifecycle and publication authority, but deliberately left one thing undefined: **what a body of text actually is**. `ContentRevision.slot_data` is a generic JSON column, and `CONTENT_MODEL_MATRIX_v0.1.md` §8 reserved field names without fixing their shape. CG-B2 hit the same gap from the other side — its Nalaz 3 records that `LIMIT-002` cannot be enforced at all until the slot payload shape exists.

Two concrete authoring requirements now force the decision:

1. **Legal and documentation pages.** The team receives privacy policy, terms, cookie policy and booking rules as Word documents from a lawyer, or as pasted text. The published page must render real document structure — headings, ordered and unordered lists, bold, italic, underline — not a flattened paragraph blob. The current `LegalDocumentRevision.body` is a plain `Text` column edited through a plain textarea, which cannot carry that structure.
2. **Main marketing pages.** Content must be entered section by section with enforceable ceilings: how much text, how many paragraphs, how many images per section, plus SEO metadata per page.

A third requirement is deferred but shapes the design: an AI layer for spelling, phrasing and SEO metadata suggestions. It is not built here, but building the authoring format without a seam for it would make it a rewrite rather than an addition.

## Decision

### 1. `RichDoc` v1 is the canonical rich-text format — structured JSON, not HTML and not Markdown

```ts
type RichDoc = { schemaVersion: 1; blocks: RichBlock[] };

type RichBlock =
  | { id: string; type: "heading"; level: 2 | 3 | 4; spans: Span[] }
  | { id: string; type: "paragraph"; spans: Span[] }
  | { id: string; type: "list"; ordered: boolean; items: { id: string; spans: Span[] }[] }
  | { id: string; type: "quote"; spans: Span[] };

type Span = { text: string; marks?: Mark[] };
type Mark = "bold" | "italic" | "underline" | { type: "link"; href: string };
```

Rejected alternatives and why:

- **HTML string.** Rendering requires `dangerouslySetInnerHTML`, which makes sanitization a permanent adversarial race on a platform that publishes legal texts and consent documents. Per-rule validation would require parsing, and `fieldPath` addressing for findings would have nothing stable to point at.
- **Markdown.** Has no underline, which the legal-fidelity requirement needs, and reintroduces the same sanitization problem at render time if HTML passthrough is allowed.

The JSON block model makes XSS structurally impossible rather than filtered away: the renderer is an exhaustive `switch` over an allowlisted node union. **No `dangerouslySetInnerHTML` anywhere in the content renderer** — this is a gate, not a preference.

### 2. Every block carries a stable `id`

Generated at creation, preserved across edits, never reused. This is the seam that lets a later AI suggestion, a validation finding or a review comment address "this paragraph" without rewriting or re-keying content. Adding IDs later would mean migrating every stored revision.

### 3. `H1` is not authorable inside a body

Page headings come from the `title` slot under the existing `pageH1` limit (80 chars). Body headings start at `H2`. A Word "Heading 1" is demoted to `H2` on import and the import report says so. One `H1` per page is both an SEO and an a11y invariant; permitting authored `H1` would mean `content:check` had to report it as an error on every publish.

### 4. `underline` is an allowed mark

Requested for fidelity to signed paper documents. The renderer styles it distinctly from links (links additionally carry colour), and a warning-severity rule flags an underlined span containing a URL-like string, since that should be a real link.

### 5. Tables are not in v1

Word tables are dropped on import with a warning-severity `IMPORT` finding naming the loss. **The renderer must skip unknown block types without throwing and surface a panel warning** — this forward-compatibility rule is what makes adding a `table` block later additive instead of a migration.

### 6. Images do not appear inside prose

Images are slot-level `AssetReference` values with mandatory `alt` (existing `imageAlt` limit, 150 chars), stored through Cloudinary. Word-embedded images are dropped on import with a warning telling the author to add them through the gallery. Allowing pasted images would smuggle in assets with no alt text and silently fail the accessibility gate.

### 7. Import runs on the backend, accepts `.docx` only, and shares one normalizer with paste

```
.docx        → mammoth → HTML ┐
paste (rich) →           HTML ├→ allowlist normalizer → RichDoc
paste (plain)                 ┘  (paragraph splitter)
```

- **Backend, not the browser.** A `.docx` is a ZIP; parsing untrusted binaries is a remote-code-execution and zip-bomb surface that belongs server-side under explicit size and block-count limits. `ARCHITECTURAL_RULES_REVISED.md` §1.1 independently forbids this class of work in Next Route Handlers.
- **One normalizer for all three inputs**, so pasted and uploaded content cannot diverge. Unknown tags are unwrapped (children preserved, tag discarded); unknown attributes are dropped. `<script>` does not survive because it is absent from the map, not because it is stripped.
- **`.doc` (legacy binary) is refused** with an actionable message: save as `.docx` and retry. Supporting it requires headless LibreOffice in the backend image — a permanent ~500 MB runtime and a large attack surface — to save the author one Word menu action.
- **PDF is not a structured import path.** PDF carries positioned text runs, not heading semantics; promising preserved structure is a promise that cannot be kept. PDF content is pasted as text and reformatted in the editor.

### 8. Import reports through the existing findings model

New rule prefix `IMPORT-0xx`, existing severity vocabulary (`info | warning | error` — D-032), existing `ruleId`/`fieldPath` shape. Import never silently discards: the panel shows what was converted, what was demoted and what was lost. Findings carrying `requiresApproval` flow into the `dynamic_approvals()` machinery CG-B2 already implements, so an import that loses content can require a fresh signature.

### 9. Slot schema registry defines section structure

```ts
type SlotFieldSpec =
  | { kind: "text"; limit: ContentCharacterLimitKey; required: boolean }
  | { kind: "rich"; maxBlocks: number; allowedBlocks: RichBlockType[]; maxChars: number }
  | { kind: "image"; required: boolean }
  | { kind: "imageList"; min: number; max: number }
  | { kind: "cta" }
  | { kind: "repeater"; min: number; max: number; item: Record<string, SlotFieldSpec> };
```

Each slot in `templateRegistry` gains a field specification. This closes CG-B2 Nalaz 3: `LIMIT-002` becomes enforceable because a slot payload finally has a declared shape.

Two consequences worth stating explicitly:

- **The editor renders generically from the registry.** One component reads the schema and draws the fields; there are not nine hand-written template editors. Adding a slot later is a registry entry plus a fallback mapping, with no new UI.
- **Both sides validate against the same registry**, proven by a repository-level JSON fixture exactly as CG-A2 established for publication rules. "How much text, how many paragraphs, how many images" is defined once, not once in the UI and once on the server.

### 10. Editor is Tiptap; storage is `RichDoc`, not Tiptap's native JSON

Tiptap (ProseMirror) is used headless with its schema restricted to exactly the `RichDoc` node and mark set, so the editor cannot produce content the validator would reject. A bidirectional adapter maps Tiptap JSON ↔ `RichDoc`.

Storing Tiptap's native document was rejected: it would couple the database to editor internals, force the Python validator to understand ProseMirror's shape, and require an extra extension for the stable block IDs decision 2 depends on. The persisted format must outlive the editor library choice. The cost is one adapter plus its tests, paid once.

### 11. SEO fields are unchanged; the editor gains a live preview

`SeoFields` (`title`, `description`, `ogImageAssetId`), the `seoTitle`/`seoDescription` limits and `discoverability.ts` all stay as they are. The editor adds a rendered search-result snippet and OG card above the slots. This is a UX addition with no model change, and it is the difference between filled-in and well-filled-in metadata.

### 12. AI layer seam — designed now, implemented later

Not built by this ADR. The seam it fixes:

- Suggestions live in their own table (`revision_id`, `block_id`, `kind`, `original`, `proposed`, `rationale`, `model`, `status`) and are **never written into `slot_data`**.
- Accepting a suggestion is an ordinary human edit, attributed to the human, bumping `lock_version`. The audit trail stays truthful about who wrote what.
- A suggestion is invalidated when its block's text hash changes.
- AI runs on draft revisions only, never on published content, and never publishes (R6 invariant: AI never publishes on its own).
- **`ContentEntry` carries a `dialect` field (`ekavica | ijekavica`) that feeds the prompt.** D-017 records that Anja Stamenković's authored content is deliberately ijekavica. A dialect-blind spellchecker would "correct" it to ekavica and regress a documented decision on first run.

## What this ADR does NOT open

- No table blocks, no inline images, no embeds, no footnotes in `RichDoc` v1.
- No `.doc` or structured PDF import; no headless LibreOffice in the backend image.
- No media library — images remain slot-level asset references (R3 keeps the library).
- No AI implementation: no model calls, no suggestion table migration, no prompts. Only the addressing seam (stable block IDs, `fieldPath`, `dialect`).
- No change to lifecycle, severity vocabulary, check order or publication authority (D-029, D-032, D-044 stand).
- No article model and no scheduled publishing — R3, unchanged from ADR-016.

## Consequences

- `LegalDocumentRevision.body` migrates from `Text` to a `RichDoc` JSON column. Existing plain-text revisions convert to single-paragraph documents; published revisions are never rewritten in place, so the conversion produces new drafts where content actually needs structure.
- `mammoth` joins the backend dependencies; Tiptap joins the frontend. Neither has a runtime peer beyond the app itself.
- Upload introduces the first authenticated file-ingestion endpoint, which needs its own size limit, MIME check and rate limit — this is new attack surface and is treated as such rather than as a form field.
- CG-C1's scope grows to include the slot schema registry; the generic editor makes CG-C2's live validation a display concern rather than a second rule engine, as D-044 requires.
- The forward-compatibility rule in decision 5 is load-bearing: a v1 renderer that throws on an unknown block would turn any future format extension into a coordinated deploy.

---

# Amendment 1 — 2026-07-29

**Recorded through D-047.** Four corrections found while sequencing the work. The original text above stands except where noted here; the amendment is kept separate rather than rewritten inline so the reason for each change stays visible.

## A1.1 — `dialect` is modelled at the wrong grain in §12, and D-017 proves it

§12 puts `dialect` on `ContentEntry`. That is wrong, and the counter-example is already in the repository.

D-017 records that Anja Stamenković's `quote`, `bio` and `cardExcerpt` are deliberate ijekavica, while her `title`, `areas`, `formats` and `badge` stay ekavica — **in the same record**, because terminology is not personal speech. `frontend/src/content/therapists.ts` shows exactly this: `quote: "Vjerujem da svaka osoba…"` next to `areas: ["Anksioznost i depresija", …]`.

An entry-level field cannot express that record. Corrected contract:

- `dialect` is resolved **per field or slot**, with an entry-level value acting only as the default.
- Values: `ekavica | ijekavica | preserve-source`. The third exists for imported text whose dialect must not be normalized in either direction.
- `preserveVoice: true` is a separate flag from dialect — it suppresses stylistic rewriting even when spelling correction is allowed.

This correction stands whether or not the AI layer is ever built, because the same grain governs any future spellcheck, translation or style tooling.

## A1.2 — Of the five proposed interfaces, exactly one is written

`ARCHITECTURAL_RULES_REVISED.md` §25 prohibits "empty placeholder abstractions added 'for future use' without a current contract". Applied case by case:

| Interface | Decision | Reason |
|---|---|---|
| `ContentPatch` | **Written, narrowly** | `.docx` import has a genuine present-day consumer: §8 already requires the import report to be shown *before* the revision is written, which is a preview diff — that is a patch. |
| `ApprovalDecision` | **Not written** | Already exists three times: `ContentReviewDecision` (`modules/content/models.py`), `ApprovalEvidence`/`ApprovalRequirement` (`content-governance/types.ts`), `ApprovalCapability` (`shared/domain/publication.py`). A fourth name is the drift CG-B1 just removed. |
| `AIReviewFinding` | **Not written** | AI findings reuse the existing finding model under a new prefix `AI-0xx`, exactly as §8 ruled for `IMPORT-0xx`. A separate type means two finding renderers and a second home for the severity vocabulary (D-032/D-044). |
| `LayoutProposal` | **Prose only** | No consumer. Nothing near-term proposes a layout, and `CONTENT_MODEL_MATRIX_v0.1.md` §4 currently forbids what it would propose. |
| `AssetPlacementSuggestion` | **Prose only** | Cannot be written correctly: §6 keeps images out of `RichDoc`, so there is no position in the document model for a placement to address. |

`ContentPatch` is deliberately **not** a general JSON-Patch type. A generic patch would let a later AI writer address `slot_data` directly, which §12 forbids. Its shape is bounded to what import produces:

```ts
type ContentPatch = {
  target: { revisionId: string; slotPath: string };
  blocks: RichBlock[];
  findings: ContentHealthFinding[];
  requiresApproval: boolean;
};
```

## A1.3 — The `body` column change is a new migration, never an edit to `20260726_0004`

The Consequences section says `LegalDocumentRevision.body` migrates from `Text` to `RichDoc` JSON but does not say how. `backend/railway.json` sets `preDeployCommand: "alembic upgrade head"`, so `20260726_0004` has already been applied on every deployed Railway service. Editing it would leave applied environments permanently inconsistent with the migration history. The change ships as its own revision.

## A1.4 — Tiptap: MIT packages only

§10 selects Tiptap without bounding which packages. The core and every extension this design needs (`StarterKit`, `Underline`, `Link`) are MIT. **No `@tiptap-pro` package enters the dependency tree** — the paid tier covers collaboration, comments and AI features, none of which are in scope, and all of which would create a licence dependency for functionality this ADR does not authorize.

## What Amendment 1 does NOT change

Decisions §1–§9 and §11 stand as written: `RichDoc` v1 as canonical format, stable block ids, no authored `H1`, `underline` allowed, no tables in v1, no images in prose, backend-only `.docx` import with a shared normalizer, the `IMPORT-0xx` finding model, the slot schema registry, and SEO fields unchanged. The negative scope in "What this ADR does NOT open" is unchanged — in particular, **no AI implementation**: this amendment fixes the shape of the seam, it does not open the layer.

---

# Amendment 2 — 2026-07-30

**Recorded through D-050.** §9's `SlotFieldSpec` sketch was a placeholder — a name and a rough shape, written before any template's actual field content had been checked against the real pages. CG-C1 implementation planning checked it against `static-provider.ts`, the rendered pages and the existing `cta.ts`/`AssetReference`/`CtaReference` contracts, and found seven problems that would have become a breaking `slot_data` migration if built as originally sketched. This amendment replaces §9 in full; nothing else in this ADR changes.

## A2.1 — A slot needs a state above its fields: `editable | computed | unmodeled`

§9 implied every slot has fields. It does not. Filtered/derived content (`service_detail.related`'s therapist list, formatted prices, `pricing_page.service_prices`) has no authored field at all — it is computed at render time. Other slots (`support_area` — no page, no `ContentEntity`, no data anywhere in the repository; parts of `static_information.intro`/`prose`) have no evidence of a shape yet. Collapsing both into an empty `fields: {}` under §9's original `SlotFieldSpec` is a real defect: the backend cannot tell "reject any payload, this is derived" from "we don't know yet, don't reject, don't invent" from the same empty object, and the editor cannot show the right message for either.

```ts
type SlotSpec =
  | { editability: "editable"; required: boolean; visibility: "fixed" | "toggleable"; fields: Record<string, SlotFieldSpec> }
  | { editability: "computed"; reason: string; fields: Record<string, never> }
  | { editability: "unmodeled"; reason: string; fields: Record<string, never> };
```

The backend rejects any `slot_data` payload targeting a `computed` slot. The editor renders three different states, not one blank form.

## A2.2 — LIMIT-002's enforcement point was mis-specified in the original CG-B2 handoff, and CG-C1 planning repeated the same mistake before catching it

CG-B2's own Nalaz 3 (`documentations/CMS_TODO.md`) already states the correct rule: `maxOptionalSections` counts repeatable items **inside** a slot, not distinct optional slot **keys**. A draft of the CG-C1 implementation plan proposed counting keys present in `slot_data` against `maxOptionalSections` anyway — exactly the interpretation Nalaz 3 had already ruled out, because an editor can pre-initialize every optional slot as an empty object (key present, section inert), and a single FAQ slot with nine items is the real problem regardless of how many slot keys exist.

`maxOptionalSections` is removed from `TemplateDefinition`/`TEMPLATE_REGISTRY` — it has no field-shape-aware meaning to check. Authority moves to `min`/`max` on each `imageList`/`ctaList`/`repeater` field. `LIMIT-002` becomes: for every collection field present in a revision's `slot_data`, its item count must fall within that field's declared `[min, max]`.

## A2.3 — `inherit | override | hidden` is part of the slot payload contract, not deferred to CG-C3

D-038's field-level fallback needs three distinguishable author intents per slot, not the binary "empty means fallback" the original text assumed:

```ts
type SlotOverride = { mode: "inherit" | "override" | "hidden"; fields?: Record<string, unknown> };
```

A `required` slot cannot be `hidden`; a `toggleable` (optional) slot can. `inherit` uses the full static fallback. `override` uses the authored fields, and a field missing *within* an override still falls back to its static counterpart where one exists — `override` is not all-or-nothing per slot. An empty string normalizes to absent at save time rather than persisting as a hollow override. Fixing this now, before any `slot_data` exists in the database, avoids a payload migration; CG-C3 becomes a display concern (show the state) rather than a contract-design task.

## A2.4 — `number` did not exist in §9 and cannot be one generic kind

§9 had no numeric kind at all — price, session count, participant count and duration all needed one, and a single `{ kind: "number" }` would accept negative prices or fractional session counts with no domain guard. Split in two:

```ts
type NumericFieldSpec =
  | { kind: "integer"; min: number; max: number; step?: number; unit?: "minute" | "session" | "participant"; required?: boolean }
  | { kind: "money"; currency: "RSD"; min: number; max: number; required?: boolean };
```

Price is stored as a raw number; `formatRsd()` remains a render-time concern, never a stored string.

## A2.5 — `repeater.item` cannot itself contain `repeater`, `imageList` or `ctaList`

§9's `item: Record<string, SlotFieldSpec>` is recursive by construction, which technically permits `repeater → repeater → repeater`. That is the first step toward a free page builder — exactly what `CONTENT_MODEL_MATRIX_v0.1.md` and D-047 ("ne razvijati CMS, Layout Engine i AI Engine paralelno") rule out. No slot evidenced in `static-provider.ts` (FAQ items, packages, a therapist's additional services) needs more than one level. `repeater.item` is typed as `Record<string, NonRepeaterFieldSpec>` — the three collection kinds are excluded from appearing inside a repeater's item shape.

## A2.6 — `cta` addresses the existing CTA action registry; it is not a free label+href form

§9 listed `{ kind: "cta" }` with no further shape, which reads as an open label/URL pair. `CtaReference`/`CtaAction` (`content-governance/types.ts`) and `cta.ts`'s `CTA-001`/`CTA-002`/`CTA-003` validation already govern every CTA on the site. A generic href field would let an editor bypass that registry and hand-type a broken or arbitrary URL.

```ts
type CtaFieldSpec = { kind: "cta"; allowedActions: CtaAction[]; targetType?: ContentType; required?: boolean };
```

The stored payload is `{ action, label, targetId? }`; the URL is generated by the existing registry, same as every other CTA on the site.

## A2.7 — `image` is `{ assetId, alt, decorative? }`, matching `AssetReference`, not a bare string

§9's `{ kind: "image"; required: boolean }` said nothing about the value's shape. `AssetReference` already exists in `content-governance/types.ts` with `alt` and `decorative`, and `ASSET-003` already requires `alt` on any non-decorative image. A bare `assetId: string` field would silently drop the alt-text requirement the validator already enforces elsewhere. Until an asset library exists (ADR-018, Faza 2), the editor's stopgap is two text inputs (`assetId`, `alt`) plus a `decorative` checkbox — not a single field.

## What Amendment 2 does NOT change

§1–§8, §10–§12 of the original decision stand: `RichDoc` v1, stable block ids, no authored `H1`, underline, no tables/inline images in v1, backend-only `.docx` import sharing one normalizer with paste, the `IMPORT-0xx` finding model, Tiptap with `RichDoc` as the storage format, unchanged `SeoFields`, and the AI-layer seam. This amendment corrects only §9's slot schema shape, before any code or stored `slot_data` existed against it.
