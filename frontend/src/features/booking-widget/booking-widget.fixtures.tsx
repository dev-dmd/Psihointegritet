import { render, screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { expect } from "vitest";

import type { BookingSelectionPolicy } from "@/features/booking/booking-context";

import { mockBrand } from "./booking-widget.mock-data";
import type {
  BookingSlot,
  BookingTherapist,
  BookingWidgetOffering,
} from "./booking-widget.types";
import { BookingWidget } from "./components/BookingWidget";

/** Shared fixtures for the Booking Widget specs. */

function tomorrow(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export const slots: BookingSlot[] = ["09:00", "10:00"].map((startTime) => ({
  id: `slot-${startTime}`,
  date: tomorrow(),
  startTime,
  endTime: startTime,
  available: true,
}));

export const therapists: BookingTherapist[] = [
  {
    id: "maria",
    slug: "maria",
    name: "Maria Bullock",
    firstNameGenitive: "Marije",
    title: "Geštalt psihoterapeutkinja",
  },
  {
    id: "john",
    slug: "john",
    name: "John Francis",
    firstNameGenitive: "Johna",
    title: "Psiholog",
  },
];

function offering(
  therapistId: string,
  serviceId: string,
  serviceName: string,
  durationMinutes = 60,
  format: "online" | "uzivo" = "online",
): BookingWidgetOffering {
  return {
    id: `${therapistId}__${serviceId}__${format}`,
    therapistId,
    serviceId,
    serviceName,
    durationMinutes,
    format,
    priceAmount: 4000,
    currency: "RSD",
  };
}

export const offerings: BookingWidgetOffering[] = [
  offering("maria", "individualna", "Individualna psihoterapija"),
  offering("maria", "individualna", "Individualna psihoterapija", 60, "uzivo"),
  offering("maria", "bracno", "Bračno savetovanje", 90),
  offering("maria", "bracno", "Bračno savetovanje", 90, "uzivo"),
  offering("john", "bracno", "Bračno savetovanje", 90),
];

export const editable: BookingSelectionPolicy = {
  therapist: "editable",
  service: "editable",
};
export const locked: BookingSelectionPolicy = {
  therapist: "locked",
  service: "locked",
};

export function renderWidget(
  policy: BookingSelectionPolicy,
  extra: Partial<Parameters<typeof BookingWidget>[0]> = {},
) {
  return render(
    <BookingWidget
      variant="glass"
      brand={mockBrand}
      offerings={offerings}
      therapists={therapists}
      selectionPolicy={policy}
      slots={slots}
      initialFormat="online"
      {...extra}
    />,
  );
}

export function offeringsGroup() {
  return screen.getByRole("radiogroup", { name: /Usluge kod/ });
}

export async function selectFirstSlot(
  user: ReturnType<typeof userEvent.setup>,
) {
  const slot = screen.getByRole("button", { name: "09:00" });
  await user.click(slot);
  expect(slot).toHaveAttribute("aria-pressed", "true");
}
