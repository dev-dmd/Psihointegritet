/**
 * Client for the LD-7 backend (`modules/privacy/router.py`), proxied through
 * `app/api/privacy/**` Next Route Handlers (same pattern as
 * `intake-team-queue-api.ts` → `app/api/intake/**`).
 *
 * The panel keeps a small hand-shaped adapter over the generated OpenAPI
 * contract so its domain names stay stable. The generated client is refreshed
 * whenever this wire contract changes. `ApiSchema`'s `alias_generator=to_camel`
 * means no case conversion happens here.
 */

import type { RichDoc } from "@/lib/content-governance/rich-doc";
import type { ActorSummary } from "@/components/panel/actor-badge";
import { isApiProblem } from "@/lib/errors/api-problem";

import type {
  ApprovalCapability,
  LegalDocument,
  LegalDocumentKind,
  RevisionStatus,
} from "./legal-documents";

export interface ApiApprovalEvidence {
  capability: ApprovalCapability;
  approver: string | null;
  approverUserId: string | null;
  approvedBy: ActorSummary | null;
  approvedAt: string | null;
  note: string | null;
}

export interface ApiLegalDocumentRevision {
  documentId: string;
  revisionId: string;
  kind: LegalDocumentKind;
  management: "document";
  title: string;
  slug: string;
  body: RichDoc;
  status: RevisionStatus;
  versionLabel: string;
  approvals: ApiApprovalEvidence[];
  createdBy: ActorSummary | null;
  updatedBy: ActorSummary | null;
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
    management: revision.management,
    title: revision.title,
    slug: revision.slug,
    body: revision.body,
    status: revision.status,
    approvals: revision.approvals.map((evidence) => evidence.capability),
    approvalEvidence: revision.approvals,
    createdBy: revision.createdBy,
    updatedBy: revision.updatedBy,
    versionLabel: revision.versionLabel,
    updatedAt: revision.updatedAt,
  };
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let detail = text || `Zahtev nije uspeo (${response.status}).`;
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      if (isApiProblem(parsed)) {
        detail =
          parsed.status >= 500
            ? `Server trenutno ne može da obradi zahtev. Pokušajte ponovo. Ako se greška ponovi, pošaljite podršci ID greške: ${parsed.correlationId}.`
            : (parsed.detail ?? parsed.title);
        if (parsed.fieldErrors) {
          const fieldDetails = Object.entries(parsed.fieldErrors).flatMap(
            ([field, messages]) =>
              messages.map((message) => `${field}: ${message}`),
          );
          if (fieldDetails.length > 0) {
            detail = `${detail} — ${fieldDetails.join("; ")}`;
          }
        }
      }
    } catch {
      // Keep a non-JSON proxy/network response as-is.
    }
    throw new LegalDocumentsApiError(detail, response.status);
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
  body: RichDoc;
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

export async function removeLegalDocumentApproval(
  documentId: string,
  revisionId: string,
  capability: ApprovalCapability,
): Promise<LegalDocument> {
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/revisions/${encodeURIComponent(revisionId)}/approvals/${encodeURIComponent(capability)}`,
    { method: "DELETE" },
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
  requireDocxFile(file);
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch(
    `/api/privacy/documents/${encodeURIComponent(documentId)}/import-docx`,
    { method: "POST", body: formData },
  );
  return parseOrThrow<ApiImportDocxResult>(response);
}

/** Preview-only import for the create form. It does not create a document or
 * persist the converted content. */
export async function previewNewLegalDocumentDocx(
  file: File,
): Promise<ApiImportDocxResult> {
  requireDocxFile(file);
  const formData = new FormData();
  formData.set("file", file);
  const response = await fetch("/api/privacy/documents?action=import-docx", {
    method: "POST",
    body: formData,
  });
  return parseOrThrow<ApiImportDocxResult>(response);
}

function requireDocxFile(file: File): void {
  if (file.name.toLowerCase().endsWith(".docx")) return;
  throw new LegalDocumentsApiError(
    "Izabrani fajl nije .docx. Sačuvajte Word dokument kao .docx i pokušajte ponovo.",
    422,
  );
}
