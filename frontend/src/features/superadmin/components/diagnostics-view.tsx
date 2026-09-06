"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { KV } from "@/components/panel/kv";
import { useUserSafeError } from "@/lib/errors/use-user-safe-error";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/panel/status-badge";

import { APP_VERSION, app24h, healthServices } from "../data";
import type { DiagnosticResult } from "../diagnostics-api";
import {
  useDiagnosticsRegistryQuery,
  useRunDiagnosticsMutation,
} from "../hooks/use-diagnostics";
import { HealthCard } from "./health-card";
import { PageHeader } from "./page-header";

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  ok: "ok",
  info: "wait",
  warning: "wait",
  error: "danger",
  failed: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "U redu",
  info: "Info",
  warning: "Upozorenje",
  error: "Greška",
  failed: "Neuspešno",
};

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** One collector outcome row — never renders client PII, only safe sample IDs. */
function DiagnosticResultRow({ result }: { result: DiagnosticResult }) {
  const hasFindings = result.affectedCount > 0 && result.sampleRows.length > 0;
  return (
    <div className="border-line border-t py-[11px]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-coffee text-sm font-semibold">{result.key}</p>
          <p className="text-ink-55 text-[12.5px] leading-[1.5]">
            {result.summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-coffee/50 font-mono text-[11.5px]">
            {result.affectedCount} nalaza · {fmtDuration(result.durationMs)}
          </span>
          <StatusBadge tone={STATUS_TONE[result.status] ?? "wait"}>
            {STATUS_LABEL[result.status] ?? result.status}
          </StatusBadge>
        </div>
      </div>
      {result.suggestion ? (
        <p className="bg-warm/16 border-warm/45 rounded-tile text-coffee mt-2 border px-3 py-2 text-[12px] leading-[1.5]">
          <span className="font-bold">Predlog:</span> {result.suggestion}
        </p>
      ) : null}
      {hasFindings ? (
        <details className="text-ink-55 mt-1.5 text-[12px]">
          <summary className="cursor-pointer font-mono">
            tehnički detalji
          </summary>
          <ul className="mt-1.5 flex flex-col gap-1 pl-1">
            {result.sampleRows.map((row, index) => (
              <li
                key={index}
                className="font-mono text-[11.5px] leading-[1.45]"
              >
                {JSON.stringify(row)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

/**
 * Diagnostics screen — „Pokreni proveru" now runs the real Diagnostic Engine
 * (booking collectors) through the superadmin API instead of a demo spinner.
 * The registry list loads via a query; the run is a mutation whose result is
 * cached per scope. Platform health cards stay demo until R6.
 */
export function DiagnosticsView() {
  const safeError = useUserSafeError();
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  const registryQuery = useDiagnosticsRegistryQuery();
  const runMutation = useRunDiagnosticsMutation();

  const runCheck = () => {
    runMutation.mutate(
      { category: "booking", mode: "compact", organizationId: null },
      {
        onSuccess: () => {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, "0");
          const mm = String(now.getMinutes()).padStart(2, "0");
          setLastCheck(`danas · ${hh}:${mm}`);
          toast.success("Provera završena.");
        },
        onError: (error) =>
          toast.error(safeError.text(error, "diagnostics", "run")),
      },
    );
  };

  const bookingResults = useMemo(() => {
    const run = runMutation.data;
    if (!run) return null;
    const list = run.results.filter((r) => r.key.startsWith("booking."));
    return list.length > 0 ? list : run.results;
  }, [runMutation.data]);

  const copyTechData = async () => {
    const lines = [
      `Psihointegritet dijagnostika · ${APP_VERSION}`,
      `poslednja provera: ${lastCheck ?? "nije pokrenuta"}`,
      ...healthServices.map(
        (service) => `${service.name}: ${service.status} (${service.meta})`,
      ),
      ...(bookingResults
        ? bookingResults.map(
            (r) => `${r.key}: ${r.status} (${r.affectedCount} nalaza)`,
          )
        : []),
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
          {runMutation.isPending ? (
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
              disabled={registryQuery.isLoading}
              className="bg-coffee text-panel-canvas hover:bg-coffee-hover min-h-11 cursor-pointer rounded-full border-0 px-[22px] py-[11px] text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
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
          <HealthCard
            title="Servisi"
            lastCheck={lastCheck ?? "nije pokrenuta"}
          />
          <div className="rounded-panel border-line bg-surface border px-6 py-[22px]">
            <h2 className="text-coffee mb-3.5 font-serif text-[21px] font-normal">
              Registrovane provere
            </h2>
            {registryQuery.isLoading ? (
              <p className="text-ink-55 text-[13px]">Učitavanje registra…</p>
            ) : registryQuery.isError ? (
              <p className="text-danger text-[13px]">
                Registar nije dostupan. Proverite backend servis.
              </p>
            ) : (
              <div className="flex flex-col">
                {registryQuery.data?.map((definition) => (
                  <div
                    key={definition.key}
                    className="border-line flex items-center justify-between gap-3 border-t py-[11px]"
                  >
                    <div className="min-w-0">
                      <p className="text-coffee text-sm font-semibold">
                        {definition.label}
                      </p>
                      <p className="text-ink-55 text-[12.5px] leading-[1.5]">
                        {definition.key}
                      </p>
                    </div>
                    <span className="text-coffee/50 shrink-0 font-mono text-[11.5px]">
                      {definition.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              Booking integritet — nalazi
            </h2>
            {runMutation.data ? (
              <span className="text-coffee/50 font-mono text-[11px]">
                poslednja provera {lastCheck ?? "sada"}
              </span>
            ) : null}
          </div>
          {runMutation.isPending ? (
            <p className="text-ink-55 text-[13px]">Provera u toku…</p>
          ) : runMutation.isError ? (
            <p className="text-danger text-[13px]">
              Provera nije uspela. Proverite backend servis.
            </p>
          ) : bookingResults ? (
            <div className="flex flex-col">
              {bookingResults.map((result) => (
                <DiagnosticResultRow key={result.key} result={result} />
              ))}
            </div>
          ) : (
            <div className="bg-warm/16 border-warm/45 rounded-tile text-coffee mt-3.5 border px-4 py-3 text-[12.5px] leading-[1.55]">
              Pritisnite <span className="font-bold">„Pokreni proveru”</span> da
              izvršite read-only integrity proveru Booking domena (preklapanje
              termina, duplikati konfiguracija, nesaglasni zahtevi, zaglavljeni
              hold-ovi). Nalazi ne sadrže podatke o klijentima.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
