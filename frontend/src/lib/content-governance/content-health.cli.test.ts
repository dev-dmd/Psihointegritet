import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createContentHealthReport } from "./health";
import {
  CmsContentProvider,
  parsePublishedContentOverrides,
} from "./cms-provider";
import {
  isKnownPublicRoute,
  redirectRegistry,
  staticContentProvider,
} from "./static-provider";

const artifactPath = resolve(
  process.cwd(),
  "artifacts/content-health-report.json",
);

describe("content:check", () => {
  it("writes a machine-readable report and rejects Content Health errors", async () => {
    let provider = staticContentProvider;
    if (process.env.npm_lifecycle_event === "content:check") {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error(
          "NEXT_PUBLIC_API_URL je obavezan da content:check proveri CMS izvor.",
        );
      }
      const response = await fetch(
        `${apiUrl}/api/v1/public/content/published?locale=sr-Latn`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          `CMS izvor nije dostupan za content:check (${response.status}).`,
        );
      }
      const revisions = parsePublishedContentOverrides(await response.json());
      if (!revisions) {
        throw new Error("CMS izvor je vratio nevažeći published payload.");
      }
      provider = new CmsContentProvider(staticContentProvider, revisions);
    }

    const report = createContentHealthReport(
      provider.listAll(),
      redirectRegistry,
      { provider, isKnownPublicRoute },
    );

    mkdirSync(dirname(artifactPath), { recursive: true });
    writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);

    console.info(
      `Content Health: ${report.summary.error} error, ${report.summary.warning} warning, ${report.summary.info} info`,
    );
    expect(report.summary.error).toBe(0);
  });
});
