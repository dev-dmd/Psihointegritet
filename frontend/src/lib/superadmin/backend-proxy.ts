// Server-only diagnostics proxy to FastAPI (mirrors booking/intake proxy pattern).
//
// GET  /api/v1/superadmin/diagnostics            → list registered definitions
// POST /api/v1/superadmin/diagnostics/run        → run all / by category
// POST /api/v1/superadmin/diagnostics/{key}/run  → run a single diagnostic
//
// Every route forwards the Clerk session token; the backend `require_superadmin`
// dependency is the authorization authority (DIAGNOSTIC_ENGINE_FOUNDATION §7).

import "server-only";

import { auth } from "@clerk/nextjs/server";

import { serverEnv } from "@/lib/validation/env";

async function _forward(path: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${serverEnv.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      cache: "no-store",
    });
    const contentType =
      response.headers.get("Content-Type") ?? "application/json";
    const body =
      response.status === 204 || response.status === 304
        ? null
        : await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      },
    });
  } catch {
    return Response.json(
      { error: "Diagnostics servis trenutno nije dostupan." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function forwardSuperadminDiagnostics(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const session = await auth();
  const token = await session.getToken();
  if (!token) {
    return Response.json({ error: "Prijava je obavezna." }, { status: 401 });
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return _forward(path, { ...init, headers });
}
