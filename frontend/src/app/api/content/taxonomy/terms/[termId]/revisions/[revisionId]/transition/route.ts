import { revalidatePublicCompassAfterMutation } from "@/lib/compass/revalidation";
import { forwardStaffIntake } from "@/lib/intake/backend-proxy";

interface RouteContext {
  params: Promise<{ termId: string; revisionId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { termId, revisionId } = await context.params;
  const body = await request.text();
  const response = await forwardStaffIntake(
    `/api/v1/content/taxonomy/terms/${encodeURIComponent(termId)}/revisions/${encodeURIComponent(revisionId)}/transition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    },
  );

  if (response.ok) {
    try {
      const target = (JSON.parse(body) as { target?: unknown }).target;
      if (target === "published" || target === "archived") {
        revalidatePublicCompassAfterMutation(response);
      }
    } catch {
      // A successful non-transition-shaped response stays successful; the
      // five-minute cache TTL remains the bounded recovery path.
    }
  }

  return response;
}
