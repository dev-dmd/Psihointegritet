import { getFallbackContentForLocale } from "@/content/registry";
import { PLATFORM_DEFAULT_LOCALE } from "@/i18n/locales";

import {
  bookingFormats,
  type BookingCatalogs,
  type BookingFormat,
} from "./booking-context";

const platformFallback = getFallbackContentForLocale(PLATFORM_DEFAULT_LOCALE);
const defaultBookingCatalogs: BookingCatalogs = {
  services: platformFallback.services.serviceCatalog,
  therapists: platformFallback.therapists,
};

/**
 * A concrete bookable combination: this therapist, this service, this format.
 *
 * **Source of truth is the backend `service_booking_configs` table**
 * (`modules/booking/models.py::ServiceBookingConfig`), whose unique key is
 * exactly `organization_id + service_id + therapist_profile_id + format +
 * location_id` and which already carries `duration_minutes`, the buffers, the
 * availability profile and the booking mode. This module is the frontend
 * projection of that row — not a second model.
 *
 * Until the public catalogue endpoint exists, the projection is built from the
 * static catalogues (`content/services.ts` × `Therapist.bookingServiceSlugs`),
 * which is the same pairing the rest of the site already uses. The shape is
 * kept aligned with the table so swapping the data source later is a change of
 * `buildBookingOfferings`, not of every consumer.
 *
 * Known gap for the next phase: `service_booking_configs` has **no price
 * column**, so `priceAmount`/`currency` still come from the global service
 * catalogue. A per-therapist price is therefore not representable yet.
 */
export interface BookingOffering {
  id: string;
  therapistId: string;
  serviceId: string;
  durationMinutes: number;
  format: BookingFormat;
  priceAmount: number;
  currency: string;
}

/** Only the catalogue knows the money; keep the unit in one place. */
const DEFAULT_CURRENCY = "RSD";

export function offeringId(
  therapistId: string,
  serviceId: string,
  format: BookingFormat,
): string {
  return `${therapistId}__${serviceId}__${format}`;
}

/** „60 minuta" → 60. Never invents a number: an unparsable value yields null. */
function parseDurationMinutes(duration: string): number | null {
  const minutes = Number.parseInt(duration, 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

/**
 * Which formats a catalogue service supports.
 *
 * `format` is prose („online ili uživo") because the catalogue is public copy.
 * In-person is the safe default: a service is only offered online when it says
 * so, so a copy edit can never silently make a service remote.
 */
function formatsForService(format: string): BookingFormat[] {
  const normalized = format.toLocaleLowerCase("sr-Latn-RS");
  const supported = bookingFormats.filter((candidate) =>
    candidate === "online"
      ? normalized.includes("online")
      : normalized.includes("uživo") || normalized.includes("uzivo"),
  );
  return supported.length > 0 ? supported : ["uzivo"];
}

/**
 * Expands the catalogues into one offering per therapist × service × format —
 * the same grain as a `service_booking_configs` row.
 */
export function buildBookingOfferings(
  catalogs: BookingCatalogs = defaultBookingCatalogs,
): BookingOffering[] {
  const offerings: BookingOffering[] = [];

  for (const therapist of catalogs.therapists) {
    for (const serviceSlug of therapist.bookingServiceSlugs) {
      const service = catalogs.services.find(
        (candidate) => candidate.slug === serviceSlug,
      );
      if (!service) continue;
      const durationMinutes = parseDurationMinutes(service.duration);
      if (durationMinutes === null) continue;

      for (const format of formatsForService(service.format)) {
        offerings.push({
          id: offeringId(therapist.slug, service.slug, format),
          therapistId: therapist.slug,
          serviceId: service.slug,
          durationMinutes,
          format,
          priceAmount: service.priceAmount,
          currency: DEFAULT_CURRENCY,
        });
      }
    }
  }

  return offerings;
}

// ── Queries ─────────────────────────────────────────────────────────────────

/** Offerings a therapist provides, optionally narrowed to one format. */
export function offeringsForTherapist<T extends BookingOffering>(
  offerings: T[],
  therapistId: string | null,
  format?: BookingFormat,
): T[] {
  if (therapistId === null) return [];
  return offerings.filter(
    (offering) =>
      offering.therapistId === therapistId &&
      (format === undefined || offering.format === format),
  );
}

export function findOfferingById<T extends BookingOffering>(
  offerings: T[],
  id: string | null,
): T | null {
  if (id === null) return null;
  return offerings.find((offering) => offering.id === id) ?? null;
}

/**
 * Therapists with at least one offering, in first-appearance order.
 *
 * Order comes from the offering list itself, not from the content catalogue —
 * `buildBookingOfferings` already walks therapists in catalogue order, and
 * deriving it here would tie the widget to `content/therapists.ts` and make it
 * untestable with any other data source.
 */
export function therapistIdsWithOfferings(
  offerings: readonly BookingOffering[],
): string[] {
  return [...new Set(offerings.map((offering) => offering.therapistId))];
}

/**
 * Picks the offering to land on after a therapist or format change.
 *
 * Order matters — it is the whole point of §2 „zavisnost izbora":
 *   1. same service **and** same format, when the new therapist provides it;
 *   2. same service in another format, so the treatment survives even if the
 *      person has to switch between online and in person;
 *   3. that therapist's first offering in the requested format;
 *   4. that therapist's first offering at all.
 *
 * Returns `null` when the therapist has no offerings — the caller must then
 * show the controlled empty state (§14) rather than silently pick a service
 * from somebody else's list.
 */
export function resolveCompatibleOffering<T extends BookingOffering>(
  offerings: T[],
  next: {
    therapistId: string;
    serviceId: string | null;
    format: BookingFormat | null;
  },
): T | null {
  const candidates = offeringsForTherapist(offerings, next.therapistId);
  if (candidates.length === 0) return null;

  const sameService = candidates.filter(
    (offering) => offering.serviceId === next.serviceId,
  );
  const exact = sameService.find((offering) => offering.format === next.format);
  if (exact) return exact;
  if (sameService[0]) return sameService[0];

  const sameFormat = candidates.find(
    (offering) => offering.format === next.format,
  );
  return sameFormat ?? candidates[0] ?? null;
}

// ── Display labels (derived, never stored) ──────────────────────────────────

export function offeringDurationLabel(offering: BookingOffering): string {
  return `${offering.durationMinutes} min`;
}

export function offeringFormatLabel(
  offering: BookingOffering,
  labels: { online: string; inPerson: string },
): string {
  return offering.format === "online" ? labels.online : labels.inPerson;
}

export function offeringPriceLabel(offering: BookingOffering): string {
  return new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 0 })
    .format(offering.priceAmount)
    .concat(` ${offering.currency}`);
}

export function offeringServiceName(
  offering: BookingOffering,
  catalogs: BookingCatalogs = defaultBookingCatalogs,
): string {
  return (
    catalogs.services.find((service) => service.slug === offering.serviceId)
      ?.name ?? offering.serviceId
  );
}

export function offeringTherapistName(
  offering: BookingOffering,
  catalogs: BookingCatalogs = defaultBookingCatalogs,
): string {
  return (
    catalogs.therapists.find(
      (therapist) => therapist.slug === offering.therapistId,
    )?.name ?? offering.therapistId
  );
}
