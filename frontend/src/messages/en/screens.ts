/**
 * Workspace screens outside the shell (I18N-5).
 *
 * Screen chrome only — greetings, headings and the notes that explain what a
 * panel does. Demo data and anything a tenant writes stays where it is.
 */
export const screens = {
  overview: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    lead: "Here is what needs your attention today.",
    errors: "Errors that need your attention ({count, number})",
    dismissError: "Dismiss error: {title}",
    todaySchedule: "Today's schedule",
    research: "Research",
    newResponses: "+{count, number} new responses this week",
    surveyProgress: "{survey} · completion {rate}",
  },
  profile: {
    internalLabel: "Internal.",
    internalNote:
      "These preferences are read only by the Matching engine — they do not appear in the public biography.",
    acceptsHeading: "Who they accept",
    maxNewMonthly: "Max new per month",
    onlineOrInPerson: "Online / in person",
  },
  /**
   * Appointment, client, company and service statuses.
   *
   * Keyed by the status id, which is Serbian because it is the stored value
   * and renaming it would be a data migration for no gain. `STATUS_META` in
   * `features/workspace/types.ts` keeps the tone; only the words live here.
   */
  appointments: {
    tabs: {
      today: "Today",
      week: "This week",
      upcoming: "Upcoming",
      requests: "Requests · {count, number}",
      waitlist: "Waiting list",
    },
    freeSlot: "Free slot",
    book: "+ Book",
    allAppointments: "All appointments →",
    thisWeek: "This week",
    occupancy: "Occupancy {percent, number}%",
    upcomingNote: "The full upcoming calendar arrives with the Booking engine.",
    requested: "Requested: {preferred}",
    requestNote:
      "A request expires after 24h if it is not confirmed. Confirmation and change proposals arrive with the Booking engine.",
  },
  companies: {
    noActiveFund: "No active fund — in the {phase} phase.",
  },
  status: {
    potvrdjen: "Confirmed",
    ceka: "Awaiting confirmation",
    predlog: "Change proposed",
    zavrsen: "Completed",
    odrzan: "Held",
    otkazanK: "Cancelled by client",
    otkazanT: "Cancelled by therapist",
    odbijen: "Declined",
    rezervisano: "Company appointment",
    aktivan: "Active client",
    neaktivan: "Inactive",
    nedodeljen: "Unassigned",
    preuzet: "Taken on",
    koNovi: "New enquiry",
    koPonuda: "Offer sent",
    koPilot: "Pilot programme",
    koAktivna: "Active",
    usAktivna: "Active",
    usPriprema: "In preparation",
    usNacrt: "Draft",
  },
} as const;

export type EnScreens = typeof screens;
