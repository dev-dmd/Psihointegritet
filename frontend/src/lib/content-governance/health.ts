import type {
  ContentEntity,
  ContentHealthFinding,
  ContentHealthReport,
  ContentProvider,
  RedirectRecord,
} from "./types";
import {
  type ContentValidationContext,
  validateContentCollection,
} from "./validation";

export function createContentHealthReport(
  entities: readonly ContentEntity[],
  redirects: readonly RedirectRecord[],
  context: ContentValidationContext,
  generatedAt = new Date().toISOString(),
): ContentHealthReport {
  const findings = validateContentCollection(entities, redirects, context);
  const summary = findings.reduce<ContentHealthReport["summary"]>(
    (current, item) => {
      current[item.severity] += 1;
      return current;
    },
    { info: 0, warning: 0, error: 0 },
  );

  return {
    schemaVersion: "1",
    generatedAt,
    summary,
    findings,
  };
}

export function hasContentHealthErrors(
  report: Pick<ContentHealthReport, "findings">,
): boolean {
  return report.findings.some(
    (finding: ContentHealthFinding) => finding.severity === "error",
  );
}

export function contentValidationContext(
  provider: ContentProvider,
  isKnownPublicRoute: (path: string) => boolean,
): ContentValidationContext {
  return { provider, isKnownPublicRoute };
}
