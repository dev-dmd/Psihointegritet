import "server-only";

import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/validation/env";

/** Thin proxy to the public Research read-model. No auth: a published question
 * set is public, and the endpoint carries no identity. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stableId: string }> },
) {
  const { stableId } = await params;
  const response = await fetch(
    `${serverEnv.NEXT_PUBLIC_API_URL}/api/v1/public/research/surveys/${encodeURIComponent(stableId)}`,
    { cache: "no-store" },
  );
  const body: unknown = await response.json().catch(() => null);
  return NextResponse.json(body, { status: response.status });
}
