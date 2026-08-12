"use client";

import type { ApiImportDocxResult } from "../../legal-documents-api";

const IMPORT_FINDING_LABELS = {
  info: "Informacija",
  warning: "Upozorenje",
  error: "Greška",
} as const;

export function DocxImportFindings({
  result,
}: {
  result: ApiImportDocxResult;
}) {
  return (
    <ul className="mt-2 space-y-2 text-[12.5px] leading-[1.5]">
      {result.findings.map((finding, index) => (
        <li
          key={`${finding.ruleId}-${finding.fieldPath ?? ""}-${finding.message}-${index}`}
          className="border-line-strong rounded-tile border px-3 py-2"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-[0.04em] uppercase ${
                finding.severity === "error"
                  ? "bg-badge-danger-bg text-badge-danger"
                  : finding.severity === "warning"
                    ? "bg-badge-amber-bg text-badge-amber"
                    : "bg-badge-neutral-bg text-badge-neutral"
              }`}
            >
              {IMPORT_FINDING_LABELS[finding.severity]}
            </span>
            <code className="text-ink-55 text-[10.5px]">{finding.ruleId}</code>
          </div>
          <p className="text-coffee mt-1.5 font-medium">{finding.message}</p>
          {finding.remediation ? (
            <p className="text-ink-70 mt-1">
              Šta uraditi: {finding.remediation}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
