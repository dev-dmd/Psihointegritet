import type { Metadata } from "next";

import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Prijava",
};

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <SignIn />
    </main>
  );
}
