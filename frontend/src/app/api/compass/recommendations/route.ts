import { serverEnv } from "@/lib/validation/env";

const MAX_COMPASS_REQUEST_BYTES = 8_000;

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_COMPASS_REQUEST_BYTES) {
    return Response.json(
      { error: "Zahtev je prevelik." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const response = await fetch(
      `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/compass/recommendations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        cache: "no-store",
      },
    );
    const contentType =
      response.headers.get("Content-Type") ?? "application/json";
    const responseBody =
      response.status === 204 || response.status === 304
        ? null
        : await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      },
    });
  } catch {
    return Response.json(
      { error: "Kompas servis trenutno nije dostupan." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
