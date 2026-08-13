"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import { useFallbackContent } from "@/content/use-content";
import type {
  BookingFormat,
  BookingSelectionPolicy,
} from "@/features/booking/booking-context";
import {
  buildBookingOfferings,
  offeringServiceName,
} from "@/features/booking/booking-offering";
import {
  mockBrand,
  mockSlots,
} from "@/features/booking-widget/booking-widget.mock-data";
import { BookingWidget } from "@/features/booking-widget/components/BookingWidget";
import type {
  BookingTherapist,
  BookingWidgetOffering,
} from "@/features/booking-widget/booking-widget.types";
import { BookingWidgetContactFormOverlay } from "@/features/booking-widget/components/BookingWidgetContactFormOverlay";
import type { ContactFormData } from "@/features/booking-widget/components/BookingWidgetContactForm";
import { BookingWidgetConfirmationOverlay } from "@/features/booking-widget/components/BookingWidgetConfirmationOverlay";
import type { ConfirmationDetails } from "@/features/booking-widget/components/BookingWidgetConfirmation";
import type { BookingWidgetSubmitPayload } from "@/features/booking-widget/booking-widget.types";
import { bookingWidgetThemes } from "@/features/booking-widget/booking-widget.variants";
import { useUserSafeError } from "@/lib/errors/use-user-safe-error";

const glassTheme = bookingWidgetThemes.glass;

interface TherapistBookingWidgetProps {
  therapistSlug?: string | undefined;
  serviceSlug?: string | undefined;
  format?: BookingFormat | undefined;
  source?: string | undefined;
  /**
   * Derived once by the route from `source`; this component never inspects
   * `source` to decide UI behaviour, and neither does anything below it.
   */
  selectionPolicy: BookingSelectionPolicy;
}

/** „09:00" + 90 → „10:30". Empty in, empty out — never invents a time. */
function addMinutes(startTime: string, minutes: number): string {
  const [hours, mins] = startTime.split(":").map(Number);
  if (hours === undefined || mins === undefined || Number.isNaN(hours))
    return "";
  const total = hours * 60 + mins + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
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
  serviceSlug,
  format,
  source,
  selectionPolicy,
}: TherapistBookingWidgetProps) {
  const router = useRouter();
  const safeError = useUserSafeError();
  const fallback = useFallbackContent();
  const serviceCatalog = fallback.services.serviceCatalog;
  const therapistCatalog = fallback.therapists;

  const { offerings, therapists } = useMemo(() => {
    const catalogs = {
      services: serviceCatalog,
      therapists: therapistCatalog,
    };
    // One offering per therapist × service × format — same grain as the
    // backend `service_booking_configs` row this projects.
    const built: BookingWidgetOffering[] = buildBookingOfferings(catalogs).map(
      (offering) => ({
        ...offering,
        serviceName: offeringServiceName(offering, catalogs),
      }),
    );

    const thr: BookingTherapist[] = therapistCatalog.map((t) => ({
      id: t.slug,
      slug: t.slug,
      name: t.name,
      firstNameGenitive: t.firstNameGenitive,
      title: t.title,
      city: t.city,
      avatarUrl: t.image,
      serviceSlugs: t.bookingServiceSlugs,
    }));

    return { offerings: built, therapists: thr };
  }, [serviceCatalog, therapistCatalog]);

  // Locked selections came from the guided flow, so "back" returns there
  // rather than unwinding arbitrary history.
  const backToRecommendations = useCallback(() => {
    router.push("/pronadji-podrsku");
  }, [router]);

  // ── Flow overlay state ──────────────────────────────────────────────────

  const [flowState, setFlowState] = useState<FlowState>("selecting");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDetails | null>(
    null,
  );
  const [selectedPayload, setSelectedPayload] =
    useState<BookingWidgetSubmitPayload | null>(null);

  // ── Clerk user data for auto-fill ───────────────────────────────────────

  const { user, isSignedIn } = useUser();
  const clerkName = isSignedIn ? (user?.fullName ?? "") : "";
  const clerkEmail = isSignedIn
    ? (user?.primaryEmailAddress?.emailAddress ?? "")
    : "";

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
      const svc = serviceCatalog.find(
        (s) => s.slug === selectedPayload.serviceId,
      );
      const thr = therapistCatalog.find(
        (t) => t.slug === selectedPayload.therapistId,
      );

      try {
        const { submitBookingRequest } =
          await import("@/lib/api/booking-request");
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

        const durationMinutes = svc ? parseInt(svc.duration, 10) || 60 : 0;
        const startTime = selectedPayload.selectedSlotStart ?? "";
        setConfirmation({
          treatmentName: svc?.name ?? "",
          durationMinutes,
          price: svc?.priceAmount ?? 0,
          currency: "RSD",
          date: selectedPayload.selectedDate ?? "",
          startTime,
          endTime: addMinutes(startTime, durationMinutes),
          format: selectedPayload.format,
          therapistName: thr?.name ?? "",
          clientName: data.name,
          clientEmail: data.email,
          ...(data.phone ? { clientPhone: data.phone } : {}),
          requestId: `req-${Date.now()}`,
        });
        setFlowState("confirming");
      } catch (err: unknown) {
        setSubmitError(safeError.text(err, "booking", "submit"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [safeError, selectedPayload, serviceCatalog, therapistCatalog],
  );

  return (
    <div
      {...(source ? { "data-booking-source": source } : {})}
      className="mx-auto max-w-[1536px] px-5 md:px-8"
    >
      <BookingWidget
        variant="glass"
        brand={mockBrand}
        offerings={offerings}
        therapists={therapists}
        selectionPolicy={selectionPolicy}
        initialFormat={format ?? "online"}
        slots={mockSlots}
        showBrandPanel
        showTherapist
        showNotifyAction
        {...(therapistSlug ? { initialTherapistId: therapistSlug } : {})}
        {...(serviceSlug ? { initialServiceId: serviceSlug } : {})}
        {...(selectionPolicy.therapist === "locked" &&
        selectionPolicy.service === "locked"
          ? { onBack: backToRecommendations }
          : {})}
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
