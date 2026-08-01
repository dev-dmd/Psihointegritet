import {
  fetchPublicLegalDocument,
  type PublicLegalDocumentKind,
} from "@/lib/privacy/public-legal-document";

const VALID_KINDS = new Set<PublicLegalDocumentKind>([
  "privacy_policy",
  "terms_of_use",
  "cookie_policy",
  "booking_rules",
  "intake_data_processing_notice",
  "intake_request_acknowledgement",
]);

interface RouteContext {
  params: Promise<{ kind: string }>;
}

/**
 * Unauthenticated proxy for the public legal-document read — NOT
 * `forwardStaffIntake` (that requires a Clerk session; most Intake visitors
 * submitting a request are prospective clients, not logged-in staff) and
 * not `forwardPublicIntake` (that is POST/body-size-specific). This route
 * exists so the client component `ConsentDocumentDisclosure` has a
 * same-origin endpoint to call — `lib/privacy/public-legal-document.ts` is
 * `server-only` and cannot be imported from client code.
 */
export async function GET(
  _: Request,
  context: RouteContext,
): Promise<Response> {
  const { kind } = await context.params;
  if (!VALID_KINDS.has(kind as PublicLegalDocumentKind)) {
    return Response.json(
      { error: "Unknown document kind." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const document = await fetchPublicLegalDocument(
    kind as PublicLegalDocumentKind,
  );
  if (!document) {
    return Response.json(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return Response.json(document, { headers: { "Cache-Control": "no-store" } });
}
