"use client";

import { useState } from "react";

import { ConfirmModal } from "@/components/panel/confirm-modal";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";
import { Toggle } from "@/components/panel/toggle";

import { useGates } from "../gates-context";
import type { FeatureGate, GateStatus } from "../types";
import { LockIcon } from "./icons";

const GATE_STATUS: Record<
  GateStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  on: { label: "Uključeno", tone: "ok" },
  off: { label: "Isključeno", tone: "neutral" },
  coming_soon: { label: "U pripremi", tone: "amber" },
};

/**
 * Feature-gates registry table. A toggle never flips directly — it opens the
 * confirmation modal demanding a reason; the change lands in the activity
 * feed (in-memory demo of the future Audit Log flow).
 */
export function GatesTable() {
  const { gates, toggleGate } = useGates();
  const [pending, setPending] = useState<FeatureGate | null>(null);

  const pendingStatus = pending ? GATE_STATUS[pending.status] : null;
  const pendingNext = pending
    ? GATE_STATUS[pending.status === "on" ? "off" : "on"]
    : null;

  return (
    <div className="rounded-panel border-line bg-surface border px-6 pt-2 pb-2.5">
      <div className="text-ink-45 hidden grid-cols-[2fr_1fr_1.3fr_auto] gap-3.5 px-1 pt-3 pb-2.5 text-[10.5px] font-semibold tracking-[0.12em] uppercase lg:grid">
        <span>Funkcionalnost</span>
        <span>Min. plan</span>
        <span>Tenant override</span>
        <span className="text-right">Psihointegritet</span>
      </div>
      {gates.map((gate) => {
        const status = GATE_STATUS[gate.status];
        return (
          <div
            key={gate.id}
            className="border-line grid grid-cols-[1fr_auto] items-center gap-2.5 border-t px-1 py-3.5 lg:grid-cols-[2fr_1fr_1.3fr_auto] lg:gap-3.5"
          >
            <span>
              <span className="text-coffee block text-[14.5px] font-semibold">
                {gate.name}
              </span>
              <span className="text-ink-55 mt-0.5 block text-[12.5px]">
                {gate.description}
              </span>
            </span>
            <span className="col-span-full text-[12.5px] font-semibold lg:col-span-1">
              <span className="bg-coffee/6 text-coffee/65 rounded-full px-[11px] py-1">
                {gate.minPlan}
              </span>
            </span>
            <span className="text-coffee/50 col-span-full font-mono text-[11.5px] lg:col-span-1">
              {gate.tenantOverride}
            </span>
            <span className="col-start-2 row-start-1 flex items-center justify-end gap-2.5 lg:col-start-auto lg:row-start-auto">
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              {gate.status === "coming_soon" ? (
                <span
                  aria-hidden
                  className="text-coffee/30 inline-flex w-10 justify-center"
                >
                  <LockIcon />
                </span>
              ) : (
                <Toggle
                  checked={gate.status === "on"}
                  label={`Promeni gate — ${gate.name}`}
                  onChange={() => setPending(gate)}
                />
              )}
            </span>
          </div>
        );
      })}

      <ConfirmModal
        open={pending !== null}
        eyebrow="Potvrda promene"
        title={pending?.name ?? ""}
        description={`Tenant Psihointegritet · ${pendingStatus?.label ?? ""} → ${pendingNext?.label ?? ""}`}
        reasonLabel="Razlog promene — obavezno"
        reasonPlaceholder="npr. Dogovor sa vlasnicom centra"
        note="Promena se upisuje u Audit Log: ko, kada, prethodna i nova vrednost, razlog."
        confirmLabel="Potvrdi promenu"
        onConfirm={(reason) => {
          if (pending) {
            toggleGate(pending.id, reason);
          }
          setPending(null);
        }}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
