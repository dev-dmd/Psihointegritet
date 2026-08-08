"use client";

import { useState } from "react";

import { BookingWidget } from "./BookingWidget";
import {
  mockBrand,
  mockServices,
  mockSlots,
  mockTherapists,
} from "../booking-widget.mock-data";
import type {
  BookingWidgetSubmitPayload,
  BookingWidgetVariant,
} from "../booking-widget.types";

const variants: BookingWidgetVariant[] = ["glass", "light", "dark"];

export function BookingWidgetDemo() {
  const [message, setMessage] = useState("");

  const handleSubmit =
    (variant: BookingWidgetVariant) =>
    (payload: BookingWidgetSubmitPayload) => {
      setMessage(
        `${variant} demo: izabran je slot ${payload.slotId ?? "nije izabran"}.`,
      );
    };

  return (
    <div className="space-y-5">
      <p aria-live="polite" className="sr-only">
        {message}
      </p>
      {variants.map((variant) => (
        <BookingWidget
          key={variant}
          variant={variant}
          brand={mockBrand}
          services={mockServices}
          therapists={mockTherapists}
          initialFormat="online"
          slots={mockSlots}
          onCancel={() => setMessage(`${variant} demo: izbor je poništen.`)}
          onNotify={() =>
            setMessage(`${variant} demo: Notify Me callback je pozvan.`)
          }
          onSubmit={handleSubmit(variant)}
        />
      ))}
    </div>
  );
}
