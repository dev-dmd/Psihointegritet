/**
 * Legal & consent document rules, mirroring the backend authority in
 * `modules/privacy/publication.py` (D-039, ADR-014).
 *
 * The panel enforces the same rules so an admin sees precisely what is missing
 * before a request leaves the browser. FastAPI stays the authority once the
 * migration lands (LD-5) — this never becomes the only check.
 *
 * Nothing here writes or invents legal text. An unpublished consent document
 * keeps the Intake submission gate closed, which is the safe default.
 */

import {
  richDocTextLength,
  type RichDoc,
} from "@/lib/content-governance/rich-doc";

export type LegalDocumentKind =
  | "intake_data_processing_notice"
  | "intake_request_acknowledgement"
  | "privacy_policy"
  | "terms_of_use"
  | "cookie_policy"
  | "booking_rules";

export type RevisionStatus =
  "draft" | "in_review" | "approved" | "published" | "archived";

export type ApprovalCapability = "clinical" | "legal" | "business";

export interface LegalDocument {
  /** Stable identity of the document (kind + slug family). Never reissued. */
  documentId: string;
  /**
   * Identity of the current revision (contract A.2): stays the same through
   * draft → in_review → approved → published → archived, and is reissued
   * (new id, approvals dropped) on `approved → draft` and `archived → draft`.
   */
  revisionId: string;
  kind: LegalDocumentKind;
  title: string;
  slug: string;
  /** RichDoc v1 JSON (ADR-017 Amendment 1 §A1.3, CG-B9) — was a plain string. */
  body: RichDoc;
  status: RevisionStatus;
  approvals: ApprovalCapability[];
  versionLabel: string;
  updatedAt: string;
}

/** D-029 lifecycle. An edit after approval sends a revision back to draft. */
export const ALLOWED_TRANSITIONS: Record<RevisionStatus, RevisionStatus[]> = {
  draft: ["in_review"],
  in_review: ["approved", "draft"],
  approved: ["published", "draft"],
  published: ["archived"],
  archived: ["draft"],
};

/**
 * The two Intake consent texts carry the gate from the production Intake plan
 * §1.3: Legal, Clinical and Business all sign off before activation.
 */
export const REQUIRED_APPROVALS: Record<
  LegalDocumentKind,
  ApprovalCapability[]
> = {
  intake_data_processing_notice: ["legal", "clinical", "business"],
  intake_request_acknowledgement: ["legal", "clinical", "business"],
  privacy_policy: ["legal"],
  terms_of_use: ["legal"],
  cookie_policy: ["legal"],
  booking_rules: ["legal", "business"],
};

/** Kinds whose published revision opens an Intake consent gate. */
export const CONSENT_GATE_KINDS: LegalDocumentKind[] = [
  "intake_data_processing_notice",
  "intake_request_acknowledgement",
];

export const KIND_LABELS: Record<LegalDocumentKind, string> = {
  intake_data_processing_notice: "Obaveštenje o obradi podataka",
  intake_request_acknowledgement: "Potvrda da zahtev nije termin",
  privacy_policy: "Politika privatnosti",
  terms_of_use: "Uslovi korišćenja",
  cookie_policy: "Politika kolačića",
  booking_rules: "Pravila zakazivanja",
};

export const STATUS_LABELS: Record<RevisionStatus, string> = {
  draft: "Radna verzija",
  in_review: "U pregledu",
  approved: "Odobreno",
  published: "Objavljeno",
  archived: "Arhivirano",
};

export const CAPABILITY_LABELS: Record<ApprovalCapability, string> = {
  clinical: "Stručno (Clinical)",
  legal: "Pravno (Legal)",
  business: "Poslovno (Business)",
};

/** Measured in RichDoc plain-text length (CG-B9) — was raw string length before the body field became RichDoc. */
export const MIN_BODY_LENGTH = 40;

export function canTransition(
  current: RevisionStatus,
  target: RevisionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[current].includes(target);
}

/** Hard delete is allowed only for drafts (D-045 / contract A.1). */
export function canDelete(status: RevisionStatus): boolean {
  return status === "draft";
}

export function nextVersionLabel(current: string): string {
  const match = /^v(\d+)$/.exec(current);
  return match ? `v${Number(match[1]) + 1}` : "v1";
}

/**
 * Applies a D-029 transition with the revision semantics of contract A.2.
 * Returns null for a disallowed transition — the caller reports, never throws.
 *
 * `approved → draft` and `archived → draft` do not reopen the immutable
 * revision: they issue a NEW draft revision (new revisionId, approvals
 * dropped, version bumped) carrying over the content fields. `in_review →
 * draft` returns the same working revision for further editing.
 */
export function applyTransition(
  document: LegalDocument,
  target: RevisionStatus,
  generateRevisionId: () => string = () => crypto.randomUUID(),
): LegalDocument | null {
  if (!canTransition(document.status, target)) return null;

  const reissue =
    target === "draft" &&
    (document.status === "approved" || document.status === "archived");

  if (reissue) {
    return {
      ...document,
      status: "draft",
      revisionId: generateRevisionId(),
      approvals: [],
      versionLabel: nextVersionLabel(document.versionLabel),
    };
  }

  return { ...document, status: target };
}

