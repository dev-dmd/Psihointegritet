/**
 * RichDoc v1 — canonical rich-text contract (ADR-017, CG-B7).
 *
 * Structured JSON, never HTML or Markdown: the renderer in
 * `components/content/rich-text.tsx` is an exhaustive switch over this
 * allowlisted node union, so `dangerouslySetInnerHTML` never appears in the
 * content pipeline (ADR-017 §1 — a gate, not a preference).
 *
 * Mirrors `backend/src/psihointegritet/shared/domain/rich_doc.py` field for
 * field. Parity between the two is asserted by a shared fixture file, added
 * with the test pass deferred by D-047 (see CMS_TODO.md CG-B7).
 */

import type { ContentHealthFinding, ContentHealthSeverity } from "./types";

export const RICH_DOC_SCHEMA_VERSION = 1;

export type RichBlockType = "heading" | "paragraph" | "list" | "quote";

export type SimpleMark = "bold" | "italic" | "underline";
export interface LinkMark {
  type: "link";
  href: string;
}
export type Mark = SimpleMark | LinkMark;

export interface Span {
  text: string;
  marks?: Mark[];
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 2 | 3 | 4;
  spans: Span[];
}

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  spans: Span[];
}

export interface ListItem {
  id: string;
  spans: Span[];
}

export interface ListBlock {
  id: string;
  type: "list";
  ordered: boolean;
  items: ListItem[];
}

export interface QuoteBlock {
  id: string;
  type: "quote";
  spans: Span[];
}

export type RichBlock = HeadingBlock | ParagraphBlock | ListBlock | QuoteBlock;

export interface RichDoc {
  schemaVersion: 1;
  blocks: RichBlock[];
}

/** An empty document — the starting point for a new draft, never itself an error (see note in `validateRichDoc`). */
export function emptyRichDoc(): RichDoc {
  return { schemaVersion: RICH_DOC_SCHEMA_VERSION, blocks: [] };
}

/**
 * Stable block/list-item id. Generated at creation, preserved across edits,
 * never reused (ADR-017 §2) — this is the seam a later AI suggestion or a
 * validation finding addresses without rewriting content. Exported as an
 * overridable function, same injectable-generator pattern as
 * `features/workspace/legal-documents.ts`'s `generateRevisionId`.
 */
export function createBlockId(): string {
  return crypto.randomUUID();
}

function isLinkMark(mark: Mark): mark is LinkMark {
  return typeof mark === "object" && mark.type === "link";
}

// Same internal-path shape already enforced by validateRedirectRegistry in
// ./validation — kept as a local literal instead of importing, since that
// module additionally depends on this one once RICH-0xx findings are wired
// into entity validation (CG-C1), and a cross-import would be circular.
const INTERNAL_PATH = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]*$/;

/**
 * ADR-017: only `https://`, `mailto:` and internal routes are allowed.
 * `javascript:`, `data:` and any other scheme are rejected — RICH-003.
 */
export function isAllowedHref(href: string): boolean {
  if (href.startsWith("/")) return INTERNAL_PATH.test(href.split("?")[0] ?? "");
  if (href.startsWith("mailto:")) return href.length > "mailto:".length;
  try {
    const url = new URL(href);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

// A bare, unlinked URL sitting under an `underline` mark is very likely meant
// to be a link (RICH-004, warning — the author probably underlined a URL by
// habit rather than wrapping it as a link).
const URL_LIKE = /^(https?:\/\/|www\.)\S+$/i;

function spanText(span: Span): string {
  return span.text;
}

function blockSpans(block: RichBlock): Span[] {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "quote":
      return block.spans;
    case "list":
      return block.items.flatMap((item) => item.spans);
  }
}

/** Plain-text content only — marks are not counted, matching `normalizedLength` elsewhere in this package. */
export function richDocText(doc: RichDoc): string {
  return doc.blocks
    .flatMap((block) => blockSpans(block).map(spanText))
    .join(" ")
    .trim();
}

export function richDocTextLength(doc: RichDoc): number {
  return richDocText(doc).normalize("NFC").length;
}

/**
 * Plain paste (and the Phase-0 stopgap textarea in `screen-dokumenti.tsx`
 * before CG-C5's Tiptap editor lands): a blank line splits paragraphs,
 * nothing is guessed as a heading. Mirrors
 * `shared/parsing/html_normalize.py::normalize_plain_text_to_rich_doc`.
 */
export function richDocFromPlainText(text: string): RichDoc {
  const blocks: ParagraphBlock[] = text
    .split(/\n\s*\n/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trim())
        .join(" ")
        .replace(/[ \t]+/g, " ")
        .trim(),
    )
    .filter((paragraph) => paragraph.length > 0)
    .map((paragraph): ParagraphBlock => ({
      id: createBlockId(),
      type: "paragraph",
      spans: [{ text: paragraph }],
    }));
  return { schemaVersion: RICH_DOC_SCHEMA_VERSION, blocks };
}

