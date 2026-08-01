import { forwardPublicIntake } from "@/lib/intake/backend-proxy";

export async function POST(request: Request): Promise<Response> {
  return forwardPublicIntake("/api/v1/public/intake/cases", request);
}
