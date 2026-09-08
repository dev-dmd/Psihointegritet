import type { Metadata } from "next";
import Link from "next/link";

import { getTranslations } from "next-intl/server";

import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { safeReturnPath } from "@/lib/auth/safe-return-path";
import { POST_AUTH_LANDING_PATH, SIGN_IN_PATH } from "@/lib/routes/auth-paths";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Registracija",
  robots: { index: false, follow: false },
};

/**
 * Opening a platform account.
 *
 * The account it creates can reach nothing: privilege comes from
 * `organization_memberships`, and a new account has none. The lead copy says so
 * rather than letting somebody register, land on an empty workspace, and
 * conclude the platform is broken.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("screens.platform");
  const redirectTo = safeReturnPath(
    (await searchParams).redirect_url,
    POST_AUTH_LANDING_PATH,
  );

  return (
    <AuthSurfaceLayout surface={(await surfaceOfRequest()) ?? "tenant"}>
      <div className="w-full max-w-[420px]">
        <h1 className="text-coffee font-serif text-[clamp(24px,5vw,34px)] leading-[1.15] font-normal">
          {t("signUpTitle")}
        </h1>
        <p className="text-coffee/70 mt-3 text-[16px] leading-[1.7]">
          {t("signUpLead")}
        </p>

        <CredentialsForm
          endpoint="/api/auth/register"
          redirectTo={redirectTo}
          withName
          passwordAutoComplete="new-password"
          minPasswordLength={12}
          copy={{
            emailLabel: t("emailLabel"),
            passwordLabel: t("passwordLabel"),
            nameLabel: t("nameLabel"),
            nameOptional: t("nameOptional"),
            submitLabel: t("signUpAction"),
            workingLabel: t("working"),
            unreachable: t("authUnreachable"),
          }}
        />

        <p className="text-coffee/70 mt-6 text-[14px]">
          {t("haveAccount")}{" "}
          <Link href={SIGN_IN_PATH} className="text-coffee underline">
            {t("signInAction")}
          </Link>
        </p>
      </div>
    </AuthSurfaceLayout>
  );
}
