/**
 * Client for the LD-7 backend (`modules/privacy/router.py`), proxied through
 * `app/api/privacy/**` Next Route Handlers (same pattern as
 * `intake-team-queue-api.ts` → `app/api/intake/**`).
 *
 * **Hand-typed, not generated.** `npm run api:generate` was not run for this
 * pass (D-047 — no verification gates until the CMS + Booking testing pass),
 * so these types are written to match `modules/privacy/schemas.py` field for
 * field rather than sourced from `@/types/api.generated`. `ApiSchema`'s
 * `alias_generator=to_camel` on the backend means the wire shape is already
 * camelCase — no case conversion happens here.
 */

import type { RichDoc } from "@/lib/content-governance/rich-doc";

import type {
  ApprovalCapability,
  LegalDocument,
  LegalDocumentKind,
  RevisionStatus,
} from "./legal-documents";

export interface ApiApprovalEvidence {
  capability: ApprovalCapability;
  approver: string | null;
  approvedAt: string | null;
  note: string | null;
}

export interface ApiLegalDocumentRevision {
  documentId: string;
  revisionId: string;
  kind: LegalDocumentKind;
  title: string;
  slug: string;
  body: RichDoc;
  status: RevisionStatus;
  versionLabel: string;
  approvals: ApiApprovalEvidence[];
  updatedAt: string;
}

export interface ApiPublishBlock {
  stage: "content" | "transition" | "approvals";
  contentProblems: string[];
  missing: ApprovalCapability[];
}

export interface ApiImportDocxFinding {
  ruleId: string;
  ruleVersion: string;
  severity: "info" | "warning" | "error";
  message: string;
  remediation: string;
  fieldPath: string | null;
}

export interface ApiImportDocxResult {
  body: RichDoc;
  findings: ApiImportDocxFinding[];
  requiresApproval: boolean;
}

export class LegalDocumentsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "LegalDocumentsApiError";
  }
}

/**
 * The panel's `approvals: ApprovalCapability[]` is deliberately a flat list
 * of granted capabilities (no reviewer identity UI exists yet — see
 * `record_approval`'s fallback in `modules/privacy/service.py`). This drops
 * the richer `ApiApprovalEvidence` metadata (approver/date/note) at the
 * boundary rather than threading it through every call site that only ever
 * checked membership (`document.approvals.includes(capability)`).
 */
export function toLegalDocument(
  revision: ApiLegalDocumentRevision,
): LegalDocument {
  return {
    documentId: revision.documentId,
    revisionId: revision.revisionId,
    kind: revision.kind,
    title: revision.title,
    slug: revision.slug,
    body: revision.body,
    status: revision.status,
    approvals: revision.approvals.map((evidence) => evidence.capability),
    versionLabel: revision.versionLabel,
    updatedAt: revision.updatedAt,
  };
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new LegalDocumentsApiError(
      detail || `Zahtev nije uspeo (${response.status}).`,
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function fetchLegalDocuments(): Promise<LegalDocument[]> {
  const response = await fetch("/api/privacy/documents", { cache: "no-store" });
  const revisions = await parseOrThrow<ApiLegalDocumentRevision[]>(response);
  return revisions.map(toLegalDocument);
}

export async function createLegalDocument(input: {
  kind: LegalDocumentKind;
  title: string;
  slug: string;
}): Promise<LegalDocument> {
  const response = await fetch("/api/privacy/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return toLegalDocument(
    await parseOrThrow<ApiLegalDocumentRevision>(response),
  );
}

export async function updateLegalDocumentRevision(
  documentId: string,
  revisionId: string,
  patch: Partial<{ title: string; slug: string; body: RichDoc }>,
): Promise<LegalDocument> {
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return toLegalDocument(
    await parseOrThrow<ApiLegalDocumentRevision>(response),
  );
}

export async function checkLegalDocumentPublishable(
  documentId: string,
  revisionId: string,
): Promise<ApiPublishBlock | null> {
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/publish-check`,
    { cache: "no-store" },
  );
  return parseOrThrow<ApiPublishBlock | null>(response);
}

export async function transitionLegalDocumentRevision(
  documentId: string,
  revisionId: string,
  target: RevisionStatus,
): Promise<LegalDocument> {
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    },
  );
  return toLegalDocument(
    await parseOrThrow<ApiLegalDocumentRevision>(response),
  );
}

export async function recordLegalDocumentApproval(
  documentId: string,
  revisionId: string,
  capability: ApprovalCapability,
  note?: string,
): Promise<LegalDocument> {
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/approvals`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, note }),
    },
  );
  return toLegalDocument(
    await parseOrThrow<ApiLegalDocumentRevision>(response),
  );
}

export async function deleteLegalDocumentRevision(
  documentId: string,
  revisionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}`,
    { method: "DELETE" },
  );
  await parseOrThrow<void>(response);
}

/** Preview-only (ADR-017 §8): nothing is written until the result is
 * explicitly applied via `updateLegalDocumentRevision`. */
export async function importLegalDocumentDocx(
  documentId: string,
  file: File,
): Promise<ApiImportDocxResult> {
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/import-docx`,
    { method: "POST", body: formData },
  );
  return parseOrThrow<ApiImportDocxResult>(response);
}
