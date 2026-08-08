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
        <div className="animate-slide-up fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-coffee/45"
                onClick={onBack}
                aria-hidden="true"
            />
            <div
                className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[28px] border p-6 sm:p-7 shadow-hero-card scrollbar-hide"
                style={{
                    background: "linear-gradient(135deg, rgb(from var(--color-surface) r g b / 0.88), rgb(from var(--color-canvas) r g b / 0.72)), var(--color-canvas)",
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
