"use client";

import { useState } from "react";

import { KV } from "@/components/panel/kv";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { TabPills } from "@/components/panel/tab-pills";
import { Chip } from "@/components/ui/chip";

import { psihointegritetTenant, usageTiles } from "../data";
import { useGates } from "../gates-context";
import type { GateStatus } from "../types";

const GATE_STATUS: Record<
  GateStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  on: { label: "Uključeno", tone: "ok" },
  off: { label: "Isključeno", tone: "neutral" },
  coming_soon: { label: "U pripremi", tone: "amber" },
};

const tabs = [
  { id: "pregled", label: "Pregled" },
  { id: "funkcionalnosti", label: "Funkcionalnosti" },
  { id: "potrosnja", label: "Potrošnja" },
  { id: "korisnici", label: "Korisnici · uskoro", disabled: true },
  { id: "pretplata", label: "Pretplata · uskoro", disabled: true },
];

/** Tenant profile tabs (Pregled / Funkcionalnosti / Potrošnja + 2 „uskoro"). */
export function TenantProfileView() {
  const [tab, setTab] = useState("pregled");
  const { gates } = useGates();
  const tenant = psihointegritetTenant;

  return (
    <>
      <TabPills
        tabs={tabs}
        activeId={tab}
        onChange={setTab}
        className="mb-[18px]"
      />

      {tab === "pregled" ? (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
          <div className="rounded-card border-line bg-surface border px-6 py-[22px]">
            <div className="text-badge-wait mb-3.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
              Osnovni podaci
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <KV label="Vlasnik">{tenant.owner}</KV>
              <KV label="Plan">{tenant.plan}</KV>
              <KV label="Kreiran">{tenant.created}</KV>
              <KV label="Poslednja aktivnost">{tenant.lastActivity}</KV>
              <KV label="Terapeuti · klijenti" serif>
                {tenant.therapists} · {tenant.clients}
              </KV>
              <KV label="Ukupno termina" serif>
                {tenant.appointments}
              </KV>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="rounded-card border-line bg-surface border px-6 py-[22px]">
              <div className="text-badge-wait mb-3 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                Aktivni engine-i
              </div>
              <div className="flex flex-wrap gap-[7px]">
                {tenant.engines.map((engine) => (
                  <Chip
                    key={engine}
                    variant="tagOutlined"
                    className="px-3 py-[5px] text-[12.5px]"
                  >
                    {engine}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="bg-warm/16 border-warm/45 rounded-card border px-6 py-5">
              <div className="text-badge-wait mb-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                Interna beleška — vidi samo superadmin
              </div>
              <p className="text-coffee text-[13.5px] leading-[1.6]">
                {tenant.note}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "funkcionalnosti" ? (
        <div className="rounded-panel border-line bg-surface border px-6 pt-2.5 pb-3.5">
          {gates.map((gate) => {
            const status = GATE_STATUS[gate.status];
            return (
              <div
                key={gate.id}
                className="border-line grid grid-cols-[1fr_auto] items-center gap-3.5 border-t px-1 py-[13px] first:border-t-0"
              >
                <span>
                  <span className="text-coffee block text-sm font-semibold">
                    {gate.name}
                  </span>
                  <span className="text-coffee/50 mt-0.5 block text-xs">
                    Min. plan: {gate.minPlan}
                  </span>
                </span>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
            );
          })}
          <p className="text-coffee/50 mx-1.5 mt-3 mb-1.5 text-[12.5px] italic">
            Promene se rade u registru Feature Gates — sa potvrdom i upisom u
            Audit Log.
          </p>
        </div>
      ) : null}

      {tab === "potrosnja" ? (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {usageTiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-stat border-line bg-surface border px-5 py-[18px]"
              >
                <span className="text-coffee block font-serif text-[27px]">
                  {tile.value}
                </span>
                <span className="text-ink-55 mt-1 block text-[12.5px] font-semibold">
                  {tile.label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-coffee/50 mx-1 mt-3 text-[12.5px] italic">
            Read-only u ovoj fazi — plan i cena se unose ručno, naplata kasnije.
          </p>
        </>
      ) : null}
    </>
  );
}
