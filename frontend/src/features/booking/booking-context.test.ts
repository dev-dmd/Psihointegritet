import { describe, expect, it } from "vitest";

import { buildBookingHref, parseBookingContext } from "./booking-context";

describe("booking context", () => {
  it("accepts a known service, therapist, format and source", () => {
    const context = parseBookingContext({
      service: "individualna-psihoterapija",
      therapist: "anja-stamenkovic",
      format: "online",
      source: "matching",
    });

    expect(context).toMatchObject({
      serviceSlug: "individualna-psihoterapija",
      therapistSlug: "anja-stamenkovic",
      format: "online",
      source: "matching",
      messages: [],
    });
  });

  it("drops an unknown service without breaking the form", () => {
    const context = parseBookingContext({ service: "ne-postoji" });

    expect(context.serviceSlug).toBeNull();
    expect(context.messages.join(" ")).toContain("usluga");
  });

  it("drops an unknown therapist without breaking the form", () => {
    const context = parseBookingContext({ therapist: "ne-postoji" });

    expect(context.therapistSlug).toBeNull();
    expect(context.messages.join(" ")).toContain("terapeut");
  });

  it("keeps the service but clears an incompatible therapist", () => {
    const context = parseBookingContext({
      service: "bracno-savetovanje",
      therapist: "marija-stamenkovic",
    });

    expect(context.serviceSlug).toBe("bracno-savetovanje");
    expect(context.therapistSlug).toBeNull();
    expect(context.messages.join(" ")).toContain("kombinacija");
  });

  it("only accepts the allowed format and source values", () => {
    const valid = parseBookingContext({ format: "uzivo", source: "header" });
    const invalid = parseBookingContext({
      format: "telefon",
      source: "campaign",
    });

    expect(valid.format).toBe("uzivo");
    expect(valid.source).toBe("header");
    expect(invalid.format).toBeNull();
    expect(invalid.source).toBeNull();
    expect(invalid.messages.join(" ")).toContain("način rada");
  });

  it("creates a URL from allowlisted identifiers only", () => {
    const unsafeContext = {
      service: "individualna-psihoterapija",
      therapist: "anja-stamenkovic",
      format: "online" as const,
      source: "matching" as const,
      email: "petar@example.com",
      freeText: "Ne želim da ovo bude u URL-u",
    };

    const href = buildBookingHref(unsafeContext);

    expect(href).toBe(
      "/zakazi?service=individualna-psihoterapija&therapist=anja-stamenkovic&format=online&source=matching",
    );
    expect(href).not.toContain("example.com");
    expect(href).not.toContain("Ne%20%C5%BEelim");
  });
});
