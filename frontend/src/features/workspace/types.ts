import type { StatusBadgeTone } from "@/components/panel/status-badge";
import type { PlatformRouteId } from "@/lib/routes/platform-routes";

/**
 * Control Center demo models (design handoff §8.1, README §13). Mock-only —
 * the real data arrives with the Booking engine (M2.3) and org/roles (M2.1).
 * Statuses reuse the platform-wide badge system (`StatusBadge`).
 */

export type WorkspaceStatus =
  | "potvrdjen"
  | "ceka"
  | "predlog"
  | "zavrsen"
  | "odrzan"
  | "otkazanK"
  | "otkazanT"
  | "odbijen"
  | "rezervisano"
  | "aktivan"
  | "neaktivan"
  | "nedodeljen"
  | "preuzet"
  | "koNovi"
  | "koPonuda"
  | "koPilot"
  | "koAktivna"
  | "usAktivna"
  | "usPriprema"
  | "usNacrt";

export interface StatusMeta {
  tone: StatusBadgeTone;
}

/**
 * Badge tone for every workspace status.
 *
 * The words moved to `screens.status` in the message catalogue: a status is
 * system UI, which D-077 gives to `ui_locale`, and this table is a module
 * constant that cannot see it. The keys stay Serbian — they are the stored
 * value, and renaming them would be a data migration for no gain.
 *
 * Read a label with `useStatusLabel()`.
 */
export const STATUS_META: Record<WorkspaceStatus, StatusMeta> = {
  potvrdjen: { tone: "ok" },
  ceka: { tone: "wait" },
  predlog: { tone: "soft" },
  zavrsen: { tone: "neutral" },
  odrzan: { tone: "ok" },
  otkazanK: { tone: "danger" },
  otkazanT: { tone: "danger" },
  odbijen: { tone: "danger" },
  rezervisano: { tone: "dark" },
  aktivan: { tone: "ok" },
  neaktivan: { tone: "neutral" },
  nedodeljen: { tone: "wait" },
  preuzet: { tone: "ok" },
  koNovi: { tone: "wait" },
  koPonuda: { tone: "amber" },
  koPilot: { tone: "soft" },
  koAktivna: { tone: "ok" },
  usAktivna: { tone: "ok" },
  usPriprema: { tone: "amber" },
  usNacrt: { tone: "neutral" },
};

export interface Appointment {
  time: string;
  end?: string;
  client: string;
  initials: string;
  service: string;
  format: string;
  therapist: string;
  /** Therapist slug for the admin topbar filter. */
  therapistSlug: string | null;
  source: string;
  status: WorkspaceStatus;
}

export interface FreeSlot {
  time: string;
  free: true;
}

export type AgendaEntry = Appointment | FreeSlot;

export function isFreeSlot(entry: AgendaEntry): entry is FreeSlot {
  return "free" in entry;
}

export interface PriorityCard {
  count: string;
  title: string;
  description: string;
  cta: string;
  /** Route identity — the card's href is built per locale at render time. */
  routeId: PlatformRouteId;
  dot: "meadow" | "warm" | "danger";
  adminOnly?: boolean;
}

export interface WeekBar {
  day: string;
  booked: number;
  total: number;
}

export interface Client {
  id: string;
  name: string;
  initials: string;
  therapist: string;
  therapistSlug: string | null;
  next: string;
  service: string;
  format: string;
  status: WorkspaceStatus;
}

export interface UnassignedRequest {
  id: string;
  initials: string;
  date: string;
  ago: string;
  format: string;
  ageGroup: string;
  areas: string[];
  recommended: string;
  reason: string;
}

export interface AppointmentRequest {
  id: number;
  client: string;
  initials: string;
  service: string;
  preferred: string;
  format: string;
  therapist: string;
  ago: string;
  source: string;
  status: WorkspaceStatus;
}

export interface WaitlistEntry {
  client: string;
  initials: string;
  period: string;
  format: string;
  therapist: string;
}

export interface Company {
  id: string;
  name: string;
  status: WorkspaceStatus;
  contact: string;
  model: string;
  bought: number;
  used: number;
  employees: number;
  format: string;
  location: string;
  goal: string;
  expires: string;
}

export interface ServiceRow {
  name: string;
  code: string;
  status: WorkspaceStatus;
  duration: string;
  price: string;
  format: string;
  therapists: string;
  variants: string[];
  manual: string;
  buffer: string;
  cancel: string;
}

export interface TherapistCard {
  slug: string;
  name: string;
  title: string;
  image: string;
  badge: string;
  clients: number;
  occupancy: number;
  acceptingNew: boolean;
}

export interface AvailabilityLayer {
  index: number;
  title: string;
  body: string;
}
