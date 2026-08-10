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
  "compass",
] as const;
export type BookingSource = (typeof bookingSources)[number];

// ── Selection policy ────────────────────────────────────────────────────────

/**
 * What the person is allowed to change inside the Booking Widget.
 *
 * This is a **UX policy, never a security boundary**: the query string is
 * public and anyone can rewrite `?source=`. The backend still validates the
 * real therapist/service/offering when the request is created.
 *
 * `compatible_only` means the service may change, but solely within the
 * offerings of the already selected therapist.
 */
export interface BookingSelectionPolicy {
  therapist: "editable" | "locked";
  service: "editable" | "compatible_only" | "locked";
}

/**
 * The single place where `source` turns into UI behaviour.
 *
 * Widget components must never branch on `source` themselves — they read
 * `selectionPolicy.therapist` / `selectionPolicy.service` only. That keeps a
 * new entry point (Compass, a campaign link, an embedded partner page) a
 * one-line change here instead of a grep across the component tree.
 */
export function deriveBookingSelectionPolicy(
  source: BookingSource | null,
): BookingSelectionPolicy {
  switch (source) {
    // Intake & Matching already ran the guided selection. Re-opening the full
    // catalogue here would turn the widget back into a marketplace and discard
    // the recommendation the person just accepted.
    case "matching":
      return { therapist: "locked", service: "locked" };
    // Compass is deliberately not final yet (§4). It is wired as its own case
    // so the eventual decision changes this line, not the components.
    case "compass":
      return { therapist: "editable", service: "compatible_only" };
    // Therapist profile pre-selects a person but must stay changeable, exactly
    // like a direct visit.
    default:
      return { therapist: "editable", service: "editable" };
  }
}

export const bookingLocations = [
  { value: "chicago", label: "Chicago" },
  { value: "milwaukee", label: "Milwaukee" },
  { value: "madison", label: "Madison" },
] as const;
export type BookingLocation = (typeof bookingLocations)[number]["value"];
export type BookingLocationLabel = (typeof bookingLocations)[number]["label"];

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

/**
 * Looked up rather than branched: with three locations a chain of ternaries
 * silently falls through to the last city for any unknown value, which reads
 * as "this therapist works there" on the confirmation screen.
 */
export function locationLabel(location: BookingLocation): BookingLocationLabel {
  const match = bookingLocations.find((item) => item.value === location);
  if (!match) {
    throw new Error(`Nepoznata lokacija: ${location}`);
  }
  return match.label;
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
