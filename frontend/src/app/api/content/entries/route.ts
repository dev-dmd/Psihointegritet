import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(request: Request): Promise<Response> {
  const contentType = new URL(request.url).searchParams.get("contentType");
  const query = contentType
    ? `?contentType=${encodeURIComponent(contentType)}`
    : "";
  return forwardStaffIntake(`/api/v1/content/entries${query}`, {
    method: "GET",
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  return forwardStaffIntake("/api/v1/content/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
