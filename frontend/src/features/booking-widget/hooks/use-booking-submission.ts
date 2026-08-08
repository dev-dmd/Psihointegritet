"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { BookingWidgetSubmitPayload } from "@/features/booking-widget/booking-widget.types";

import type { ContactFormData } from "../components/BookingWidgetContactForm";
import type { ConfirmationDetails } from "../components/BookingWidgetConfirmation";

export type BookingFlowState = "selecting" | "contact" | "confirming";

interface UseBookingSubmissionParams {
    selectedServiceName: string;
    selectedServiceSlug: string;
    selectedServiceDuration: number;
    selectedServicePrice: number;
    selectedServiceCurrency: string;
    selectedTherapistSlug: string | null;
    selectedTherapistName: string;
    selectedDate: string | null;
    selectedSlotStart: string | null;
    selectedSlotEnd: string | null;
    selectedFormat: "online" | "uzivo";
    buildSubmitPayload: (therapistId?: string) => BookingWidgetSubmitPayload;
    onSubmitProp?: (payload: BookingWidgetSubmitPayload) => void;
}

interface UseBookingSubmissionResult {
    flowState: BookingFlowState;
    isSubmitting: boolean;
    submitError: string | null;
    confirmationDetails: ConfirmationDetails | null;
    openContactForm: () => void;
    backToSlots: () => void;
    handleContactSubmit: (data: ContactFormData) => Promise<void>;
    resetFlow: () => void;
}

/**
 * Manages the booking submission flow: selecting → contact form → API call → confirmation.
 *
 * Kept outside visual components per Architectural Rules §4.4 (presentation-only rule)
 * and §6.1 (no fetching from leaf UI).  The ``TherapistBookingWidget`` wrapper is the
 * only consumer.
 */
export function useBookingSubmission(
    params: UseBookingSubmissionParams,
): UseBookingSubmissionResult {
    const [flowState, setFlowState] = useState<BookingFlowState>("selecting");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [confirmationDetails, setConfirmationDetails] =
        useState<ConfirmationDetails | null>(null);

    const openContactForm = useCallback(() => {
        setSubmitError(null);
        setFlowState("contact");
    }, []);

    const backToSlots = useCallback(() => {
        setFlowState("selecting");
        setSubmitError(null);
    }, []);

    const resetFlow = useCallback(() => {
        setFlowState("selecting");
        setSubmitError(null);
        setConfirmationDetails(null);
    }, []);

    const handleContactSubmit = useCallback(
        async (data: ContactFormData) => {
            setIsSubmitting(true);
            setSubmitError(null);

            try {
                const { submitBookingRequest } = await import(
                    "@/lib/api/booking-request"
                );

                const payload = {
                    therapistSlug: params.selectedTherapistSlug,
                    serviceSlug: params.selectedServiceSlug,
                    format:
                        params.selectedFormat === "online"
                            ? ("online" as const)
                            : ("uzivo" as const),
                    location: null,
                    preferredDate: params.selectedDate ?? "",
                    preferredTime: params.selectedSlotStart ?? "",
                    name: data.name,
                    email: data.email,
                    ...(data.phone ? { phone: data.phone } : {}),
                    replyPreference: "email" as const,
                    bookingRulesAccepted: true as const,
                    website: "",
                };

                await submitBookingRequest(payload);

                const details: ConfirmationDetails = {
                    treatmentName: params.selectedServiceName,
                    durationMinutes: params.selectedServiceDuration,
                    price: params.selectedServicePrice,
                    currency: params.selectedServiceCurrency,
                    date: params.selectedDate ?? "",
                    startTime: params.selectedSlotStart ?? "",
                    endTime: params.selectedSlotEnd ?? "",
                    therapistName: params.selectedTherapistName,
                    clientName: data.name,
                    clientEmail: data.email,
                    ...(data.phone ? { clientPhone: data.phone } : {}),
                    requestId: `req-${Date.now()}`,
                };

                setConfirmationDetails(details);
                setFlowState("confirming");

                toast.success("Zahtev za termin je uspešno poslat", {
                    description: `${params.selectedTherapistName || "Terapeut"} će potvrditi termin na ${data.email}`,
                });

                params.onSubmitProp?.(
                    params.buildSubmitPayload(undefined),
                );
            } catch (err: unknown) {
                const message =
                    err instanceof Error
                        ? err.message
                        : "Slanje zahteva nije uspelo. Pokušajte ponovo.";
                setSubmitError(message);
            } finally {
                setIsSubmitting(false);
            }
        },
        [params],
    );

    return {
        flowState,
        isSubmitting,
        submitError,
        confirmationDetails,
        openContactForm,
        backToSlots,
        handleContactSubmit,
        resetFlow,
    };
}
