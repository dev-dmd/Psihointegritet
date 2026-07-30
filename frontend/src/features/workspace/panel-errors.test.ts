import type { Route } from "next";
import { describe, expect, it } from "vitest";

import {
  removeResourceErrors,
  resourceKey,
  selectErrorsFor,
  upsertError,
  type PanelError,
  type PanelErrorResource,
} from "./panel-errors";

const DOCS = "/radni-prostor/dokumenti" as Route;
const SERVICES = "/radni-prostor/usluge" as Route;

function makeError(overrides: Partial<PanelError> = {}): PanelError {
  return {
    id: "e-1",
    href: DOCS,
    tabLabel: "Dokumenti i saglasnosti",
    title: "Nedostaju odobrenja",
    description: "Objava je zaustavljena.",
    details: [],
    createdAt: "2026-07-26T10:00:00.000Z",
    ...overrides,
  };
}

function makeResource(
  overrides: Partial<PanelErrorResource> = {},
): PanelErrorResource {
  return {
    organizationId: "psihointegritet",
    resourceType: "legal_document",
    resourceId: "doc-1",
    revisionId: "doc-1-r1",
    ruleId: "APP-001",
    fieldPath: "body",
    ...overrides,
  };
}

function structuredError(
  resource: PanelErrorResource,
  overrides: Partial<PanelError> = {},
): PanelError {
  return makeError({ id: resourceKey(resource), resource, ...overrides });
}

describe("selectErrorsFor", () => {
  it("returns only the errors owned by that tab", () => {
    const errors = [makeError(), makeError({ id: "e-2", href: SERVICES })];
    expect(selectErrorsFor(errors, DOCS)).toHaveLength(1);
    expect(selectErrorsFor(errors, SERVICES)[0]?.id).toBe("e-2");
  });

  it("returns nothing for a clean tab", () => {
    expect(selectErrorsFor([makeError()], SERVICES)).toEqual([]);
  });
});

describe("upsertError", () => {
  it("does not stack duplicates when the same action fails twice", () => {
    const first = makeError({ createdAt: "2026-07-26T10:00:00.000Z" });
    const retry = makeError({ createdAt: "2026-07-26T10:05:00.000Z" });

    const result = upsertError(upsertError([], first), retry);

    expect(result).toHaveLength(1);
    expect(result[0]?.createdAt).toBe("2026-07-26T10:05:00.000Z");
  });

  it("keeps distinct failures on the same tab", () => {
    const approvals = makeError({ title: "Nedostaju odobrenja" });
    const content = makeError({ title: "Nepotpun sadržaj" });

    expect(upsertError(upsertError([], approvals), content)).toHaveLength(2);
  });

  it("keeps the same title on different tabs apart", () => {
    const onDocs = makeError();
    const onServices = makeError({ href: SERVICES });

    expect(upsertError(upsertError([], onDocs), onServices)).toHaveLength(2);
  });

  it("puts the newest error first", () => {
    const older = makeError({ title: "Prva" });
    const newer = makeError({ title: "Druga" });

    expect(upsertError(upsertError([], older), newer)[0]?.title).toBe("Druga");
  });
});

describe("structured resource identity (A.6)", () => {
  it("upserts on the full resource tuple", () => {
    const resource = makeResource();
    const first = structuredError(resource, {
      createdAt: "2026-07-26T10:00:00.000Z",
    });
    const retry = structuredError(resource, {
      createdAt: "2026-07-26T10:05:00.000Z",
    });

    const result = upsertError(upsertError([], first), retry);
    expect(result).toHaveLength(1);
    expect(result[0]?.createdAt).toBe("2026-07-26T10:05:00.000Z");
  });

  it("never overwrites a finding of another revision", () => {
    const r1 = structuredError(makeResource({ revisionId: "doc-1-r1" }));
    const r2 = structuredError(makeResource({ revisionId: "doc-1-r2" }));

    expect(upsertError(upsertError([], r1), r2)).toHaveLength(2);
  });

  it("never overwrites the same rule's finding on another field", () => {
    const body = structuredError(makeResource({ fieldPath: "body" }));
    const title = structuredError(makeResource({ fieldPath: "title" }));

    expect(upsertError(upsertError([], body), title)).toHaveLength(2);
  });

  it("keeps structured and structureless errors from colliding", () => {
    const structured = structuredError(makeResource(), {
      title: "Nedostaju odobrenja",
    });
    const freeform = makeError({ title: "Nedostaju odobrenja" });

    expect(upsertError(upsertError([], structured), freeform)).toHaveLength(2);
  });

  it("clears only the matching resource/revision, not the whole tab", () => {
    const target = structuredError(makeResource());
    const otherDocument = structuredError(
      makeResource({ resourceId: "doc-2" }),
    );
    const otherRevision = structuredError(
      makeResource({ revisionId: "doc-1-r2", ruleId: "LIFE-001" }),
    );
    const freeform = makeError({ title: "Slobodna poruka" });
    const errors = [target, otherDocument, otherRevision, freeform];

    const remaining = removeResourceErrors(errors, makeResource());

    expect(remaining).toHaveLength(3);
    expect(remaining).not.toContain(target);
    expect(remaining).toContain(otherDocument);
    expect(remaining).toContain(otherRevision);
    expect(remaining).toContain(freeform);
  });

  it("clears every rule/field finding of the same revision at once", () => {
    const appRule = structuredError(makeResource({ ruleId: "APP-001" }));
    const lifeRule = structuredError(
      makeResource({ ruleId: "LIFE-002", fieldPath: "status" }),
    );

    const remaining = removeResourceErrors([appRule, lifeRule], makeResource());
    expect(remaining).toHaveLength(0);
  });
});
