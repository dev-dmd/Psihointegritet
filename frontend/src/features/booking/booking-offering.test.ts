import { describe, expect, it } from "vitest";

import { deriveBookingSelectionPolicy } from "./booking-context";
import {
  buildBookingOfferings,
  findOfferingById,
  offeringsForTherapist,
  resolveCompatibleOffering,
  therapistIdsWithOfferings,
  type BookingOffering,
} from "./booking-offering";

const offerings: BookingOffering[] = [
  {
    id: "a__individualna__online",
    therapistId: "a",
    serviceId: "individualna",
    durationMinutes: 60,
    format: "online",
    priceAmount: 4000,
    currency: "RSD",
  },
  {
    id: "a__individualna__uzivo",
    therapistId: "a",
    serviceId: "individualna",
    durationMinutes: 60,
    format: "uzivo",
    priceAmount: 4000,
    currency: "RSD",
  },
  {
    id: "a__bracno__online",
    therapistId: "a",
    serviceId: "bracno",
    durationMinutes: 90,
    format: "online",
    priceAmount: 5500,
    currency: "RSD",
  },
  {
    id: "b__bracno__online",
    therapistId: "b",
    serviceId: "bracno",
    durationMinutes: 90,
    format: "online",
    priceAmount: 5500,
    currency: "RSD",
  },
];

describe("buildBookingOfferings", () => {
  it("only pairs a therapist with services they actually provide", () => {
    const built = buildBookingOfferings();
    expect(built.length).toBeGreaterThan(0);

    // Every generated pair must trace back to the therapist's own list —
    // this is the invariant that keeps „therapist A + service A does not
    // provide" unrepresentable.
    for (const offering of built) {
      const forTherapist = offeringsForTherapist(built, offering.therapistId);
      expect(forTherapist).toContain(offering);
    }
  });

  it("gives every offering a duration and a price, never a placeholder", () => {
    for (const offering of buildBookingOfferings()) {
      expect(offering.durationMinutes).toBeGreaterThan(0);
      expect(offering.priceAmount).toBeGreaterThan(0);
      expect(offering.currency).toBe("RSD");
    }
  });
});

describe("resolveCompatibleOffering", () => {
  it("keeps the same service and format when the new therapist provides it", () => {
    const result = resolveCompatibleOffering(offerings, {
      therapistId: "b",
      serviceId: "bracno",
      format: "online",
    });
    expect(result?.id).toBe("b__bracno__online");
  });

  it("falls back to another valid offering when the service is not provided", () => {
    const result = resolveCompatibleOffering(offerings, {
      therapistId: "b",
      serviceId: "individualna",
      format: "online",
    });
    // Never an offering belonging to somebody else, and never null-service.
    expect(result?.therapistId).toBe("b");
    expect(result?.serviceId).toBe("bracno");
  });

  it("keeps the service across a format change when possible", () => {
    const result = resolveCompatibleOffering(offerings, {
      therapistId: "a",
      serviceId: "individualna",
      format: "uzivo",
    });
    expect(result?.id).toBe("a__individualna__uzivo");
  });

  it("returns null for a therapist with no offerings so the caller can show the empty state", () => {
    const result = resolveCompatibleOffering(offerings, {
      therapistId: "unknown",
      serviceId: "bracno",
      format: "online",
    });
    expect(result).toBeNull();
  });
});

describe("offering queries", () => {
  it("narrows by format when one is given", () => {
    expect(offeringsForTherapist(offerings, "a", "online")).toHaveLength(2);
    expect(offeringsForTherapist(offerings, "a")).toHaveLength(3);
  });

  it("returns nothing for a null therapist", () => {
    expect(offeringsForTherapist(offerings, null)).toHaveLength(0);
  });

  it("resolves by id and tolerates a null id", () => {
    expect(findOfferingById(offerings, "a__bracno__online")?.serviceId).toBe(
      "bracno",
    );
    expect(findOfferingById(offerings, null)).toBeNull();
  });

  it("lists therapists in catalogue order from real offerings", () => {
    const ids = therapistIdsWithOfferings(buildBookingOfferings());
    expect(ids).toContain("maria-bullock");
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("deriveBookingSelectionPolicy", () => {
  it("locks both choices for Intake & Matching", () => {
    expect(deriveBookingSelectionPolicy("matching")).toEqual({
      therapist: "locked",
      service: "locked",
    });
  });

  it("leaves direct and therapist-profile entries fully editable", () => {
    for (const source of [
      "header",
      "homepage",
      "service",
      "therapist",
    ] as const) {
      expect(deriveBookingSelectionPolicy(source)).toEqual({
        therapist: "editable",
        service: "editable",
      });
    }
    expect(deriveBookingSelectionPolicy(null)).toEqual({
      therapist: "editable",
      service: "editable",
    });
  });

  it("supports the Compass shape without committing the widget to it", () => {
    expect(deriveBookingSelectionPolicy("compass")).toEqual({
      therapist: "editable",
      service: "compatible_only",
    });
  });
});
