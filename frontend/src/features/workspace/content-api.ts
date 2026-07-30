/**
 * Client for the CG-B4 backend (`modules/content/router.py`), proxied
 * through `app/api/content/**` Next Route Handlers — same pattern as
 * `legal-documents-api.ts` → `app/api/privacy/documents/**`.
 *
 * **CG-C1b scope: draft editing only.** No publish-check/transition/reviews
 * client here — those are CG-C4 (lifecycle), a separate step so this
 * editor's smoke test never depends on objava/pregled (see `TODO.md` §5D
 * Faza 1, korak 1.2). The backend endpoints already exist; this file simply
 * doesn't call them yet.
 *
 * **Hand-typed, not generated** — same reasoning as `legal-documents-api.ts`
 * (D-047, no `npm run api:generate` pass yet). `ApiSchema`'s
 * `alias_generator=to_camel` on the backend means the wire shape is already
 * camelCase — no case conversion happens here.
 */

import { isApiProblem } from "@/lib/errors/api-problem";
import type {
  ApprovalCapability,
  ContentTemplate,
  ContentType,
  PublicationStatus,
} from "@/lib/content-governance/types";

export interface ApiReviewDecision {
  capability: ApprovalCapability;
  outcome: "approved" | "rejected";
  decidedByUserId: string | null;
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
  status: PublicationStatus;
  versionLabel: string;
  lockVersion: number;
  decisions: ApiReviewDecision[];
  updatedAt: string;
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
  patch: { lockVersion: number; slotData?: Record<string, unknown> },
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
