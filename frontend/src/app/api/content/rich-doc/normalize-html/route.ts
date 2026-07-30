import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  return forwardStaffIntake("/api/v1/content/rich-doc/normalize-html", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
