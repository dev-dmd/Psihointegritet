import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { PUBLIC_COMPASS_CACHE_TAG } from "./cache";

export const PUBLIC_COMPASS_REVALIDATION_PATHS = [
  "/kompas/oblasti",
  "/kompas/teme",
  "/sitemap.xml",
] as const;

/** Invalidate only after the proxied backend mutation has really succeeded. */
export function revalidatePublicCompassAfterMutation(
  response: Pick<Response, "ok">,
): boolean {
  if (!response.ok) return false;

  // Compass mutations include archive/revocation and canonical-route changes.
  // They must be blocking cache misses on the next request; stale-while-
  // revalidate could otherwise serve a revoked card or the superseded route.
  revalidateTag(PUBLIC_COMPASS_CACHE_TAG, { expire: 0 });
  for (const path of PUBLIC_COMPASS_REVALIDATION_PATHS) {
    revalidatePath(path);
  }
  return true;
}
