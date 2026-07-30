import { forwardPublicIntakeGet } from "@/lib/intake/backend-proxy";

export async function GET() {
  return forwardPublicIntakeGet("/api/v1/public/intake/capabilities");
}
