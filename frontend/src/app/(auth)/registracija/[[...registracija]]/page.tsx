import type { Metadata } from "next";

import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { AuthUnavailable } from "@/features/auth/auth-unavailable";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Registracija",
  robots: { index: false, follow: false },
};

export default async function SignUpPage() {
  return (
    <AuthSurfaceLayout surface={(await surfaceOfRequest()) ?? "tenant"}>
      <AuthUnavailable kind="signUp" headedFor={null} />
    </AuthSurfaceLayout>
  );
}
