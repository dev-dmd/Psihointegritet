import { describe, expect, it } from "vitest";

import { extractTherapistSlug } from "./article-author-field";

// ---------------------------------------------------------------------------
// extractTherapistSlug
// ---------------------------------------------------------------------------

describe("extractTherapistSlug", () => {
  it("returns the slug from a valid CTA value", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        label: "Anja Stamenković",
        targetId: "therapist:anja-stamenkovic",
      }),
    ).toBe("anja-stamenkovic");
  });

  it("returns the slug from a CTA with marjan-jankovic", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        label: "Marjan Janković",
        targetId: "therapist:marjan-jankovic",
      }),
    ).toBe("marjan-jankovic");
  });

  it("returns null for null value", () => {
    expect(extractTherapistSlug(null)).toBeNull();
  });

  it("returns null for undefined value", () => {
    expect(extractTherapistSlug(undefined)).toBeNull();
  });

  it("returns null for a non-object value", () => {
    expect(extractTherapistSlug("some-string")).toBeNull();
  });

  it("returns null when targetId is missing", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        label: "Anja",
      }),
    ).toBeNull();
  });

  it("returns null when targetId is not a string", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        targetId: 123,
      }),
    ).toBeNull();
  });

  it("returns null when targetId prefix is not therapist", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        targetId: "service:individualna-psihoterapija",
      }),
    ).toBeNull();
  });

  it("returns null when targetId has no colon prefix", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        targetId: "anja-stamenkovic",
      }),
    ).toBeNull();
  });

  it("returns null for empty string targetId", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        targetId: "",
      }),
    ).toBeNull();
  });

  it("handles targetId with only prefix and colon", () => {
    expect(
      extractTherapistSlug({
        action: "VIEW_THERAPIST",
        targetId: "therapist:",
      }),
    ).toBeNull();
  });
});
