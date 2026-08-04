import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/**
 * Preview-only on the backend: the conversion is returned, never stored. This
 * proxy re-reads the incoming multipart body and forwards it unchanged.
 */
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  return forwardStaffIntake("/api/v1/content/rich-doc/import-docx", {
    method: "POST",
    body: formData,
  });
}
