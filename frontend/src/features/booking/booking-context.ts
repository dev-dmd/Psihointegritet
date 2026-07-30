import { findService, serviceCatalog } from "@/content/services";
import { findTherapist, therapists } from "@/content/therapists";

export const bookingFormats = ["online", "uzivo"] as const;
export type BookingFormat = (typeof bookingFormats)[number];

export const bookingSources = [
  "header",
  "homepage",
  "service",
  "therapist",
  "matching",
  "workshop",
] as const;
export type BookingSource = (typeof bookingSources)[number];

export const bookingLocations = [
  { value: "nis", label: "Niš" },
  { value: "leskovac", label: "Leskovac" },
] as const;
export type BookingLocation = (typeof bookingLocations)[number]["value"];

export interface BookingContext {
  serviceSlug: string | null;
  therapistSlug: string | null;
  format: BookingFormat | null;
  source: BookingSource | null;
  messages: string[];
}

export type BookingSearchParams = Record<string, string | string[] | undefined>;

function singleValue(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isBookingFormat(value: string | null): value is BookingFormat {
  return value !== null && bookingFormats.includes(value as BookingFormat);
}

function isBookingSource(value: string | null): value is BookingSource {
  return value !== null && bookingSources.includes(value as BookingSource);
}

/**
 * Turns public query parameters into a safe, editable selection. Unknown
 * values are ignored, and an incompatible service/therapist pair drops only
 * the therapist so the person can continue with a team recommendation.
 */
export function parseBookingContext(
  searchParams: BookingSearchParams,
): BookingContext {
  const messages: string[] = [];
  const requestedService = singleValue(searchParams.service);
  const requestedTherapist = singleValue(searchParams.therapist);
  const requestedFormat = singleValue(searchParams.format);
  const requestedSource = singleValue(searchParams.source);

  const serviceSlug =
    requestedService && findService(requestedService) ? requestedService : null;
  let therapistSlug =
    requestedTherapist && findTherapist(requestedTherapist)
      ? requestedTherapist
      : null;

  if (requestedService && serviceSlug === null) {
    messages.push(
      "Izabrana usluga trenutno nije dostupna. Možete je promeniti.",
    );
  }
  if (requestedTherapist && therapistSlug === null) {
    messages.push(
      "Izabrani terapeut trenutno nije dostupan. Možete izabrati drugu osobu ili prepustiti izbor timu.",
    );
  }
  if (
    serviceSlug !== null &&
    therapistSlug !== null &&
    !therapistProvidesService(therapistSlug, serviceSlug)
  ) {
    therapistSlug = null;
    messages.push(
      "Izabrana kombinacija trenutno nije dostupna. Možete promeniti terapeuta, uslugu ili način rada.",
    );
  }

  if (requestedFormat && !isBookingFormat(requestedFormat)) {
    messages.push(
      "Izabrani način rada trenutno nije dostupan. Možete ga promeniti.",
    );
  }

  return {
    serviceSlug,
    therapistSlug,
    format: isBookingFormat(requestedFormat) ? requestedFormat : null,
    source: isBookingSource(requestedSource) ? requestedSource : null,
    messages,
  };
}

export function therapistProvidesService(
  therapistSlug: string,
  serviceSlug: string,
): boolean {
  return (
    findTherapist(therapistSlug)?.bookingServiceSlugs.includes(serviceSlug) ??
    false
  );
}

export function servicesForTherapist(therapistSlug: string) {
  const therapist = findTherapist(therapistSlug);
  if (!therapist) return serviceCatalog;
  return serviceCatalog.filter((service) =>
    therapist.bookingServiceSlugs.includes(service.slug),
  );
}

export function therapistsForService(serviceSlug: string) {
  return therapists.filter((therapist) =>
    therapist.bookingServiceSlugs.includes(serviceSlug),
  );
}

export function locationLabel(location: BookingLocation): string {
  return bookingLocations.find((item) => item.value === location)?.label ?? "";
}

export function therapistWorksAtLocation(
  therapistSlug: string,
  location: BookingLocation,
): boolean {
  const therapist = findTherapist(therapistSlug);
  return therapist?.city === locationLabel(location);
}

export function locationsForTherapist(therapistSlug: string | null) {
  if (therapistSlug === null) return [...bookingLocations];
  return bookingLocations.filter((location) =>
    therapistWorksAtLocation(therapistSlug, location.value),
  );
}

export interface BookingHrefContext {
  service?: string | null | undefined;
  therapist?: string | null | undefined;
  format?: BookingFormat | null | undefined;
  source?: BookingSource | null | undefined;
}

/** Creates a public booking URL from the allowlisted, non-sensitive context. */
export function buildBookingHref(context: BookingHrefContext = {}): string {
  const params = new URLSearchParams();
  if (context.service && findService(context.service)) {
    params.set("service", context.service);
  }
  if (context.therapist && findTherapist(context.therapist)) {
    params.set("therapist", context.therapist);
  }
  if (context.format && bookingFormats.includes(context.format)) {
    params.set("format", context.format);
  }
  if (context.source && bookingSources.includes(context.source)) {
    params.set("source", context.source);
  }
  const query = params.toString();
  return query ? `/zakazi?${query}` : "/zakazi";
}
