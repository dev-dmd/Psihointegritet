"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { cn } from "@/helpers/cn";
import type { BookingWidgetTheme } from "../booking-widget.types";

// ── Props ───────────────────────────────────────────────────────────────────

export interface ContactFormData {
    name: string;
    email: string;
    phone: string;
    bookingRulesAccepted: boolean;
}

interface BookingWidgetContactFormProps {
    /** The widget theme for consistent styling. */
    theme: BookingWidgetTheme;
    /** Called when the user clicks back / cancel. */
    onBack: () => void;
    /** Called when the user submits valid data. */
    onSubmit: (data: ContactFormData) => void;
    /** Whether a submission is in progress (shows spinner on button). */
    isSubmitting: boolean;
    /** An error message to display above the button. */
    error: string | null;
    /** Pre-fill name (e.g. from Clerk signed-in user). */
    initialName?: string | undefined;
    /** Pre-fill email (e.g. from Clerk signed-in user). */
    initialEmail?: string | undefined;
}

// ── Component ───────────────────────────────────────────────────────────────

export function BookingWidgetContactForm({
    theme,
    onBack,
    onSubmit,
    isSubmitting,
    error,
    initialName,
    initialEmail,
}: BookingWidgetContactFormProps) {
    const [name, setName] = useState(initialName ?? "");
    const [email, setEmail] = useState(initialEmail ?? "");
    const [phone, setPhone] = useState("");
    const [bookingRulesAccepted, setBookingRulesAccepted] = useState(false);

    const canSubmit =
        name.trim().length > 1 &&
        /.+@.+\..+/.test(email) &&
        bookingRulesAccepted &&
        !isSubmitting;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim(), bookingRulesAccepted });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
        >
            {/* Back button */}
            <button
                            type="button"
                            onClick={onBack}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors cursor-pointer",
                                theme.muted,
                                "hover:text-current",
                            )}
                        >
                            <ChevronLeftIcon className="size-4" />
                            Nazad na izbor termina
                        </button>

                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="bcf-name"
                                    className={cn("block text-[13px] font-medium mb-1.5", theme.body)}
                                >
                                    Ime i prezime
                                </label>
                                <input
                                    id="bcf-name"
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Vaše ime i prezime"
                                    className={cn(
                                        "w-full rounded-xl border px-4 py-2.5 text-[15px] outline-none transition-colors",
                                        theme.border,
                                        theme.body,
                                        "bg-transparent placeholder:text-current/35 focus:border-sage",
                                    )}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="bcf-email"
                                    className={cn("block text-[13px] font-medium mb-1.5", theme.body)}
                                >
                                    Email
                                </label>
                                <input
                                    id="bcf-email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="vasa@adresa.com"
                                    className={cn(
                                        "w-full rounded-xl border px-4 py-2.5 text-[15px] outline-none transition-colors",
                                        theme.border,
                                        theme.body,
                                        "bg-transparent placeholder:text-current/35 focus:border-sage",
                                    )}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="bcf-phone"
                                    className={cn("block text-[13px] font-medium mb-1.5", theme.body)}
                                >
                                    Telefon <span className={theme.muted}>(opciono)</span>
                                </label>
                                <input
                                    id="bcf-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="+381 6X XXXXXXX"
                                    className={cn(
                                        "w-full rounded-xl border px-4 py-2.5 text-[15px] outline-none transition-colors",
                                        theme.border,
                                        theme.body,
                                        "bg-transparent placeholder:text-current/35 focus:border-sage",
                                    )}
                                />
                            </div>

                            <label
                                className={cn(
                                    "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
                                    theme.border,
                                    bookingRulesAccepted ? "border-sage bg-sage/8" : "hover:border-sage/50",
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={bookingRulesAccepted}
                                    onChange={(e) => setBookingRulesAccepted(e.target.checked)}
                                    className="mt-0.5 size-4 accent-sage cursor-pointer"
                                />
                                <span className={cn("text-[13px] leading-[1.55]", theme.body)}>
                                    Upoznat/a sam sa pravilima zakazivanja i razumem da slanje zahteva ne
                                    predstavlja konačnu potvrdu termina.
                                </span>
                            </label>
                        </div>

                        {error ? (
                            <p className="rounded-xl border border-red-400/40 bg-red-50/60 px-4 py-2.5 text-[13px] text-red-700">
                                {error}
                            </p>
                        ) : null}

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={cn(
                                "w-full min-h-11 cursor-pointer rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 ease-out",
                                "hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
                                theme.primaryButton,
                            )}
                        >
                            {isSubmitting ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Šaljem…
                                </span>
                            ) : (
                                "Pošalji zahtev za termin"
                            )}
                        </button>
                    </form>
    );
}
