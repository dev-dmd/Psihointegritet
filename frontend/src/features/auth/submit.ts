"use client";

/**
 * Posting an auth form, from the browser.
 *
 * A `.ts` file, not `.tsx`, deliberately: `check-frontend-architecture.mjs`
 * refuses `fetch(` inside a `.tsx`, and it is right to — data access does not
 * belong in a component file.
 *
 * Note what is *not* here. The response carries `{ ok: true }` and nothing
 * else; the session token went into an `HttpOnly` cookie on the server and this
 * code has no way to see it. There is nothing to put in `localStorage`, which
 * is the point rather than an omission.
 */

export interface AuthSubmitResult {
  ok: boolean;
  message: string | null;
}

export async function submitAuth(
  endpoint: string,
  body: Record<string, string>,
  unreachableMessage: string,
): Promise<AuthSubmitResult> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // The network, not the password. Told apart so nobody resets a password
    // that was never the problem.
    return { ok: false, message: unreachableMessage };
  }

  if (response.ok) return { ok: true, message: null };

  try {
    const payload = (await response.json()) as { message?: unknown };
    return {
      ok: false,
      message:
        typeof payload.message === "string" && payload.message
          ? payload.message
          : unreachableMessage,
    };
  } catch {
    return { ok: false, message: unreachableMessage };
  }
}
