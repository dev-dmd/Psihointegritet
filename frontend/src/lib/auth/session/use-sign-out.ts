"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";

import { SIGN_OUT_PATH } from "@/lib/routes/auth-paths";

/**
 * End the session and return the person to the site they were on.
 *
 * Host-relative on purpose: a client signing out on their practitioner's domain
 * lands on that practice's home page, an owner on the platform's. One
 * implementation, correct on both, because it never names a host.
 *
 * `destination` exists for the one place where home is the wrong answer:
 * somebody stranded on `/pristup-odbijen` is signing out precisely in order to
 * try another account, and dropping them on the home page makes them find the
 * sign-in form again for no reason.
 *
 * `refresh()` after `replace()` matters — the server components above this one
 * resolved with a session, and without it the shell would keep rendering the
 * signed-in view until something else invalidated the cache.
 *
 * A `.ts` file, not `.tsx`, deliberately: `check-frontend-architecture.mjs`
 * refuses `fetch(` inside a `.tsx`, and it is right to — data access does not
 * belong in a component file.
 */
export function useSignOut(
  destination: Route = "/" as Route,
): () => Promise<void> {
  const router = useRouter();

  return async () => {
    // The endpoint clears the cookie. Today there is none to clear, so this is
    // a no-op that still runs — the engine changes what the route does, not
    // whether anybody calls it.
    await fetch(SIGN_OUT_PATH, { method: "POST" });
    router.replace(destination);
    router.refresh();
  };
}
