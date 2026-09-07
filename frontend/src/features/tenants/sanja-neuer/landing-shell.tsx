"use client";

import type { ReactNode } from "react";

import { BookingProvider } from "@/features/tenants/sanja-neuer/booking/booking-context";
import { SanjaBookingModalMount } from "@/features/tenants/sanja-neuer/booking/booking-modal";
import { SanjaSiteHeader } from "@/features/tenants/sanja-neuer/layout/site-header";
import { SanjaStickyCtaBar } from "@/features/tenants/sanja-neuer/layout/sticky-cta-bar";

/**
 * The client boundary around an otherwise server-rendered page.
 *
 * The sections arrive as `children` and stay server components — copy, layout
 * and images are prerendered, and only the header, the sticky bar and the modal
 * hydrate. That is what lets this page keep its static build output while still
 * opening one modal from nine places.
 */
export function SanjaLandingShell({ children }: { children: ReactNode }) {
  return (
    <BookingProvider>
      <SanjaSiteHeader />
      {children}
      <SanjaStickyCtaBar />
      <SanjaBookingModalMount />
    </BookingProvider>
  );
}
