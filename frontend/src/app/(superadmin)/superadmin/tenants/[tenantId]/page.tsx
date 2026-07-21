import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/panel/status-badge";
import { ArrowLeftIcon } from "@/features/superadmin/components/icons";
import { TenantProfileView } from "@/features/superadmin/components/tenant-profile-view";
import { psihointegritetTenant } from "@/features/superadmin/data";
import { requireSuperadmin } from "@/lib/auth/guards";
import { WORKSPACE_URL } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Profil tenanta" };

export default async function SuperadminTenantProfilePage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  await requireSuperadmin();
  const { tenantId } = await params;
  // Only the hardcoded Psihointegritet tenant exists in this phase.
  if (tenantId !== psihointegritetTenant.id) {
    notFound();
  }
  const tenant = psihointegritetTenant;

  return (
    <section className="animate-fade-up">
      <Link
        href="/superadmin/tenants"
        className="text-ink-55 hover:text-coffee mb-3.5 inline-flex items-center gap-2 py-1 text-[13.5px] font-semibold no-underline transition-colors"
      >
        <ArrowLeftIcon />
        Tenanti
      </Link>
      <div className="rounded-panel border-line bg-surface mb-4 flex flex-wrap items-center gap-[18px] border px-7 py-[26px]">
        <span
          aria-hidden
          className="bg-meadow/35 text-forest rounded-stat inline-flex h-[60px] w-[60px] items-center justify-center font-serif text-[25px]"
        >
          P
        </span>
        <div className="min-w-[220px] flex-1">
          <h1 className="text-coffee mb-[5px] font-serif text-[26px] leading-[1.1] font-normal md:text-[30px]">
            {tenant.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="ok">Aktivan</StatusBadge>
            <span className="text-ink-55 font-mono text-xs">
              {tenant.domain}
            </span>
            <span className="text-ink-55 text-[12.5px]">{tenant.trial}</span>
          </div>
        </div>
        <Link
          href={WORKSPACE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-coffee text-panel-canvas hover:bg-coffee-hover rounded-full px-[22px] py-3 text-[13.5px] font-semibold whitespace-nowrap no-underline transition-colors"
        >
          Otvori tenant control panel →
        </Link>
      </div>
      <TenantProfileView />
    </section>
  );
}
