"use client";

import {
  mockBrand,
  mockService,
  mockSlots,
} from "@/features/booking-widget/booking-widget.mock-data";
import { BookingWidget } from "@/features/booking-widget/components/BookingWidget";
import type { BookingTherapist } from "@/features/booking-widget/booking-widget.types";

const anjaTherapist: BookingTherapist = {
  id: "therapist-1",
  slug: "anja-stamenkovic",
  name: "Anja Stamenković",
  avatarUrl: "/images/therapists/anja.jpeg",
};

interface TherapistBookingWidgetProps {
  therapistSlug?: string | undefined;
  source?: string | undefined;
}

/**
 * Read-only widget for direct therapist booking via `/zakazi?therapist=slug`.
 *
 * Service, duration and therapist profile are hardcoded (demo/MVP phase).
 * The Booking Engine backend is connected later (R2.5).
 */
export function TherapistBookingWidget({
  source,
}: TherapistBookingWidgetProps) {
  return (
    <div
      {...(source ? { "data-booking-source": source } : {})}
      className="mx-auto max-w-[1536px] px-5 md:px-8"
    >
      <BookingWidget
        variant="glass"
        brand={mockBrand}
        service={mockService}
        therapist={anjaTherapist}
        initialFormat="online"
        slots={mockSlots}
        showBrandPanel
        showTherapist
        showNotifyAction
        onCancel={() => {}}
        onNotify={() => {}}
        onSubmit={(payload) => {
          /* Booking Engine integration — R2.5 */
          void payload;
        }}
      />
    </div>
  );
}