export interface RichDocValidationLimits {
  /** Restricts which block types may appear here; all four are allowed if omitted (a slot-level restriction from CG-C1's `SlotFieldSpec`, not a global rule). */
  allowedBlocks?: RichBlockType[];
  maxBlocks?: number;
  /** Enforced via the existing `LIMIT-001` rule, the same id every other character limit in this package uses — RichDoc does not get its own limit-exceeded rule id. */
  maxChars?: number;
}

function richDocFinding(
  ruleId: string,
  severity: ContentHealthSeverity,
  message: string,
  recommendation: string,
  fieldPath: string,
): Omit<ContentHealthFinding, "entityType" | "entityId"> {
  return { ruleId, severity, field: fieldPath, message, recommendation };
}

/**
 * Structural + limit validation for one RichDoc. Returns findings shaped like
 * `ContentHealthFinding` minus `entityType`/`entityId`, which the caller
 * attaches (a legal document revision, a content slot, …) since the same
 * RichDoc value is reused across several entity kinds.
 *
 * Deliberately does NOT flag an empty document (zero blocks) as an error:
 * "this field is required and is empty" is the calling layer's rule (e.g.
 * `MODEL-004` for a required slot, or the legal registry's own
 * `body_too_short`), because the same RichDoc shape backs both required and
 * optional fields.
 */
export function validateRichDoc(
  doc: RichDoc,
  limits: RichDocValidationLimits = {},
): Omit<ContentHealthFinding, "entityType" | "entityId">[] {
  const findings: Omit<ContentHealthFinding, "entityType" | "entityId">[] = [];
  const seenIds = new Set<string>();

  const checkId = (id: string, path: string) => {
    if (seenIds.has(id)) {
      findings.push(
        richDocFinding(
          "RICH-006",
          "error",
          `Blok id „${id}” je dupliran.`,
          "Generisati nov, jedinstven id za svaki blok i stavku liste.",
          path,
        ),
      );
    }
    seenIds.add(id);
  };

  doc.blocks.forEach((block, index) => {
    const path = `blocks[${index}]`;
    checkId(block.id, path);

    if (limits.allowedBlocks && !limits.allowedBlocks.includes(block.type)) {
      findings.push(
        richDocFinding(
          "RICH-001",
          "error",
          `Tip bloka „${block.type}” nije dozvoljen u ovoj sekciji.`,
          "Koristiti samo blokove dozvoljene za ovaj slot.",
          path,
        ),
      );
    }

    const spans = block.type === "list" ? [] : block.spans;
    if (block.type === "list") {
      block.items.forEach((item, itemIndex) => {
        checkId(item.id, `${path}.items[${itemIndex}]`);
        findings.push(
          ...validateSpans(item.spans, `${path}.items[${itemIndex}].spans`),
        );
      });
    } else {
      findings.push(...validateSpans(spans, `${path}.spans`));
    }
  });

  if (limits.maxBlocks !== undefined && doc.blocks.length > limits.maxBlocks) {
    findings.push(
      richDocFinding(
        "RICH-005",
        "error",
        `Broj blokova (${doc.blocks.length}) prelazi dozvoljenih ${limits.maxBlocks}.`,
        "Skratiti tekst ili podeliti u više sekcija.",
        "blocks",
      ),
    );
  }

  if (limits.maxChars !== undefined) {
    const length = richDocTextLength(doc);
    if (length > limits.maxChars) {
      findings.push(
        richDocFinding(
          "LIMIT-001",
          "error",
          `Tekst (${length} znakova) prelazi limit od ${limits.maxChars} znakova.`,
          "Skratiti sadržaj bez promene formatiranja.",
          "blocks",
        ),
      );
    }
  }

  return findings;
}

function validateSpans(
  spans: Span[],
  path: string,
): Omit<ContentHealthFinding, "entityType" | "entityId">[] {
  const findings: Omit<ContentHealthFinding, "entityType" | "entityId">[] = [];

  spans.forEach((span, index) => {
    const spanPath = `${path}[${index}]`;
    let hasUnderline = false;
    for (const mark of span.marks ?? []) {
      if (isLinkMark(mark)) {
        if (!isAllowedHref(mark.href)) {
          findings.push(
            richDocFinding(
              "RICH-003",
              "error",
              `Link „${mark.href}” nije dozvoljen.`,
              "Koristiti https:// adresu, mailto: ili internu rutu.",
              spanPath,
            ),
          );
        }
      } else if (mark === "underline") {
        hasUnderline = true;
      } else if (mark !== "bold" && mark !== "italic") {
        findings.push(
          richDocFinding(
            "RICH-002",
            "error",
            `Nepoznat mark u tekstu.`,
            "Koristiti bold, italic, underline ili link.",
            spanPath,
          ),
        );
      }
    }
    if (hasUnderline && URL_LIKE.test(span.text.trim())) {
      findings.push(
        richDocFinding(
          "RICH-004",
          "warning",
          "Podvučen tekst izgleda kao URL.",
          "Pretvoriti u pravi link umesto podvlačenja.",
          spanPath,
        ),
      );
    }
  });

  return findings;
}
