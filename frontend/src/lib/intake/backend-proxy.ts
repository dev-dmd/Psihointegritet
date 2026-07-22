import "server-only";

import { auth } from "@clerk/nextjs/server";

import { serverEnv } from "@/lib/validation/env";

const MAX_PUBLIC_INTAKE_BYTES = 12_000;

export async function forwardPublicIntake(
  path: string,
  request: Request,
): Promise<Response> {
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_PUBLIC_INTAKE_BYTES) {
    return Response.json({ error: "Zahtev je prevelik." }, { status: 413 });
  }

  const headers = new Headers({ "Content-Type": "application/json" });
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (idempotencyKey) {
    headers.set("Idempotency-Key", idempotencyKey);
  }

  return forward(path, { method: "POST", headers, body });
}

export async function forwardStaffIntake(
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
  return forward(path, { ...init, headers });
}

async function forward(path: string, init: RequestInit): Promise<Response> {
  try {
    const response = await fetch(`${serverEnv.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      cache: "no-store",
    });
    const contentType =
      response.headers.get("Content-Type") ?? "application/json";
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentType,
      },
    });
  } catch {
    return Response.json(
      { error: "Intake servis trenutno nije dostupan." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
