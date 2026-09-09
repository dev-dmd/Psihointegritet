import type { Metadata } from "next";
import Link from "next/link";

import { getTranslations } from "next-intl/server";

import { AccountRecovery } from "@/features/auth/account-recovery";
import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { POST_AUTH_LANDING_PATH, SIGN_UP_PATH } from "@/lib/routes/auth-paths";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Prijava",
  // A sign-in page has nothing to offer a search index, and indexing it is how
  // a `redirect_url` ends up cached somewhere it does not belong.
  robots: { index: false, follow: false },
};

/**
 * Platform sign-in (D-083).
 *
 * The page is a server component and the form is the only client code on it.
 * That keeps the copy, the frame and the branding server-rendered, and means
 * the browser is handed a form and nothing else — no session, no identity, no
 * catalogue.
 *
 * `redirect_url` is passed through `safeReturnPath` before it reaches the form.
 * Unvalidated, it would make this page an open redirect wearing our own
 * branding, which is a better phishing vector than a fake login ever is.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("screens.platform");
  const redirectTo = safeReturnPath(
    (await searchParams).redirect_url,
    // The landing endpoint decides where this person belongs from their roles;
    // a static default here could only ever be right for one of them.
    POST_AUTH_LANDING_PATH,
  );

  return (
    <AuthSurfaceLayout surface={(await surfaceOfRequest()) ?? "tenant"}>
      <div className="w-full max-w-[420px]">
        <h1 className="text-coffee font-serif text-[clamp(24px,5vw,34px)] leading-[1.15] font-normal">
          {t("signInTitle")}
        </h1>
        <p className="text-coffee/70 mt-3 text-[16px] leading-[1.7]">
          {t("signInLead")}
        </p>

        <CredentialsForm
          endpoint="/api/auth/sign-in"
          redirectTo={redirectTo}
          copy={{
            emailLabel: t("emailLabel"),
            passwordLabel: t("passwordLabel"),
            nameLabel: t("nameLabel"),
            nameOptional: t("nameOptional"),
            submitLabel: t("signInAction"),
            workingLabel: t("working"),
            unreachable: t("authUnreachable"),
            showPassword: t("showPassword"),
            hidePassword: t("hidePassword"),
          }}
        />

        {/* Shown to everyone, always. Offered *before* anybody fails to sign
            in, and never in response to a particular refusal: a recovery
            prompt that appeared only for known addresses would answer, to
            anyone who asked, which addresses have accounts here — the same
            question the single generic sign-in message exists to refuse. */}
        <AccountRecovery
          copy={{
            forgotAction: t("recoveryForgotAction"),
            resendAction: t("recoveryResendAction"),
            forgotLead: t("recoveryForgotLead"),
            resendLead: t("recoveryResendLead"),
            emailLabel: t("emailLabel"),
            submitLabel: t("recoverySubmit"),
            workingLabel: t("working"),
            cancelLabel: t("recoveryCancel"),
            doneLead: t("recoveryDoneLead"),
            unreachable: t("authUnreachable"),
          }}
        />

        <p className="text-coffee/70 mt-6 text-[14px]">
          {t("noAccount")}{" "}
          <Link href={SIGN_UP_PATH} className="text-coffee underline">
            {t("signUpAction")}
          </Link>
        </p>
      </div>
    </AuthSurfaceLayout>
  );
}
