import { describe, expect, it } from "vitest";

import {
  emptyRichDoc,
  richDocFromPlainText,
} from "@/lib/content-governance/rich-doc";

import {
  CONSENT_GATE_KINDS,
  REQUIRED_APPROVALS,
  applyTransition,
  canDelete,
  canTransition,
  checkPublishable,
  describePublishBlock,
  intakeGateOpen,
  isValidSlug,
  missingApprovals,
  nextVersionLabel,
  slugify,
  type ApprovalCapability,
  type LegalDocument,
  type LegalDocumentKind,
} from "./legal-documents";

function makeDocument(overrides: Partial<LegalDocument> = {}): LegalDocument {
  return {
    documentId: "doc-1",
    revisionId: "doc-1-r1",
    kind: "intake_data_processing_notice",
    title: "Obaveštenje o obradi podataka",
    slug: "obavestenje-o-obradi-podataka",
    body: richDocFromPlainText(
      "Tekst koji je dovoljno dugačak da prođe minimalnu proveru sadržaja.",
    ),
    status: "approved",
    approvals: ["legal", "clinical", "business"],
    versionLabel: "v1",
    updatedAt: "2026-07-26T09:00:00.000Z",
    ...overrides,
  };
}

const nextId = () => "generated-revision";

describe("lifecycle", () => {
  it("allows the documented path to publication", () => {
    expect(canTransition("draft", "in_review")).toBe(true);
    expect(canTransition("in_review", "approved")).toBe(true);
    expect(canTransition("approved", "published")).toBe(true);
    expect(canTransition("published", "archived")).toBe(true);
  });

  it("allows the documented returns to draft", () => {
    expect(canTransition("in_review", "draft")).toBe(true);
    expect(canTransition("approved", "draft")).toBe(true);
    expect(canTransition("archived", "draft")).toBe(true);
  });

  it("refuses to skip review", () => {
    expect(canTransition("draft", "published")).toBe(false);
  });

  it("refuses to pull a published revision back to draft", () => {
    expect(canTransition("published", "draft")).toBe(false);
  });
});

describe("canDelete (D-045 / A.1)", () => {
  it("allows hard delete only for drafts", () => {
    expect(canDelete("draft")).toBe(true);
    expect(canDelete("in_review")).toBe(false);
    expect(canDelete("approved")).toBe(false);
    expect(canDelete("published")).toBe(false);
    expect(canDelete("archived")).toBe(false);
  });
});

describe("applyTransition (A.2 revision semantics)", () => {
  it("returns null for a disallowed transition", () => {
    expect(
      applyTransition(makeDocument({ status: "draft" }), "published"),
    ).toBe(null);
  });

  it("keeps the same revision on the forward path", () => {
    const draft = makeDocument({ status: "draft", approvals: [] });
    const inReview = applyTransition(draft, "in_review");
    expect(inReview?.revisionId).toBe(draft.revisionId);
    expect(inReview?.versionLabel).toBe(draft.versionLabel);
  });

  it("keeps the same working revision on in_review → draft", () => {
    const document = makeDocument({
      status: "in_review",
      approvals: ["legal"],
    });
    const back = applyTransition(document, "draft", nextId);
    expect(back?.revisionId).toBe(document.revisionId);
    expect(back?.approvals).toEqual(["legal"]);
    expect(back?.versionLabel).toBe("v1");
  });

  it("issues a new revision without approvals on approved → draft", () => {
    const document = makeDocument({ status: "approved" });
    const reissued = applyTransition(document, "draft", nextId);
    expect(reissued?.revisionId).toBe("generated-revision");
    expect(reissued?.approvals).toEqual([]);
    expect(reissued?.versionLabel).toBe("v2");
    expect(reissued?.body).toBe(document.body);
  });

  it("never reopens an archived revision — archived → draft reissues", () => {
    const document = makeDocument({ status: "archived", versionLabel: "v3" });
    const reissued = applyTransition(document, "draft", nextId);
    expect(reissued?.revisionId).toBe("generated-revision");
    expect(reissued?.approvals).toEqual([]);
    expect(reissued?.versionLabel).toBe("v4");
  });

  it("keeps revision identity and approvals on published → archived", () => {
    const document = makeDocument({ status: "published" });
    const archived = applyTransition(document, "archived", nextId);
    expect(archived?.revisionId).toBe(document.revisionId);
    expect(archived?.approvals).toEqual(document.approvals);
  });
});

