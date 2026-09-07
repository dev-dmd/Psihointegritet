import type { Metadata } from "next";

import { SignIn } from "@clerk/nextjs";

import { AuthSurfaceLayout } from "@/features/auth/auth-surface-layout";
import { surfaceOfRequest } from "@/lib/tenant/active-organization";

export const metadata: Metadata = {
  title: "Prijava",
};

export default async function SignInPage() {
  return (
    <AuthSurfaceLayout surface={(await surfaceOfRequest()) ?? "tenant"}>
      <SignIn />
    </AuthSurfaceLayout>
  );
}
