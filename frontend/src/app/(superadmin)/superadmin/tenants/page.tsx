import type { Metadata } from "next";

import { PageHeader } from "@/features/superadmin/components/page-header";
import { TenantRowCard } from "@/features/superadmin/components/tenant-row-card";
import { requireSuperadmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Tenanti" };

export default async function SuperadminTenantsPage() {
  await requireSuperadmin();

  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Tenanti"
        description="Multi-tenant osnova — za sada jedan tenant, struktura spremna za više."
      />
      <TenantRowCard />
      <div className="border-coffee/18 rounded-card bg-surface/60 mt-3.5 flex flex-wrap items-center justify-between gap-3.5 border-[1.5px] border-dashed px-6 py-5">
        <span className="text-ink-55 text-[13.5px]">
          Novi tenant — onboarding tok je planiran za fazu white-label ponude.
        </span>
        <span className="bg-badge-amber-bg text-badge-amber rounded-full px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.08em] uppercase">
          Uskoro
        </span>
      </div>
    </section>
  );
}
