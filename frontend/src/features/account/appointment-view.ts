import type { StatusBadgeTone } from "@/components/panel/status-badge";
import type { EnAccount } from "@/messages/en/account";
import type { AppointmentRequest } from "@/lib/api/booking";

/**
 * View model for the client panel's appointment list.
 *
 * The panel reads `AppointmentRequest` rows, not `Appointment` rows: a
 * confirmed appointment is staff-readable only (`/booking/appointments` sits
 * behind `RequireStaff`), so „my confirmed term" has no client-side source yet.
 * Everything here is therefore phrased around the *request* — its status and,
 * when the caller supplied one, the time it asked for.
 *
 * `preferred_start` is null for every request the public booking form creates
 * today (`app/api/booking-request/route.ts` sends the wanted date as free text
 * inside `client_note`). The date-bearing branches are still written out
 * because the Booking Widget's slot flow does send a real instant, and they
 * light up on their own the day it becomes the entry point.
 */

/** Message key for a status — camelCase, unlike the snake_case wire value. */
export type RequestStatus = keyof EnAccount["status"];

/**
 * Wire value → catalogue key. The backend stores `under_review`; the catalogue
 * keys on `underReview`, because message keys are semantic identifiers and are
 * checked for that shape (`messages.test.ts`). This map is the one place the
 * two vocabularies meet, so an unknown status arrives here and nowhere else.
 */
const STATUS_KEYS: Record<string, RequestStatus> = {
  submitted: "submitted",
  under_review: "underReview",
  alternative_proposed: "alternativeProposed",
  awaiting_client: "awaitingClient",
  converted: "converted",
  declined: "declined",
  withdrawn: "withdrawn",
  expired: "expired",
};

const STATUS_TONES: Record<RequestStatus, StatusBadgeTone> = {
  submitted: "wait",
  underReview: "wait",
  alternativeProposed: "amber",
  awaitingClient: "amber",
  converted: "ok",
  declined: "danger",
  withdrawn: "neutral",
  expired: "neutral",
};

/** Statuses that still describe something the client is waiting on. */
const OPEN_STATUSES = new Set<RequestStatus>([
  "submitted",
  "underReview",
  "alternativeProposed",
  "awaitingClient",
  "converted",
]);

export type RequestFormat = keyof EnAccount["format"];

const FORMAT_KEYS: Record<string, RequestFormat> = {
  online: "online",
  in_person: "inPerson",
};

export interface AppointmentRequestView {
  id: string;
  /**
   * `null` when the backend sends a status this build does not know. The row
   * still renders — losing a request from the list would be worse than showing
   * one without a badge.
   */
  status: RequestStatus | null;
  tone: StatusBadgeTone;
  /** ISO instant the request asked for, when it carries one. */
  startsAt: string | null;
  createdAt: string;
  format: RequestFormat | null;
  /** Still in play: submitted through confirmed. */
  isOpen: boolean;
}

export function toAppointmentRequestView(
  request: AppointmentRequest,
): AppointmentRequestView {
  const status = STATUS_KEYS[request.status] ?? null;
  return {
    id: request.id,
    status,
    tone: status === null ? "neutral" : STATUS_TONES[status],
    startsAt: request.preferred_start,
    createdAt: request.created_at,
    format: FORMAT_KEYS[request.format] ?? null,
    // An unknown status counts as open: a request nobody can classify is one
    // the client should still see at the top, not one quietly filed away.
    isOpen: status === null || OPEN_STATUSES.has(status),
  };
}

/**
 * Newest first, except that requests carrying a real time sort by that time
 * ascending and always precede the ones that only have a submission date.
 */
function byRelevance(
  a: AppointmentRequestView,
  b: AppointmentRequestView,
): number {
  if (a.startsAt !== null && b.startsAt !== null) {
    return a.startsAt.localeCompare(b.startsAt);
  }
  if (a.startsAt !== null) return -1;
  if (b.startsAt !== null) return 1;
  return b.createdAt.localeCompare(a.createdAt);
}

export interface PartitionedRequests {
  /** „Predstojeći" — open requests, most relevant first. */
  upcoming: AppointmentRequestView[];
  /** „Istorija" — declined, withdrawn and expired requests, newest first. */
  history: AppointmentRequestView[];
}

export function partitionRequests(
  requests: readonly AppointmentRequest[],
): PartitionedRequests {
  const views = requests.map(toAppointmentRequestView);
  return {
    upcoming: views.filter((view) => view.isOpen).sort(byRelevance),
    history: views
      .filter((view) => !view.isOpen)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/** What the „Sledeći termin" card on the home screen shows, if anything. */
export function nextRequest(
  requests: readonly AppointmentRequest[],
): AppointmentRequestView | null {
  return partitionRequests(requests).upcoming[0] ?? null;
}
