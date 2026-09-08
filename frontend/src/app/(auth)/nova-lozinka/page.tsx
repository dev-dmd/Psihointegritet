import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { CredentialsForm } from "@/features/auth/credentials-form";
import { SIGN_IN_PATH } from "@/lib/routes/auth-paths";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Nova lozinka",
  robots: { index: false, follow: false },
};

/**
 * Where a reset or activation link lands.
 *
 * One page for both, because they are one operation: setting the first password
 * on an account migrated off Clerk and replacing a forgotten one differ only in
 * what was there before.
 *
 * The token is read here and passed to the form as a hidden value. It is never
 * rendered as text and never linked — it is a credential for as long as it is
 * unspent, and the address bar is already more exposure than it deserves.
 *
 * There is no email field. The token already names the account; asking for an
 * address as well would let somebody spend a link against a different one.
 *
 * On success the person is sent to sign in rather than straight into the
 * workspace. The backend revokes *every* session of the account as part of a
 * reset — including this browser's — and issuing a fresh one to whoever
 * happened to submit the form would make an exception for exactly the request
 * an attacker would be making.
 */
export default async function ResetPasswordPage({
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
          {t("resetTitle")}
        </h1>
        <p className="text-coffee/70 mt-3 text-[16px] leading-[1.7]">
          {token ? t("resetLead") : t("resetLinkMissing")}
        </p>

        {token ? (
          <CredentialsForm
            endpoint="/api/auth/password-reset"
            redirectTo={SIGN_IN_PATH}
            hiddenToken={token}
            passwordAutoComplete="new-password"
            minPasswordLength={12}
            copy={{
              emailLabel: t("emailLabel"),
              passwordLabel: t("newPasswordLabel"),
              nameLabel: t("nameLabel"),
              nameOptional: t("nameOptional"),
              submitLabel: t("resetAction"),
              workingLabel: t("working"),
              unreachable: t("authUnreachable"),
            }}
          />
        ) : null}
      </div>
    </AuthSurfaceLayout>
  );
}
