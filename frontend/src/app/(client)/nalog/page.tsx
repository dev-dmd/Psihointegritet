import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { IdentityCard } from "@/lib/auth/clerk/identity-card";
import { resolveLandingRoute } from "@/lib/auth/guards";
import { getServerIdentity } from "@/lib/auth/identity-server";
import { ACCOUNT_URL } from "@/lib/auth/routes";

export const metadata: Metadata = {
  title: "Moj nalog",
};

/**
 * Protected client area (Milestone 1 skeleton). Also doubles as the landing
 * page Clerk sends every direct sign-in to (`signInFallbackRedirectUrl`),
 * since that URL is a single static string with no role awareness — staff
 * and superadmins are bounced to their own area here before anything renders.
 * Visitors arriving at a specific protected route (e.g. /superadmin) skip
 * this entirely via proxy.ts's `redirect_url`.
 */
export default async function ClientDashboardPage() {
  const identity = await getServerIdentity();
  if (identity) {
    const landing = resolveLandingRoute(identity);
    if (landing !== ACCOUNT_URL) {
      redirect(landing);
    }
  }

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
