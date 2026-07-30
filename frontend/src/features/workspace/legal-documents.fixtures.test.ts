import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { emptyRichDoc, type RichDoc } from "@/lib/content-governance/rich-doc";

import {
  applyTransition,
  canDelete,
  canTransition,
  checkPublishable,
  contentProblems,
  intakeGateOpen,
  missingApprovals,
  type ApprovalCapability,
  type LegalDocument,
  type LegalDocumentKind,
  type RevisionStatus,
} from "./legal-documents";

/**
 * Parity loader (contract A.5, CG-A2): reads the SAME physical fixture file
 * as backend/tests/unit/test_legal_publication_fixtures.py. TS and Python are
 * separate implementations of one governed contract (ADR-016 §5); a diverging
 * result for any caseId fails CI on whichever side drifted.
 */

interface FixtureCase {
  caseId: string;
  description: string;
  action: string;
  input: {
    from?: RevisionStatus;
    to?: RevisionStatus;
    kind?: LegalDocumentKind;
    status?: RevisionStatus;
    title?: string;
    slug?: string;
    body?: RichDoc;
    approvals?: ApprovalCapability[];
    publishedKinds?: LegalDocumentKind[];
    fromStatus?: RevisionStatus;
    approvalsBeforeReissue?: ApprovalCapability[];
  };
  skipReason?: string;
  expectedTransitionAllowed?: boolean;
  expectedPublishAllowed?: boolean;
  expectedStage?: "content" | "transition" | "approvals" | null;
  expectedContentProblems?: string[];
  expectedMissingCapabilities?: ApprovalCapability[];
  expectedRequiredCapabilities?: ApprovalCapability[];
  expectedDeleteAllowed?: boolean;
  expectedGateOpen?: boolean;
}

interface FixtureFile {
  fixtureSchemaVersion: string;
  cases: FixtureCase[];
}

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../contracts/fixtures/legal-publication.v1.json",
);

// Repo-internal trusted file; the cast is the boundary adapter for JSON.parse.
const fixtures = JSON.parse(readFileSync(fixturePath, "utf-8")) as FixtureFile;

function documentFrom(input: FixtureCase["input"]): LegalDocument {
  return {
    documentId: "fixture-doc",
    revisionId: "fixture-doc-r1",
    kind: input.kind ?? "intake_data_processing_notice",
    management: "document",
    title: input.title ?? "",
    slug: input.slug ?? "",
    body: input.body ?? emptyRichDoc(),
    status: input.status ?? "draft",
    approvals: input.approvals ?? [],
    versionLabel: "v1",
    updatedAt: "2026-07-26T09:00:00.000Z",
  };
}

function gateDocuments(kinds: LegalDocumentKind[]): LegalDocument[] {
  return kinds.map((kind, index) =>
    documentFrom({ kind, status: "published", title: `Dokument ${index}` }),
  );
}

describe(`legal-publication parity fixtures (schema v${fixtures.fixtureSchemaVersion})`, () => {
  it("loaded a non-empty case list", () => {
    expect(fixtures.cases.length).toBeGreaterThan(0);
  });

  for (const fixtureCase of fixtures.cases) {
    const { caseId, description, action, input } = fixtureCase;
    const name = `${caseId}: ${description}`;

    if (fixtureCase.skipReason) {
      it.skip(`${name} — ${fixtureCase.skipReason}`, () => {});
      continue;
    }

    if (action === "transition-check") {
      it(name, () => {
        expect(canTransition(input.from!, input.to!)).toBe(
          fixtureCase.expectedTransitionAllowed,
        );
      });
      continue;
    }

    if (action === "publish-check") {
      it(name, () => {
        const document = documentFrom(input);
        const check = checkPublishable(document);
        expect(check.ok).toBe(fixtureCase.expectedPublishAllowed);
        const stage = check.ok ? null : check.block.kind;
        expect(stage).toBe(fixtureCase.expectedStage);
        expect(contentProblems(document)).toEqual(
          fixtureCase.expectedContentProblems,
        );
        const missing =
          !check.ok && check.block.kind === "approvals"
            ? [...check.block.missing].sort()
            : [];
        expect(missing).toEqual(fixtureCase.expectedMissingCapabilities);
      });
      continue;
    }

    if (action === "required-approvals-check") {
      it(name, () => {
        expect([...missingApprovals(input.kind!, [])].sort()).toEqual(
          fixtureCase.expectedRequiredCapabilities,
        );
      });
      continue;
    }

    if (action === "reissue-approvals-check") {
      it(name, () => {
        const before = documentFrom({
          kind: input.kind!,
          status: input.fromStatus!,
          approvals: input.approvalsBeforeReissue!,
        });
        const reissued = applyTransition(before, "draft", () => "r2");
        expect(reissued).not.toBeNull();
        expect(reissued!.approvals).toEqual([]);
        expect(
          [...missingApprovals(input.kind!, reissued!.approvals)].sort(),
        ).toEqual(fixtureCase.expectedRequiredCapabilities);
      });
      continue;
    }

    if (action === "delete-check") {
      it(name, () => {
        expect(canDelete(input.status!)).toBe(
          fixtureCase.expectedDeleteAllowed,
        );
      });
      continue;
    }

    if (action === "gate-check") {
      it(name, () => {
        expect(intakeGateOpen(gateDocuments(input.publishedKinds ?? []))).toBe(
          fixtureCase.expectedGateOpen,
        );
      });
      continue;
    }

    it(name, () => {
      throw new Error(`Unknown fixture action: ${action}`);
    });
  }
});
