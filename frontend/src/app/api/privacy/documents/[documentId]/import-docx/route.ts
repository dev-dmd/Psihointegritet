import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ documentId: string }>;
}

/** Preview-only on the backend (ADR-017 §8) — this proxy re-reads the
 * incoming multipart body and re-forwards it; nothing is persisted here. */
export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { documentId } = await context.params;
  const formData = await request.formData();
  return forwardStaffIntake(
    `/api/v1/privacy/documents/${encodeURIComponent(documentId)}/import-docx`,
    { method: "POST", body: formData },
  );
}
