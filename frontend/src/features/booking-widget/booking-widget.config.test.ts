import { describe, expect, it } from "vitest";

import {
  formatBookingPrice,
  parseBookingWidgetSearchParams,
} from "./booking-widget.config";

describe("parseBookingWidgetSearchParams", () => {
  it("keeps only the allowlisted public booking context", () => {
    const result = parseBookingWidgetSearchParams(
      new URLSearchParams(
        "service=bracno-savetovanje&therapist=marjan-jankovic&format=uzivo&source=matching",
      ),
    );

    expect(result).toEqual({
      serviceSlug: "bracno-savetovanje",
      therapistSlug: "marjan-jankovic",
      format: "uzivo",
      source: "matching",
    });
  });

  it("drops an unsupported format instead of passing it into the widget", () => {
    const result = parseBookingWidgetSearchParams(
      new URLSearchParams("format=teleport"),
    );

    expect(result.format).toBeNull();
  });
});

describe("formatBookingPrice", () => {
  it("formats RSD prices in the public Serbian locale", () => {
    expect(formatBookingPrice(5500, "RSD")).toBe("5.500 RSD");
  });
});
