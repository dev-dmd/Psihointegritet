import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { VerifyEmailForm } from "@/features/auth/verify-email-form";
import { SIGN_IN_PATH } from "@/lib/routes/auth-paths";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Potvrda adrese",
  robots: { index: false, follow: false },
};

/**
 * Where a verification link lands.
 *
 * Sibling of `/nova-lozinka` and shaped the same way: the token arrives in the
 * query, is handed to a client component, and is never rendered as text.
 *
 * The page does **not** verify on load. A link in an email is fetched by mail
 * clients and scanners before anybody opens it, and a one-time token spent that
 * way leaves its owner unable to verify at all — with nothing to ask for a new
 * link, since a self-service resend is itself an unauthenticated mailer that
 * needs rate limiting first. So the page renders a button.
 *
 * On success it points at sign-in rather than issuing a session: registration
 * already signed in the browser that registered, and this link may well be
 * opened on a different device days later.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("screens.platform");
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";

  return (
    <AuthSurfaceLayout surface={(await surfaceOfRequest()) ?? "tenant"}>
      <div className="w-full max-w-[420px]">
        <h1 className="text-coffee font-serif text-[clamp(24px,5vw,34px)] leading-[1.15] font-normal">
          {t("verifyTitle")}
        </h1>
        <p className="text-coffee/70 mt-3 text-[16px] leading-[1.7]">
          {token ? t("verifyLead") : t("verifyLinkMissing")}
        </p>

        {token ? (
          <VerifyEmailForm
            token={token}
            copy={{
              submitLabel: t("verifyAction"),
              workingLabel: t("working"),
              doneLabel: t("verifyDone"),
              doneLead: t("verifyDoneLead"),
              signInLabel: t("signInAction"),
              signInHref: SIGN_IN_PATH,
              unreachable: t("authUnreachable"),
            }}
          />
        ) : null}
      </div>
    </AuthSurfaceLayout>
  );
}
