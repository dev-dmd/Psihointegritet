import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bookingWidgetThemes } from "./booking-widget.variants";
import {
  BookingWidgetConfirmation,
  type ConfirmationDetails,
} from "./components/BookingWidgetConfirmation";

function details(
  overrides: Partial<ConfirmationDetails> = {},
): ConfirmationDetails {
  return {
    treatmentName: "Individualna psihoterapija",
    durationMinutes: 60,
    price: 4000,
    currency: "RSD",
    date: "2026-08-11",
    startTime: "09:00",
    endTime: "10:00",
    format: "online",
    therapistName: "Maria Bullock",
    clientName: "Petar Petrović",
    clientEmail: "petar@example.com",
    requestId: "req-1",
    ...overrides,
  };
}

function renderConfirmation(overrides: Partial<ConfirmationDetails> = {}) {
  render(
    <BookingWidgetConfirmation
      theme={bookingWidgetThemes.glass}
      details={details(overrides)}
    />,
  );
}

describe("booking confirmation preview", () => {
  it("states the format next to the date and time", () => {
    renderConfirmation();
    expect(
      screen.getByText("11.08.2026 · 09:00 – 10:00 · Online"),
    ).toBeInTheDocument();
  });

  it("says Uživo for an in-person booking", () => {
    renderConfirmation({ format: "uzivo" });
    expect(screen.getByText(/· Uživo$/)).toBeInTheDocument();
  });

  it("drops the time half instead of showing a dangling dash", () => {
    // Reproduces the „11.08.2026 · –" line: no slot time ever reached us.
    renderConfirmation({ startTime: "", endTime: "" });

    expect(screen.getByText("11.08.2026 · Online")).toBeInTheDocument();
    expect(screen.queryByText(/–/)).not.toBeInTheDocument();
  });
});
