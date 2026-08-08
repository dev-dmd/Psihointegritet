"use client";

import { cn } from "@/helpers/cn";
import { formatSlotRangeSr } from "@/helpers/format-date";
import { formatBookingPrice } from "../booking-widget.config";
import type { BookingWidgetTheme } from "../booking-widget.types";

// ── Props ───────────────────────────────────────────────────────────────────

export interface ConfirmationDetails {
    treatmentName: string;
    durationMinutes: number;
    price: number;
    currency: string;
    date: string;       // YYYY-MM-DD
    startTime: string;  // HH:MM
    endTime: string;    // HH:MM
    therapistName: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    requestId: string;
}

interface BookingWidgetConfirmationProps {
    /** The widget theme. */
    theme: BookingWidgetTheme;
    /** The submitted request details. */
    details: ConfirmationDetails | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function BookingWidgetConfirmation({
    theme,
    details,
}: BookingWidgetConfirmationProps) {
    if (!details) return null;

    return (
        <section aria-label="Potvrda zahteva za termin" className="space-y-5">
                        {/* Treatment name — uppercase, large */}
                        <div>
                            <h3
                                className={cn(
                                    "font-serif text-3xl leading-[1.05] font-normal uppercase tracking-wide sm:text-4xl",
                                    theme.heading,
                                )}
                            >
                                {details.treatmentName}
                            </h3>
                            <p className={cn("mt-3 text-base sm:text-lg", theme.serviceMeta)}>
                                {details.durationMinutes} minuta
                                <span aria-hidden className="text-warm mx-2">·</span>
                                {formatBookingPrice(details.price, details.currency)}
                            </p>
                        </div>

                        {/* Date & time */}
                        <div
                            className={cn(
                                "rounded-xl border p-4 space-y-2",
                                theme.border,
                            )}
                        >
                            <p className={cn("text-[13px] font-semibold tracking-[0.08em] uppercase", theme.muted)}>
                                Termin
                            </p>
                            <p className={cn("text-[15px] font-medium", theme.body)}>
                                {formatSlotRangeSr(details.date, details.startTime, details.endTime)}
                            </p>
                            {details.therapistName ? (
                                <p className={cn("text-[13px]", theme.muted)}>
                                    {details.therapistName}
                                </p>
                            ) : null}
                        </div>

                        {/* Client info */}
                        <div
                            className={cn(
                                "rounded-xl border p-4 space-y-2",
                                theme.border,
                            )}
                        >
                            <p className={cn("text-[13px] font-semibold tracking-[0.08em] uppercase", theme.muted)}>
                                Podaci
                            </p>
                            <p className={cn("text-[15px] font-medium", theme.body)}>
                                {details.clientName}
                            </p>
                            <p className={cn("text-[13px]", theme.muted)}>
                                {details.clientEmail}
                            </p>
                            {details.clientPhone ? (
                                <p className={cn("text-[13px]", theme.muted)}>
                                    {details.clientPhone}
                                </p>
                            ) : null}
                        </div>

                        {/* Notice */}
                        <div
                            className={cn(
                                "rounded-xl border p-4",
                                theme.border,
                                theme.muted,
                            )}
                        >
                            <p className="text-[13px] leading-[1.6]">
                                <strong className={theme.body}>Napomena:</strong> Ovo još nije konačna
                                potvrda termina. Terapeut ili član tima će proveriti dostupnost i
                                poslati potvrdu ili predlog druge mogućnosti na adresu{' '}
                                <span className={theme.body}>{details.clientEmail}</span>.
                            </p>
                        </div>
                    </section>
    );
}