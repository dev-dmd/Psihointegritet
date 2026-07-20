import { describe, expect, it } from "vitest";

import { parseRoleMetadata } from "./public-metadata";

describe("parseRoleMetadata", () => {
  it("parses the superadmin shape", () => {
    expect(parseRoleMetadata({ superadmin: true })).toEqual({
      superadmin: true,
      roles: [],
      org: "psihointegritet",
    });
  });

  it("parses the staff roles shape", () => {
    expect(
      parseRoleMetadata({
        roles: ["org_admin", "therapist"],
        org: "psihointegritet",
      }),
    ).toEqual({
      superadmin: false,
      roles: ["org_admin", "therapist"],
      org: "psihointegritet",
    });
  });

  it("defaults to no roles for missing metadata", () => {
    for (const input of [undefined, null, {}]) {
      expect(parseRoleMetadata(input)).toEqual({
        superadmin: false,
        roles: [],
        org: "psihointegritet",
      });
    }
  });

  it("degrades garbage input to no roles, never elevated access", () => {
    for (const input of [
      "superadmin",
      42,
      { superadmin: "true" },
      { roles: "org_admin" },
      { roles: [123] },
    ]) {
      expect(parseRoleMetadata(input)).toEqual({
        superadmin: false,
        roles: [],
        org: "psihointegritet",
      });
    }
  });

  it("rejects unknown role strings", () => {
    expect(parseRoleMetadata({ roles: ["vlasnik"] }).roles).toEqual([]);
  });

  it("defaults org to psihointegritet when omitted", () => {
    expect(parseRoleMetadata({ roles: ["therapist"] }).org).toBe(
      "psihointegritet",
    );
  });
});
