import Link from "next/link";

import { getTranslations } from "next-intl/server";

/**
 * What `/prijava` and `/registracija` say while there is no way to sign in.
 *
 * Clerk is gone (D-083) and the PDC auth engine is a later slice, so these
 * routes have nothing to render. A 404 would be the wrong answer twice over:
 * the pages exist, and the proxy sends every protected route here — a visitor
 * who clicks "workspace" deserves to be told why they cannot get in, not to be
 * shown a missing page.
 *
 * The route keeps its optional catch-all segment so bookmarked sub-paths still
 * answer, and it keeps `AuthSurfaceLayout`, so a tenant's client sees their
 * practice's frame and an owner sees the platform's.
 */
export async function AuthUnavailable({
  kind,
  headedFor,
}: {
  kind: "signIn" | "signUp";
  headedFor: string | null;
}) {
  const t = await getTranslations("screens.platform");

  return (
    <div className="max-w-[420px]">
      <h1 className="text-coffee font-serif text-[clamp(24px,5vw,34px)] leading-[1.15] font-normal">
        {t(kind === "signIn" ? "signInSoonTitle" : "signUpSoonTitle")}
      </h1>
      <p className="text-coffee/70 mt-4 text-[16px] leading-[1.7]">
        {t(kind === "signIn" ? "signInSoonLead" : "signUpSoonLead")}
      </p>

      {/* Rendered as text, never as a link. The value arrives in the query
          string, so linking it would turn this page into an open redirect. */}
      {headedFor ? (
        <p className="text-coffee/45 mt-6 text-[14px] break-all">
          {t("headedFor", { path: headedFor })}
        </p>
      ) : null}

      {/* Host-relative on purpose: `/` is the tenant's own site on their
          domain and the platform landing on ours. One link, right on both. */}
      <Link
        href="/"
        className="border-coffee/12 text-coffee hover:border-sage bg-surface mt-8 inline-flex items-center rounded-full border px-5 py-2.5 text-[15px] font-semibold transition-colors"
      >
        {t("backToSite")}
      </Link>
    </div>
  );
}
