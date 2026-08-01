import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/content/taxonomy/intake-links", {
    method: "GET",
  });
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  return forwardStaffIntake("/api/v1/content/taxonomy/intake-links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
