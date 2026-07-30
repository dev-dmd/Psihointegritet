/**
 * Client for the CG-B4 backend (`modules/content/router.py`), proxied
 * through `app/api/content/**` Next Route Handlers — same pattern as
 * `legal-documents-api.ts` → `app/api/privacy/documents/**`.
 *
 * Covers draft CRUD, lifecycle and the saved-revision Content Health surface.
 * The small hand-written adapter keeps panel-specific names stable while the
 * generated OpenAPI contract remains the wire authority. `ApiSchema`'s
 * `alias_generator=to_camel` means no runtime case conversion is needed.
 */

import type { ActorSummary } from "@/components/panel/actor-badge";
import { isApiProblem } from "@/lib/errors/api-problem";
import type {
  ApprovalCapability,
  ContentTemplate,
  ContentType,
  PublicationStatus,
  SeoFields,
} from "@/lib/content-governance/types";

export interface ApiReviewDecision {
  capability: ApprovalCapability;
  outcome: "approved" | "rejected";
  decidedByUserId: string | null;
  decidedBy: ActorSummary | null;
  decidedAt: string;
  note: string | null;
}

export interface ApiContentRevision {
  entryId: string;
  revisionId: string;
  contentType: ContentType;
  slug: string;
  locale: string;
  template: ContentTemplate;
  slotData: Record<string, unknown>;
  seo: SeoFields;
  status: PublicationStatus;
  versionLabel: string;
  lockVersion: number;
  decisions: ApiReviewDecision[];
  createdBy: ActorSummary | null;
  updatedBy: ActorSummary | null;
  updatedAt: string;
}

export interface RichDocNormalizationFinding {
  ruleId: string;
  ruleVersion: string;
  severity: string;
  message: string;
  remediation: string;
  fieldPath: string | null;
}

export interface RichDocNormalizationResult {
  body: import("@/lib/content-governance/rich-doc").RichDoc;
  findings: RichDocNormalizationFinding[];
}

export interface ApiContentFinding {
  ruleId: string;
  ruleVersion: string;
  severity: "info" | "warning" | "error";
  message: string;
  remediation: string;
  fieldPath: string | null;
  requiresApproval: ApprovalCapability | null;
}

export interface ApiContentPublishBlock {
  stage: "content" | "transition" | "approvals";
  findings: ApiContentFinding[];
  missing: ApprovalCapability[];
}

export interface ApiContentHealth {
  ruleSetVersion: string;
  checkedAt: string;
  summary: Record<"info" | "warning" | "error", number>;
  findings: ApiContentFinding[];
  requiredApprovals: ApprovalCapability[];
  missingApprovals: ApprovalCapability[];
}

export class ContentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ContentApiError";
  }
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    // The backend wraps every HTTPException in an RFC 7807 `ApiProblem`
    // envelope (`api/errors.py::_handle_http_exception`) — `HTTPException
    // (detail=X)` becomes `title: X`, not `detail` (that field is only set
    // by the 500 handler's generic message). Reading raw response text
    // directly here would show the user the whole JSON envelope instead of
    // the actual message — same latent bug `legal-documents-api.ts` still
    // has; fixed here since CG-C1b needs a real, readable 409 message.
    let message = text || `Zahtev nije uspeo (${response.status}).`;
    try {
      const parsed: unknown = text ? JSON.parse(text) : null;
      if (isApiProblem(parsed)) {
        message = parsed.detail ?? parsed.title;
      }
    } catch {
      // Not JSON (network failure, proxy error page…) — keep the raw text.
    }
    throw new ContentApiError(message, response.status);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function fetchContentEntries(
  contentType?: ContentType,
): Promise<ApiContentRevision[]> {
  const query = contentType
    ? `?contentType=${encodeURIComponent(contentType)}`
    : "";
  const response = await fetch(`/api/content/entries${query}`, {
    cache: "no-store",
  });
  return parseOrThrow<ApiContentRevision[]>(response);
}

export async function createContentEntry(input: {
  contentType: ContentType;
  slug: string;
  template: ContentTemplate;
  locale?: string;
}): Promise<ApiContentRevision> {
  const response = await fetch("/api/content/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow<ApiContentRevision>(response);
}

export async function updateContentRevision(
  entryId: string,
  revisionId: string,
  patch: {
    lockVersion: number;
    slotData?: Record<string, unknown>;
    seo?: SeoFields;
  },
): Promise<ApiContentRevision> {
  const response = await fetch(
    `/api/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return parseOrThrow<ApiContentRevision>(response);
}

export async function deleteContentRevision(
  entryId: string,
  revisionId: string,
): Promise<void> {
  const response = await fetch(
    `/api/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}`,
    { method: "DELETE" },
  );
  await parseOrThrow<void>(response);
}

export async function normalizeRichHtml(
  html: string,
): Promise<RichDocNormalizationResult> {
  const response = await fetch("/api/content/rich-doc/normalize-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
  });
  return parseOrThrow<RichDocNormalizationResult>(response);
}

export async function checkContentPublishable(
  entryId: string,
  revisionId: string,
): Promise<ApiContentPublishBlock | null> {
  const response = await fetch(
    `/api/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/publish-check`,
    { cache: "no-store" },
  );
  return parseOrThrow<ApiContentPublishBlock | null>(response);
}

export async function fetchContentRevisionHealth(
  entryId: string,
  revisionId: string,
): Promise<ApiContentHealth> {
  const response = await fetch(
    `/api/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/content-health`,
    { cache: "no-store" },
  );
  return parseOrThrow<ApiContentHealth>(response);
}

export async function transitionContentRevision(
  entryId: string,
  revisionId: string,
  target: PublicationStatus,
): Promise<ApiContentRevision> {
  const response = await fetch(
    `/api/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    },
  );
  return parseOrThrow<ApiContentRevision>(response);
}

export async function recordContentReviewDecision(
  entryId: string,
  revisionId: string,
  capability: ApprovalCapability,
  outcome: "approved" | "rejected" = "approved",
): Promise<ApiContentRevision> {
  const response = await fetch(
    `/api/content/entries/${encodeURIComponent(entryId)}/revisions/${encodeURIComponent(revisionId)}/reviews`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, outcome }),
    },
  );
  return parseOrThrow<ApiContentRevision>(response);
}
