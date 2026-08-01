import type { Route } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/panel/status-badge";

import { psihointegritetTenant } from "../data";

/** Clickable tenant row (Tenanti list) → tenant profile. */
export function TenantRowCard() {
  const tenant = psihointegritetTenant;

  return (
    <Link
      href={`/superadmin/tenants/${tenant.id}` as Route}
      className="rounded-card border-line hover:shadow-panel-card bg-surface grid w-full grid-cols-1 items-center gap-3 border px-6 py-[22px] no-underline transition-all duration-[250ms] hover:-translate-y-[3px] md:grid-cols-2 md:gap-4 lg:grid-cols-[2.2fr_1.2fr_1fr_1fr_auto]"
    >
      <span className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="bg-meadow/35 text-forest rounded-tile inline-flex h-[46px] w-[46px] items-center justify-center font-serif text-[19px]"
        >
          P
        </span>
        <span>
          <span className="text-coffee block font-serif text-[21px]">
            {tenant.name}
          </span>
          <span className="text-coffee/50 mt-0.5 block font-mono text-[11.5px]">
            {tenant.domain} · slug: {tenant.slug}
          </span>
        </span>
      </span>
      <span>
        <span className="text-ink-45 block text-[11px] font-semibold tracking-[0.12em] uppercase">
          Vlasnik
        </span>
        <span className="text-coffee mt-0.5 block text-[13.5px] font-semibold">
          {tenant.owner}
        </span>
      </span>
      <span>
        <span className="text-ink-45 block text-[11px] font-semibold tracking-[0.12em] uppercase">
          Plan
        </span>
        <span className="text-coffee mt-0.5 block text-[13.5px] font-semibold">
          {tenant.plan}
        </span>
      </span>
      <span>
        <span className="text-ink-45 block text-[11px] font-semibold tracking-[0.12em] uppercase">
          Terapeuti · klijenti
        </span>
        <span className="text-coffee mt-0.5 block text-[13.5px] font-semibold">
          {tenant.therapists} · {tenant.clients}
        </span>
      </span>
      <StatusBadge tone="ok" className="justify-self-start lg:justify-self-end">
        Aktivan
      </StatusBadge>
    </Link>
  );
}
