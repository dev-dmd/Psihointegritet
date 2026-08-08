"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";

import { BookingWidgetConfirmation } from "./BookingWidgetConfirmation";
import type { ConfirmationDetails } from "./BookingWidgetConfirmation";
import type { BookingWidgetTheme } from "../booking-widget.types";

interface BookingWidgetConfirmationOverlayProps {
    theme: BookingWidgetTheme;
    details: ConfirmationDetails | null;
    onClose: () => void;
}

/**
 * Bottom-sheet modal that slides the confirmation up as an overlay while
 * the BookingWidget stays mounted underneath.
 */
export function BookingWidgetConfirmationOverlay({
    theme,
    details,
    onClose,
}: BookingWidgetConfirmationOverlayProps) {
    return (
        <div className="animate-slide-up fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-coffee/45"
                onClick={onClose}
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
                <div className="flex justify-end mb-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-coffee/50 hover:text-coffee transition-colors cursor-pointer"
                        aria-label="Zatvori"
                    >
                        <XMarkIcon className="size-5" />
                    </button>
                </div>
                <BookingWidgetConfirmation
                    theme={theme}
                    details={details}
                />
            </div>
        </div>
    );
}
