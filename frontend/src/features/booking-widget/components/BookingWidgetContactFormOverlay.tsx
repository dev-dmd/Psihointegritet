"use client";

import { BookingWidgetContactForm } from "./BookingWidgetContactForm";
import type { ContactFormData } from "./BookingWidgetContactForm";
import type { BookingWidgetTheme } from "../booking-widget.types";

interface BookingWidgetContactFormOverlayProps {
  theme: BookingWidgetTheme;
  onBack: () => void;
  onSubmit: (data: ContactFormData) => void;
  isSubmitting: boolean;
  error: string | null;
  /** Pre-fill name (e.g. from Clerk signed-in user). */
  initialName?: string | undefined;
  /** Pre-fill email (e.g. from Clerk signed-in user). */
  initialEmail?: string | undefined;
}

/**
 * Bottom-sheet modal that slides the contact form up as an overlay while
 * the BookingWidget stays mounted underneath (preserving slot / therapist
 * / service selection).
 */
export function BookingWidgetContactFormOverlay({
  theme,
  onBack,
  onSubmit,
  isSubmitting,
  error,
  initialName,
  initialEmail,
}: BookingWidgetContactFormOverlayProps) {
  return (
    <div className="animate-slide-up fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="bg-coffee/45 fixed inset-0"
        onClick={onBack}
        aria-hidden="true"
      />
      <div
        className="shadow-hero-card scrollbar-hide relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[28px] border p-6 sm:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgb(from var(--color-surface) r g b / 0.88), rgb(from var(--color-canvas) r g b / 0.72)), var(--color-canvas)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <BookingWidgetContactForm
          theme={theme}
          onBack={onBack}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          error={error}
          initialName={initialName}
          initialEmail={initialEmail}
        />
      </div>
    </div>
  );
}
