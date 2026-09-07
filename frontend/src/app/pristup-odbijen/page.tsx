import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import { PLATFORM_NAME } from "@/lib/tenant/domain-registry";

/**
 * A signed-in person with nowhere to go.
 *
 * A real state, not an error: an account can be provisioned and verified before
 * anybody grants it a membership, and the post-auth dispatcher refuses to guess
 * a destination for someone whose memberships name none or several practices.
 *
 * It says so rather than 404-ing, because a 404 after a successful sign-in
 * reads as a broken product. The person did nothing wrong and their session is
 * valid — what is missing is a role, and only an operator can add one.
 */
export const metadata: Metadata = {
  title: { absolute: `Pristup nije dodeljen · ${PLATFORM_NAME}` },
  robots: { index: false, follow: false },
};

export default async function AccessDeniedPage() {
  const t = await getTranslations("screens.platform");

  return (
    <main className="mx-auto flex min-h-screen max-w-[560px] flex-col justify-center px-6 py-24">
      <h1 className="text-coffee font-serif text-[clamp(26px,6vw,38px)] leading-[1.15] font-normal">
        {t("accessDeniedTitle")}
      </h1>
      <p className="text-coffee/70 mt-5 text-[17px] leading-[1.7]">
        {t("accessDeniedLead")}
      </p>
    </main>
  );
}
