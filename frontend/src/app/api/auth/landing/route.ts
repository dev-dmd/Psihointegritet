import { NextResponse } from "next/server";

import { getUiLocale } from "@/i18n/locale-boundary";
import { getServerIdentity } from "@/lib/auth/identity-server";
import { resolveLanding } from "@/lib/auth/post-auth-landing";
import {
  resolveTenantSurfaceOrganization,
  surfaceOfRequest,
} from "@/lib/tenant/active-organization";

/**
 * Where Clerk sends someone once they are signed in.
 *
 * Thin on purpose: the decision lives in `lib/auth/post-auth-landing.ts`, which
 * is pure and tested. This resolves the request context, applies it, and
 * redirects. It is host-neutral — every surface uses the same endpoint, and the
 * surface it was called from is what changes the answer.
 *
 * 303, not 307: the sign-in that led here was a POST in Clerk's own flow, and
 * a browser must follow this with GET. `no-store` because the destination
 * depends on who is asking.
 */
export async function GET(request: Request) {
  const identity = await getServerIdentity();
  const landing = resolveLanding(identity, {
    surface: (await surfaceOfRequest()) ?? "platform",
    tenantSlug: await resolveTenantSurfaceOrganization(),
    locale: await getUiLocale(),
  });

  const target =
    landing.kind === "tenant"
      ? landing.url
      : landing.kind === "platform"
        ? landing.path
        : "/pristup-odbijen";

  const response = NextResponse.redirect(new URL(target, request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
