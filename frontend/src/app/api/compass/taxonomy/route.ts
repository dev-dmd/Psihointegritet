import "server-only";

import { serverEnv } from "@/lib/validation/env";

export async function GET(): Promise<Response> {
  const response = await fetch(
    `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/compass/taxonomy?locale=sr-Latn`,
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
