import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(): Promise<Response> {
  return forwardStaffIntake("/api/v1/compass/flows", { method: "GET" });
}

export async function POST(request: Request): Promise<Response> {
  return forwardStaffIntake("/api/v1/compass/flows", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}
