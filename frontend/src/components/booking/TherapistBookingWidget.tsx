"use client";

import { useMemo, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

import { serviceCatalog } from "@/content/services";
import { therapists as therapistCatalog } from "@/content/therapists";
import {
  mockBrand,
  mockSlots,
} from "@/features/booking-widget/booking-widget.mock-data";
import { BookingWidget } from "@/features/booking-widget/components/BookingWidget";
import type {
  BookingService,
  BookingTherapist,
} from "@/features/booking-widget/booking-widget.types";
import { BookingWidgetContactFormOverlay } from "@/features/booking-widget/components/BookingWidgetContactFormOverlay";
import type { ContactFormData } from "@/features/booking-widget/components/BookingWidgetContactForm";
import { BookingWidgetConfirmationOverlay } from "@/features/booking-widget/components/BookingWidgetConfirmationOverlay";
import type { ConfirmationDetails } from "@/features/booking-widget/components/BookingWidgetConfirmation";
import type { BookingWidgetSubmitPayload } from "@/features/booking-widget/booking-widget.types";
import { bookingWidgetThemes } from "@/features/booking-widget/booking-widget.variants";

const glassTheme = bookingWidgetThemes.glass;

interface TherapistBookingWidgetProps {
  therapistSlug?: string | undefined;
  source?: string | undefined;
}

type FlowState = "selecting" | "contact" | "confirming";

/**
 * Public booking widget — renders on ``/zakazi``.
 *
 * Service and therapist lists are built from the static catalogs. Clicking a
 * treatment or therapist chip updates the selection inside the widget.  When
 * the user clicks "Zakaži" with a selected slot, the BookingWidget stays
 * mounted so its state is preserved, and a contact-form overlay slides up.
 * On successful submission the confirmation overlay replaces it.
 */
export function TherapistBookingWidget({
  therapistSlug,
  source,
}: TherapistBookingWidgetProps) {
  const { services, therapists, initialTherapistId } = useMemo(() => {
    const svc: BookingService[] = serviceCatalog.map((s) => ({
      id: s.slug,
      slug: s.slug,
      name: s.name,
      durationMinutes: parseInt(s.duration, 10) || 60,
      price: s.priceAmount,
      currency: "RSD",
      formats: s.format.includes("online") ? ["online", "uzivo"] : ["uzivo"],
    }));

    const thr: BookingTherapist[] = therapistCatalog.map((t) => ({
      id: t.slug,
      slug: t.slug,
      name: t.name,
      avatarUrl: t.image,
      serviceSlugs: t.bookingServiceSlugs,
    }));

    return { services: svc, therapists: thr, initialTherapistId: therapistSlug ?? null };
  }, [therapistSlug]);

  // ── Flow overlay state ──────────────────────────────────────────────────

  const [flowState, setFlowState] = useState<FlowState>("selecting");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDetails | null>(null);
  const [selectedPayload, setSelectedPayload] =
    useState<BookingWidgetSubmitPayload | null>(null);

  // ── Clerk user data for auto-fill ───────────────────────────────────────

  const { user, isSignedIn } = useUser();
  const clerkName = isSignedIn ? (user?.fullName ?? "") : "";
  const clerkEmail = isSignedIn ? (user?.primaryEmailAddress?.emailAddress ?? "") : "";

  const handleSlotSelected = useCallback(
    (payload: BookingWidgetSubmitPayload) => {
      setSelectedPayload(payload);
      setSubmitError(null);
      setFlowState("contact");
    },
    [],
  );

  const backToSlots = useCallback(() => {
    setFlowState("selecting");
    setSubmitError(null);
  }, []);

  const handleContactSubmit = useCallback(
    async (data: ContactFormData) => {
      if (!selectedPayload) return;
      setIsSubmitting(true);
      setSubmitError(null);

      // Resolve service/therapist data from the catalog
      const svc = serviceCatalog.find((s) => s.slug === selectedPayload.serviceId);
      const thr = therapistCatalog.find((t) => t.slug === selectedPayload.therapistId);

      try {
        const { submitBookingRequest } = await import(
          "@/lib/api/booking-request"
        );
        await submitBookingRequest({
          therapistSlug: selectedPayload.therapistId ?? null,
          serviceSlug: selectedPayload.serviceId,
          format:
            selectedPayload.format === "online"
              ? ("online" as const)
              : ("uzivo" as const),
          location: null,
          preferredDate: selectedPayload.selectedDate ?? "",
          ...(selectedPayload.selectedSlotStart
            ? { preferredTime: selectedPayload.selectedSlotStart }
            : {}),
          name: data.name,
          email: data.email,
          ...(data.phone ? { phone: data.phone } : {}),
          replyPreference: "email",
          bookingRulesAccepted: true,
          website: "",
        });

        const { toast } = await import("sonner");
        toast.success("Zahtev za termin je uspešno poslat", {
          description: `Potvrdu ćete dobiti na ${data.email}`,
        });

        setConfirmation({
          treatmentName: svc?.name ?? "",
          durationMinutes: svc ? parseInt(svc.duration, 10) || 60 : 0,
          price: svc?.priceAmount ?? 0,
          currency: "RSD",
          date: selectedPayload.selectedDate ?? "",
          startTime: "",
          endTime: "",
          therapistName: thr?.name ?? "",
          clientName: data.name,
          clientEmail: data.email,
          ...(data.phone ? { clientPhone: data.phone } : {}),
          requestId: `req-${Date.now()}`,
        });
        setFlowState("confirming");
      } catch (err: unknown) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "Slanje zahteva nije uspelo. Pokušajte ponovo.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedPayload],
  );

  return (
    <div
      {...(source ? { "data-booking-source": source } : {})}
      className="mx-auto max-w-[1536px] px-5 md:px-8"
    >
      <BookingWidget
        variant="glass"
        brand={mockBrand}
        services={services}
        therapists={therapists}
        initialFormat="online"
        slots={mockSlots}
        showBrandPanel
        showTherapist
        showNotifyAction
        {...(initialTherapistId ? { initialTherapistId } : {})}
        onCancel={() => {}}
        onNotify={() => {}}
        onSubmit={handleSlotSelected}
      />

      {flowState === "contact" ? (
        <BookingWidgetContactFormOverlay
          theme={glassTheme}
          onBack={backToSlots}
          onSubmit={handleContactSubmit}
          isSubmitting={isSubmitting}
          error={submitError}
          initialName={clerkName || undefined}
          initialEmail={clerkEmail || undefined}
        />
      ) : flowState === "confirming" ? (
        <BookingWidgetConfirmationOverlay
          theme={glassTheme}
          details={confirmation}
          onClose={() => setFlowState("selecting")}
        />
      ) : null}
    </div>
  );
}
