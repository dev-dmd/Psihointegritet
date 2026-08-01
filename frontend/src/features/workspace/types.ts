import type { StatusBadgeTone } from "@/components/panel/status-badge";

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
  label: string;
  tone: StatusBadgeTone;
}

/** Label + badge tone for every workspace status (verbatim from the prototype). */
export const STATUS_META: Record<WorkspaceStatus, StatusMeta> = {
  potvrdjen: { label: "Potvrđen", tone: "ok" },
  ceka: { label: "Čeka potvrdu", tone: "wait" },
  predlog: { label: "Predložena izmena", tone: "soft" },
  zavrsen: { label: "Završen", tone: "neutral" },
  odrzan: { label: "Održan", tone: "ok" },
  otkazanK: { label: "Otkazao klijent", tone: "danger" },
  otkazanT: { label: "Otkazao terapeut", tone: "danger" },
  odbijen: { label: "Odbijen", tone: "danger" },
  rezervisano: { label: "Kompanijski termin", tone: "dark" },
  aktivan: { label: "Aktivan klijent", tone: "ok" },
  neaktivan: { label: "Neaktivan", tone: "neutral" },
  nedodeljen: { label: "Nedodeljen", tone: "wait" },
  preuzet: { label: "Preuzet", tone: "ok" },
  koNovi: { label: "Novi upit", tone: "wait" },
  koPonuda: { label: "Ponuda poslata", tone: "amber" },
  koPilot: { label: "Pilot program", tone: "soft" },
  koAktivna: { label: "Aktivna", tone: "ok" },
  usAktivna: { label: "Aktivna", tone: "ok" },
  usPriprema: { label: "U pripremi", tone: "amber" },
  usNacrt: { label: "Nacrt", tone: "neutral" },
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
  href: string;
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
