import type { Metadata } from "next";

import { IdentityCard } from "@/lib/auth/clerk/identity-card";

export const metadata: Metadata = {
  title: "Superadmin",
};

/**
 * Protected platform superadmin area (Milestone 1 skeleton). The MVP's primary
 * superadmin view will be diagnostics (PRODUCT_CONTEXT §13); for now this only
 * confirms the authenticated session.
 */
export default function SuperadminDashboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <p className="text-forest-lift text-sm font-medium tracking-wide uppercase">
        Platforma
      </p>
      <h1 className="text-forest mt-2 font-serif text-3xl md:text-4xl">
        Superadmin
      </h1>
      <p className="text-forest-lift mt-3 max-w-prose">
        Zaštićeni skeleton. Dijagnostika kao primarni superadmin prikaz stiže u
        kasnijoj fazi; pristup po roli enforce-uje backend.
      </p>
      <div className="mt-8">
        <IdentityCard />
      </div>
    </main>
  );
}
