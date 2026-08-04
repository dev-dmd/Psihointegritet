"use client";

import type { ApiContentFinding } from "../../content-api";
import { TechnicalDetails } from "../taxonomy-term-form/technical-details";

/**
 * What the server says is still wrong, said to an author (D-062).
 *
 * The six-type editor prints `BLOCK · MODEL-004 v1 · hero` as the headline.
 * That is the right amount of detail for whoever maintains the rules and the
 * wrong amount for whoever is writing the text, so the rule id, its version
 * and the field path move into „Tehnički detalji" and the sentence the rule
 * carries becomes the headline.
 */
export function KompasEditorHealth({
  findings,
  isLoading,
  isError,
}: {
  findings: readonly ApiContentFinding[];
  isLoading: boolean;
  isError: boolean;
}) {
  return (
    <section className="rounded-panel border-line bg-surface border px-5 py-4">
      <h2 className="text-forest font-serif text-[17px]">
        Šta još treba pre slanja na pregled
      </h2>

      {isLoading ? (
        <p className="text-ink-55 mt-2 text-[12.5px]">Provera u toku…</p>
      ) : isError ? (
        <p className="text-danger mt-2 text-[12.5px] leading-[1.5]">
          Provera trenutno nije dostupna. Možete nastaviti da pišete — pre
          objave sadržaj ionako proverava server.
        </p>
      ) : findings.length === 0 ? (
        <p className="text-ink-55 mt-2 text-[12.5px]">
          Poslednja sačuvana verzija nema otvorenih nalaza.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {findings.map((finding) => (
            <li
              key={`${finding.ruleId}-${finding.fieldPath ?? ""}-${finding.message}`}
              className={
                finding.severity === "error"
                  ? "border-danger/35 bg-danger/8 rounded-tile border px-4 py-3"
                  : "border-badge-amber/40 bg-badge-amber-bg rounded-tile border px-4 py-3"
              }
            >
              <p className="text-coffee text-[13px] font-semibold">
                {finding.message}
              </p>
              <p className="text-ink-70 mt-1 text-[12.5px] leading-[1.5]">
                {finding.remediation}
              </p>
              <TechnicalDetails summary="Detalji za podršku" className="mt-2">
                <p className="text-ink-55 font-mono text-[11.5px]">
                  {finding.ruleId} v{finding.ruleVersion}
                  {finding.fieldPath ? ` · ${finding.fieldPath}` : ""}
                  {finding.requiresApproval
                    ? ` · traži odobrenje: ${finding.requiresApproval}`
                    : ""}
                </p>
              </TechnicalDetails>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
