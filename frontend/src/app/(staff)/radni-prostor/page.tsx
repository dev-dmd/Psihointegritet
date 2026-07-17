import type { Metadata } from "next";

import { IdentityCard } from "@/lib/auth/clerk/identity-card";

export const metadata: Metadata = {
  title: "Radni prostor",
};

/**
 * Protected staff area for therapists and organization admins (Milestone 1
 * skeleton). Distinguishing `therapist` from `org_admin` requires the backend
 * role, which is not yet wired.
 */
export default function StaffWorkspacePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <p className="text-forest-lift text-sm font-medium tracking-wide uppercase">
        Radni prostor (terapeut / org-admin)
      </p>
      <h1 className="text-forest mt-2 font-serif text-3xl md:text-4xl">
        Radni prostor
      </h1>
      <p className="text-forest-lift mt-3 max-w-prose">
        Zaštićeni skeleton. Razdvajanje uloga terapeut/administrator i sadržaj
        stižu sa backend identity sloja.
      </p>
      <div className="mt-8">
        <IdentityCard />
      </div>
    </main>
  );
}
