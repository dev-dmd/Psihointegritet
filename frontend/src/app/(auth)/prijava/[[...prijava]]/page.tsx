import type { Metadata } from "next";

import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { AuthUnavailable } from "@/features/auth/auth-unavailable";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Prijava",
  // A page that cannot do its job yet has no business in an index.
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const redirectUrl = (await searchParams).redirect_url;

  return (
    <AuthSurfaceLayout surface={(await surfaceOfRequest()) ?? "tenant"}>
      <AuthUnavailable
        kind="signIn"
        headedFor={typeof redirectUrl === "string" ? redirectUrl : null}
      />
    </AuthSurfaceLayout>
  );
}
