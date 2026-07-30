import "server-only";

import type { RichDoc } from "@/lib/content-governance/rich-doc";
import { serverEnv } from "@/lib/validation/env";

/**
 * The four kinds a public route can request. Mirrors
 * `backend/.../modules/privacy/models.py::LegalDocumentKind` — the intake
 * consent pair (`intake_data_processing_notice`,
 * `intake_request_acknowledgement`) also reads through this same fetch, from
 * `features/guidance/intake-request-form.tsx`.
 */
export type PublicLegalDocumentKind =
  | "privacy_policy"
  | "terms_of_use"
  | "cookie_policy"
  | "booking_rules"
  | "intake_data_processing_notice"
  | "intake_request_acknowledgement";

export interface PublicLegalDocument {
  kind: PublicLegalDocumentKind | "custom_document";
  management: "document";
  title: string;
  slug: string;
  body: RichDoc;
  versionLabel: string;
  publishedAt: string | null;
}

export async function fetchPublicCustomDocument(
  slug: string,
): Promise<PublicLegalDocument | null> {
  try {
    const response = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/privacy/custom-documents/${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as PublicLegalDocument;
  } catch {
    return null;
  }
}

/**
 * Direct server-to-server call, not a Route Handler proxy: this backend
 * endpoint is unauthenticated (`GET /public/privacy/documents/{kind}`), so
 * there is no Clerk token to forward — the proxy pattern in
 * `lib/intake/backend-proxy.ts` exists specifically for that, and would be
 * pure overhead here.
 *
 * Returns `null` for "nothing published yet" (backend 404) AND for a
 * backend outage or network error — callers render the same placeholder
 * either way (D-038: existing/fallback copy, never a broken public page).
 */
export async function fetchPublicLegalDocument(
  kind: PublicLegalDocumentKind,
): Promise<PublicLegalDocument | null> {
  try {
    const response = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/privacy/documents/${kind}`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return (await response.json()) as PublicLegalDocument;
  } catch {
    return null;
  }
}
