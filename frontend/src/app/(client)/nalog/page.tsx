import type { Metadata } from "next";

import { IdentityCard } from "@/lib/auth/clerk/identity-card";

export const metadata: Metadata = {
  title: "Moj nalog",
};

/**
 * Protected client area (Milestone 1 skeleton). Access requires an
 * authenticated session (enforced in `proxy.ts`); role-specific gating arrives
 * with the backend identity slice.
 */
export default function ClientDashboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <p className="text-forest-lift text-sm font-medium tracking-wide uppercase">
        Klijentska zona
      </p>
      <h1 className="text-forest mt-2 font-serif text-3xl md:text-4xl">
        Moj nalog
      </h1>
      <p className="text-forest-lift mt-3 max-w-prose">
        Zaštićeni skeleton. Rola i podaci naloga stižu sa backend identity sloja
        (<code>GET /api/v1/me</code>).
      </p>
      <div className="mt-8">
        <IdentityCard />
      </div>
    </main>
  );
}
