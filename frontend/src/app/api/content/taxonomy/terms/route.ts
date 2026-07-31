import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

export async function GET(request: Request): Promise<Response> {
  const locale = new URL(request.url).searchParams.get("locale") ?? "sr-Latn";
  return forwardStaffIntake(
    `/api/v1/content/taxonomy/terms?locale=${encodeURIComponent(locale)}`,
    { method: "GET" },
  );
}
