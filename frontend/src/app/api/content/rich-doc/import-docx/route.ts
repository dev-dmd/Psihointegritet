import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

/**
 * Preview-only on the backend: the conversion is returned, never stored. This
 * proxy forwards the raw multipart body unchanged, preserving the original
 * Content-Type (including the boundary) so FastAPI can parse the file upload.
 *
 * `request.formData()` on the Node.js server creates a FormData that
 * Node.js fetch may not re-serialize correctly when combined with a custom
 * headers object — the multipart boundary can be lost, causing the backend
 * to return 404 because it cannot match the request to the file-parameter
 * route. Forwarding the raw body avoids this serialization round-trip.
 */
export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type");
  const body = await request.blob();
  const headers = new Headers();
  if (contentType) {
    headers.set("content-type", contentType);
  }
  return forwardStaffIntake("/api/v1/content/rich-doc/import-docx", {
    method: "POST",
    headers,
    body,
  });
}
