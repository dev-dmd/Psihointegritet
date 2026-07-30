import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createContentHealthReport } from "./health";
import {
  isKnownPublicRoute,
  redirectRegistry,
  staticContentEntities,
  staticContentProvider,
} from "./static-provider";

const artifactPath = resolve(
  process.cwd(),
  "artifacts/content-health-report.json",
);

describe("content:check", () => {
  it("writes a machine-readable report and rejects Content Health errors", () => {
    const report = createContentHealthReport(
      staticContentEntities,
      redirectRegistry,
      { provider: staticContentProvider, isKnownPublicRoute },
    );

    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);

    console.info(
      `Content Health: ${report.summary.error} error, ${report.summary.warning} warning, ${report.summary.info} info`,
    );
    expect(report.summary.error).toBe(0);
  });
});
