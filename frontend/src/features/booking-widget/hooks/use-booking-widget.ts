"use client";

import { useContext } from "react";

import { BookingWidgetContext } from "../providers/booking-widget-provider";

export function useBookingWidget() {
  const context = useContext(BookingWidgetContext);

  if (!context) {
    throw new Error(
      "useBookingWidget must be used inside BookingWidgetProvider.",
    );
  }

  return context;
}
