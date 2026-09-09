import "server-only";

import { NextResponse } from "next/server";

/**
 * The shape every auth route handler shares: read strings, or refuse.
 *
 * Three handlers doing this inline was three chances for one of them to forward
 * something it should not, or to answer a refusal without `no-store`. One
 * helper instead, so the rules about what leaves the server are stated once.
 */

/**
 * The named string fields of a JSON body, trimmed of nothing and trusted for
 * nothing — the backend validates; this only gets the types right.
 *
 * Returns `null` for a body that is not JSON, so a handler can answer its own
 * generic message rather than leaking a parser error.
 */
export async function readStringFields<Field extends string>(
  request: Request,
  fields: readonly Field[],
): Promise<Record<Field, string> | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null) return null;

  const record = body as Record<string, unknown>;
  const values = {} as Record<Field, string>;
  for (const field of fields) {
    const value = record[field];
    values[field] = typeof value === "string" ? value : "";
  }
  return values;
}

/**
 * A refusal, with the two headers it must always carry.
 *
 * The body holds a message and nothing else. No token, no account state, no
 * hint about which of several causes applied — the backend already reduced
 * those to one sentence, and re-expanding them here would undo it.
 */
export function refuse(status: number, message: string): NextResponse {
  const response = NextResponse.json({ ok: false, message }, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/**
 * A success, deliberately too small to carry a session token.
 *
 * The token went into an `HttpOnly` cookie on the way past. A response shape
 * with nowhere to put it is what stops somebody adding it later "so the client
 * can show the expiry".
 */
export function succeed(): NextResponse {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
