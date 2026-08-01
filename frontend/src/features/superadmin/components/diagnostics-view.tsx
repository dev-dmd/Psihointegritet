"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { KV } from "@/components/panel/kv";
import { cn } from "@/helpers/cn";

import {
  APP_VERSION,
  LAST_CHECK_INITIAL,
  app24h,
  healthServices,
  psihointegritetTenant,
  tenantHealthFinding,
  tenantHealthRows,
} from "../data";
import { HealthCard } from "./health-card";
import { PageHeader } from "./page-header";

const TONE_CLASS = {
  ok: "text-badge-ok",
  warn: "text-badge-wait",
  muted: "text-coffee/60",
} as const;

/**
 * Diagnostics screen. „Pokreni proveru" is a demo spinner (1.4 s) that only
 * refreshes the „poslednja provera" time — real collectors are backend M2.7.
 */
export function DiagnosticsView() {
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(LAST_CHECK_INITIAL);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const runCheck = () => {
    setChecking(true);
    timer.current = window.setTimeout(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      setChecking(false);
      setLastCheck(`danas · ${hh}:${mm}`);
    }, 1400);
  };

  const copyTechData = async () => {
    const lines = [
      `Psihointegritet dijagnostika · ${APP_VERSION}`,
      `poslednja provera: ${lastCheck}`,
      ...healthServices.map(
        (service) => `${service.name}: ${service.status} (${service.meta})`,
      ),
      `tenant: ${psihointegritetTenant.slug} · ${psihointegritetTenant.domain}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Tehnički podaci kopirani.");
    } catch {
      toast.error("Kopiranje nije uspelo.");
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Dijagnostika"
          description="Diagnostic engine prvo pouzdano otkriva i lokalizuje problem — popravke kasnije."
        />
        <div className="mb-6 flex items-center gap-2.5">
          {checking ? (
            <span className="text-ink-55 inline-flex items-center gap-[9px] text-[13px] font-semibold">
              <span
                aria-hidden
                className="border-coffee/15 border-t-badge-wait inline-block h-[15px] w-[15px] animate-spin rounded-full border-2"
              />
              Provera u toku…
            </span>
          ) : (
            <button
              type="button"
              onClick={runCheck}
              className="bg-coffee text-panel-canvas hover:bg-coffee-hover min-h-11 cursor-pointer rounded-full border-0 px-[22px] py-[11px] text-[13.5px] font-semibold transition-colors"
            >
              Pokreni proveru
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyTechData()}
            className="border-coffee/22 text-coffee hover:border-badge-wait min-h-11 cursor-pointer rounded-full border-[1.5px] bg-transparent px-[18px] py-2.5 text-[13.5px] font-semibold transition-colors"
          >
            Kopiraj tehničke podatke
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-3.5">
          <HealthCard title="Servisi" lastCheck={lastCheck} />
          <div className="rounded-panel border-line bg-surface border px-6 py-[22px]">
            <h2 className="text-coffee mb-3.5 font-serif text-[21px] font-normal">
              Aplikacija — poslednja 24h
            </h2>
            <div className="grid grid-cols-2 gap-3.5">
              <KV label="Poslednji booking zahtev">
                <span className="text-badge-ok">{app24h.lastBooking}</span>
              </KV>
              <KV label="Poslednji email">
                <span className="text-danger">{app24h.lastEmail}</span>
              </KV>
              <KV label="Neuspeli emailovi" serif>
                {app24h.failedEmails}
              </KV>
              <KV label="API greške · udeo" serif>
                {app24h.apiErrors}{" "}
                <span className="text-ink-55 font-sans text-[13px]">
                  {app24h.apiErrorsShare}
                </span>
              </KV>
              <KV label="Spore operacije" serif>
                {app24h.slowOperations}
              </KV>
              <KV label="Neobrađeni Intake zahtevi" serif>
                {app24h.unprocessedIntake}
              </KV>
            </div>
          </div>
        </div>

        <div className="rounded-panel border-line bg-surface border px-6 py-[22px]">
          <div className="mb-3.5 flex items-center justify-between gap-2.5">
            <h2 className="text-coffee font-serif text-[21px] font-normal">
              Tenant health — Psihointegritet
            </h2>
            <button
              type="button"
              onClick={() => toast.success("Označeno kao pregledano.")}
              className="border-coffee/15 text-ink-55 hover:border-badge-wait hover:text-coffee cursor-pointer rounded-full border bg-transparent px-[13px] py-1.5 text-[11.5px] font-semibold transition-colors"
            >
              Označi kao pregledano
            </button>
          </div>
          <div className="flex flex-col">
            {tenantHealthRows.map((row) => (
              <div
                key={row.label}
                className="border-line flex items-center justify-between gap-3 border-t py-[11px]"
              >
                <span className="text-coffee text-sm font-semibold">
                  {row.label}
                </span>
                <span className={cn("font-mono text-xs", TONE_CLASS[row.tone])}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-warm/16 border-warm/45 rounded-tile text-coffee mt-3.5 border px-4 py-3 text-[12.5px] leading-[1.55]">
            <span className="font-bold">Nalaz:</span> {tenantHealthFinding}
          </div>
        </div>
      </div>
    </>
  );
}
