import "server-only";

import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/validation/env";

/**
 * Forwards a survey submission to the Research module.
 *
 * Deliberately passes nothing but the parsed body — no IP, no headers, no
 * identity. The backend schema has no column for any of it (D-057), and adding
 * it here would be the one place that could quietly reintroduce a link to a
 * person.
 */
export async function POST(request: Request) {
  const payload: unknown = await request.json().catch(() => null);
  if (payload === null) {
    return NextResponse.json(
      { title: "Neispravan zahtev", status: 400 },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/research/submissions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const body: unknown = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
