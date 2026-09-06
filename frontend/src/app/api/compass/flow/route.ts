import "server-only";

import { resolvePublicLocale } from "@/lib/tenant/public-locale";
import { serverEnv } from "@/lib/validation/env";

export async function GET(): Promise<Response> {
  const locale = await resolvePublicLocale();
  const response = await fetch(
    `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/compass/flows/main-kompas?locale=${encodeURIComponent(locale)}`,
    { cache: "no-store" },
  );
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/json",
    },
  });
}
