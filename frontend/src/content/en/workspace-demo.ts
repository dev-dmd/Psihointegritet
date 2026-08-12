import { JOHN, MARIA } from "@/features/workspace/demo-slugs";
import type {
  AgendaEntry,
  PriorityCard,
  WeekBar,
} from "@/features/workspace/types";

/**
 * Control Center demo data in English.
 *
 * Everything that is not language stays byte-identical to the Serbian file:
 * times, slugs, counts, percentages and `status` values. Those address rows and
 * drive styling — translating them would break the screens rather than
 * localise them.
 */

export const priorityCards: PriorityCard[] = [
  {
    count: "3",
    title: "Requests awaiting confirmation",
    description: "The oldest was sent 4 hours ago.",
    cta: "Review requests",
    routeId: "workspace.appointments.list",
    dot: "warm",
  },
  {
    count: "2",
    title: "Unassigned clients",
    description: "Intake without an automatic recommendation.",
    cta: "Open the list",
    routeId: "workspace.clients.list",
    dot: "warm",
  },
  {
    count: "1",
    title: "New company enquiry",
    description: "Hotel Ambasador — arrived yesterday.",
    cta: "Open companies",
    routeId: "workspace.companies.list",
    dot: "meadow",
    adminOnly: true,
  },
  {
    count: "1",
    title: "Cancelled appointment",
    description: "Jelena I. — Wednesday at 10:00.",
    cta: "See appointments",
    routeId: "workspace.appointments.list",
    dot: "danger",
  },
];

export const todayAgenda: AgendaEntry[] = [
  {
    time: "09:00",
    end: "10:00",
    client: "Ana Marković",
    initials: "AM",
    service: "Individual psychotherapy",
    format: "Online",
    therapist: "Maria B.",
    therapistSlug: MARIA,
    source: "Public booking",
    status: "potvrdjen",
  },
  { time: "11:00", free: true },
  {
    time: "13:30",
    end: "14:30",
    client: "Marko Petrović",
    initials: "MP",
    service: "Individual psychotherapy",
    format: "In person · Chicago",
    therapist: "Maria B.",
    therapistSlug: MARIA,
    source: "Public booking",
    status: "ceka",
  },
  {
    time: "16:00",
    end: "17:00",
    client: "Reserved capacity",
    initials: "TN",
    service: "Company programme — TechCore",
    format: "Online",
    therapist: "John F.",
    therapistSlug: JOHN,
    source: "Company programme",
    status: "rezervisano",
  },
  {
    time: "17:30",
    end: "18:30",
    client: "Jelena Ilić",
    initials: "JI",
    service: "Couples counselling",
    format: "Online",
    therapist: "John F.",
    therapistSlug: JOHN,
    source: "Guided choice",
    status: "potvrdjen",
  },
];

export const weekBars: WeekBar[] = [
  { day: "Mon", booked: 3, total: 6 },
  { day: "Tue", booked: 4, total: 6 },
  { day: "Wed", booked: 2, total: 6 },
  { day: "Thu", booked: 5, total: 6 },
  { day: "Fri", booked: 2, total: 6 },
];

export const researchStats: { label: string; value: string }[] = [
  { label: "Drawers opened", value: "412" },
  { label: "Responses started", value: "168" },
  { label: "Responses completed", value: "121" },
  { label: "Completion rate", value: "72%" },
];

export const researchSurvey = {
  name: "What is stopping you from booking a first conversation?",
  period: "1 — 19 July 2026",
  responses: 121,
  questions: [
    {
      q: "1 · The biggest obstacle to coming in",
      bars: [
        { label: "Not knowing what to expect", pct: 34 },
        { label: "Price", pct: 28 },
        { label: "Lack of time", pct: 22 },
        { label: "Awkwardness / stigma", pct: 16 },
      ],
    },
    {
      q: "2 · Preferred format",
      bars: [
        { label: "Online", pct: 58 },
        { label: "In person", pct: 30 },
        { label: "No preference", pct: 12 },
      ],
    },
  ],
  open: [
    "I am not sure my problem is “serious enough” for therapy.",
    "I would like a short free call before the first session.",
  ],
};