export function missingApprovals(
  kind: LegalDocumentKind,
  approvals: ApprovalCapability[],
): ApprovalCapability[] {
  return REQUIRED_APPROVALS[kind].filter(
    (capability) => !approvals.includes(capability),
  );
}

export function slugify(value: string): string {
  const map: Record<string, string> = {
    č: "c",
    ć: "c",
    đ: "d",
    š: "s",
    ž: "z",
  };
  return value
    .toLowerCase()
    .replace(/[čćđšž]/g, (character) => map[character] ?? character)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Why a publish attempt cannot proceed. Returned rather than thrown: a failed
 * publish must surface as an explained panel error, never as a crash.
 */
export type PublishBlock =
  | { kind: "content"; problems: string[] }
  | { kind: "transition"; from: RevisionStatus }
  | { kind: "approvals"; missing: ApprovalCapability[] };

export type PublishCheck = { ok: true } | { ok: false; block: PublishBlock };

export type ContentProblemCode =
  "empty_title" | "invalid_slug" | "body_too_short";

export const CONTENT_PROBLEM_MESSAGES: Record<ContentProblemCode, string> = {
  empty_title: "Naziv je prazan.",
  invalid_slug:
    "Slug nije ispravan — dozvoljena su mala slova, brojevi i crtica.",
  body_too_short: `Sadržaj je prekratak — potrebno je najmanje ${MIN_BODY_LENGTH} znakova.`,
};

/**
 * Machine-readable content findings, in the panel's display order. The codes
 * are the parity surface with `content_problems` in `publication.py`; the
 * shared fixture file asserts the two stay identical.
 */
export function contentProblems(
  document: Pick<LegalDocument, "title" | "slug" | "body">,
): ContentProblemCode[] {
  const codes: ContentProblemCode[] = [];
  if (!document.title.trim()) codes.push("empty_title");
  if (!isValidSlug(document.slug)) codes.push("invalid_slug");
  if (richDocTextLength(document.body) < MIN_BODY_LENGTH) {
    codes.push("body_too_short");
  }
  return codes;
}

export function checkPublishable(document: LegalDocument): PublishCheck {
  const codes = contentProblems(document);
  if (codes.length > 0) {
    return {
      ok: false,
      block: {
        kind: "content",
        problems: codes.map((code) => CONTENT_PROBLEM_MESSAGES[code]),
      },
    };
  }

  if (!canTransition(document.status, "published")) {
    return { ok: false, block: { kind: "transition", from: document.status } };
  }

  const missing = missingApprovals(document.kind, document.approvals);
  if (missing.length > 0) {
    return { ok: false, block: { kind: "approvals", missing } };
  }

  return { ok: true };
}

/** Admin-facing explanation of a block: what is missing and what to do next. */
export function describePublishBlock(
  document: LegalDocument,
  block: PublishBlock,
): { title: string; description: string; details: string[] } {
  const name = document.title.trim() || KIND_LABELS[document.kind];

  if (block.kind === "content") {
    return {
      title: `Dokument „${name}“ nije objavljen — nepotpun sadržaj`,
      description:
        "Objava je zaustavljena pre slanja jer dokumentu nedostaju obavezna polja. Ispravite navedeno pa ponovite objavu.",
      details: block.problems,
    };
  }

  if (block.kind === "transition") {
    return {
      title: `Dokument „${name}“ nije objavljen — pogrešan korak u toku`,
      description: `Dokument je u stanju „${STATUS_LABELS[block.from]}“. Objaviti se može samo dokument koji je prošao pregled i dobio status „${STATUS_LABELS.approved}“.`,
      details: [
        `Dozvoljen sledeći korak: ${
          ALLOWED_TRANSITIONS[block.from]
            .map((status) => STATUS_LABELS[status])
            .join(", ") || "nema — stanje je konačno"
        }.`,
      ],
    };
  }

  return {
    title: `Dokument „${name}“ nije objavljen — nedostaju odobrenja`,
    description:
      "Ovaj dokument nosi pravnu težinu: kada ga korisnik prihvati, upisuje se koja je verzija prikazana. Zato objava traži sva navedena odobrenja.",
    details: [
      `Nedostaje: ${block.missing.map((capability) => CAPABILITY_LABELS[capability]).join(", ")}.`,
      `Traženo za ovu vrstu dokumenta: ${REQUIRED_APPROVALS[document.kind]
        .map((capability) => CAPABILITY_LABELS[capability])
        .join(", ")}.`,
    ],
  };
}

/**
 * Whether the Intake submission gate is open: both consent documents must have
 * a published revision. Missing documents keep it closed.
 */
export function intakeGateOpen(documents: LegalDocument[]): boolean {
  return CONSENT_GATE_KINDS.every((kind) =>
    documents.some(
      (document) => document.kind === kind && document.status === "published",
    ),
  );
}