describe("nextVersionLabel", () => {
  it("increments v-labels and falls back to v1", () => {
    expect(nextVersionLabel("v1")).toBe("v2");
    expect(nextVersionLabel("v9")).toBe("v10");
    expect(nextVersionLabel("custom")).toBe("v1");
  });
});

describe("approvals", () => {
  it("requires legal, clinical and business for both consent texts", () => {
    for (const kind of CONSENT_GATE_KINDS) {
      expect(REQUIRED_APPROVALS[kind]).toEqual([
        "legal",
        "clinical",
        "business",
      ]);
    }
  });

  it("names exactly what is still missing", () => {
    expect(
      missingApprovals("intake_data_processing_notice", ["legal"]),
    ).toEqual(["clinical", "business"]);
  });

  it("never lets a kind publish without any approval at all", () => {
    const kinds = Object.keys(REQUIRED_APPROVALS) as LegalDocumentKind[];
    for (const kind of kinds) {
      expect(missingApprovals(kind, []).length).toBeGreaterThan(0);
    }
  });
});

describe("checkPublishable", () => {
  it("passes a complete, approved document", () => {
    expect(checkPublishable(makeDocument())).toEqual({ ok: true });
  });

  it("blocks on missing approvals and lists them", () => {
    const check = checkPublishable(makeDocument({ approvals: ["legal"] }));
    expect(check).toEqual({
      ok: false,
      block: { kind: "approvals", missing: ["clinical", "business"] },
    });
  });

  it("blocks a draft before it reaches review, even when fully approved", () => {
    const check = checkPublishable(makeDocument({ status: "draft" }));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.block.kind).toBe("transition");
  });

  it("blocks empty content before anything else", () => {
    const check = checkPublishable(
      makeDocument({ body: emptyRichDoc(), approvals: [] }),
    );
    expect(check.ok).toBe(false);
    // Content problems come first so the admin fixes the obvious gap first.
    if (!check.ok) expect(check.block.kind).toBe("content");
  });

  it("blocks an invalid slug", () => {
    const check = checkPublishable(makeDocument({ slug: "Ne Valja!" }));
    expect(check.ok).toBe(false);
    if (!check.ok && check.block.kind === "content") {
      expect(check.block.problems.join(" ")).toContain("Slug");
    }
  });
});

describe("describePublishBlock", () => {
  it("spells out which approvals are missing", () => {
    const document = makeDocument({ approvals: ["legal"] });
    const missing: ApprovalCapability[] = ["clinical", "business"];
    const described = describePublishBlock(document, {
      kind: "approvals",
      missing,
    });

    expect(described.title).toContain(document.title);
    expect(described.details.join(" ")).toContain("Stručno");
    expect(described.details.join(" ")).toContain("Poslovno");
  });

  it("explains a wrong lifecycle step with the current state", () => {
    const document = makeDocument({ status: "draft" });
    const described = describePublishBlock(document, {
      kind: "transition",
      from: "draft",
    });

    expect(described.description).toContain("Radna verzija");
  });
});

describe("intakeGateOpen", () => {
  it("stays closed while either consent text is unpublished", () => {
    const documents = [
      makeDocument({
        kind: "intake_data_processing_notice",
        status: "published",
      }),
      makeDocument({
        documentId: "doc-2",
        revisionId: "doc-2-r1",
        kind: "intake_request_acknowledgement",
        status: "draft",
      }),
    ];
    expect(intakeGateOpen(documents)).toBe(false);
  });

  it("stays closed when the documents do not exist at all", () => {
    expect(intakeGateOpen([])).toBe(false);
  });

  it("opens once both are published", () => {
    const documents = [
      makeDocument({
        kind: "intake_data_processing_notice",
        status: "published",
      }),
      makeDocument({
        documentId: "doc-2",
        revisionId: "doc-2-r1",
        kind: "intake_request_acknowledgement",
        status: "published",
      }),
    ];
    expect(intakeGateOpen(documents)).toBe(true);
  });
});

describe("slugs", () => {
  it("transliterates Serbian latin diacritics", () => {
    expect(slugify("Pravila zakazivanja i otkazivanja")).toBe(
      "pravila-zakazivanja-i-otkazivanja",
    );
    expect(slugify("Zaštita podataka — čuvanje")).toBe(
      "zastita-podataka-cuvanje",
    );
  });

  it("rejects slugs that are not url safe", () => {
    expect(isValidSlug("politika-privatnosti")).toBe(true);
    expect(isValidSlug("Politika Privatnosti")).toBe(false);
    expect(isValidSlug("-vodeca-crtica")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});
