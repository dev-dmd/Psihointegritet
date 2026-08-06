import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/content/review-assignments", {});
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  return forwardStaffIntake("/api/v1/content/review-assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
