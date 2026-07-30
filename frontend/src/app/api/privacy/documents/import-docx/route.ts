import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/** Preview-only conversion for a document that has not been created yet. */
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  return forwardStaffIntake("/api/v1/privacy/documents/import-docx", {
    method: "POST",
    body: formData,
  });
}
