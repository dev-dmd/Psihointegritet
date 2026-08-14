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
    title: "My profile",
    description:
      "Public profile, internal matching preferences and availability layers.",
    tabs: {
      public: "Public profile",
      matching: "Matching preferences",
      availability: "Availability",
    },
    cityAndFormat: "City and format",
    online: "online",
    formats: "Formats",
    publicAreas: "Areas of work — public",
    services: "Services",
    internalLabel: "Internal.",
    internalNote:
      "These preferences are read only by the Matching engine — they do not appear in the public biography.",
    acceptsHeading: "Who they accept",
    maxNewMonthly: "Max new per month",
    onlineOrInPerson: "Online / in person",
    ageGroups: "Age groups",
    recommendationPriority: "Recommendation priority",
    cities: "Cities",
    notAccepting: "Currently not accepting",
    formatAvailability: "Availability by format",
  },
  /**
   * Appointment, client, company and service statuses.
   *
   * Keyed by the status id, which is Serbian because it is the stored value
   * and renaming it would be a data migration for no gain. `STATUS_META` in
   * `features/workspace/types.ts` keeps the tone; only the words live here.
   */
  appointments: {
    title: "Appointments",
    description: "Booking control — one status system throughout the platform.",
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
    source: "Source: {source}",
    submitted: "Submitted {ago}",
    requestNote:
      "A request expires after 24h if it is not confirmed. Confirmation and change proposals arrive with the Booking engine.",
  },
  companies: {
    title: "Organizations",
    description:
      "Organization programs, appointment funds and collaboration pipeline.",
    employees: "{count, number} employees · {location}",
    appointments: "{used, number} / {bought, number} appointments",
    expires: "expires {date}",
    noActiveFund: "No active fund — in the {phase} phase.",
  },
  services: {
    title: "Services and pricing",
    description:
      "The central catalogue used by the Booking and Matching engines.",
    therapists: "Therapists: {therapists}",
    manualConfirmation: "Manual confirmation: {value}",
    buffer: "Buffer: {value}",
    cancellation: "Cancellation: {value}",
    note: "Prices are indicative and follow the public-site catalogue. Catalogue editing arrives with the Booking engine.",
  },
  therapists: {
    title: "Therapists",
    description: "Team capacity and availability for new clients.",
    clients: "{count, number} clients",
    occupancy: "Occupancy {percent, number}%",
    accepting: "Accepting new clients",
    notAccepting: "Not accepting new clients",
  },
  clients: {
    title: "Clients",
    description:
      "Active work, assignments and Intake requests without a therapist.",
    tabs: { all: "All", unassigned: "Unassigned · {count, number}" },
    next: "Next: {value}",
    loading: "Loading requests…",
    unavailable: "Unassigned requests are currently unavailable.",
    empty: "There are no unassigned requests.",
    intakeRequest: "Intake request · {date}",
    requestDetails: "{format} · age {age} · submitted by {requester}",
    formatMissing: "Format not provided",
    unassigned: "Unassigned",
    userChoice: "Client choice: {name}",
    teamReview: "Team review",
    priorityReview: "Priority review",
    extraMessage: "Additional message provided",
    recommendation: "Recommendation:",
    teamDecides: "The team determines the next step",
    claiming: "Taking on…",
    claim: "Take on",
    demoNotice:
      "Part of the Intake & Matching engine — requests the system did not automatically assign to a therapist. When a therapist takes on a client, others can only see who took it on.",
    age: "age {value}",
    claimedToast: "Taken on — others can only see who took it on.",
    assignSoon: "Therapist assignment arrives with the Booking engine.",
    assign: "Assign therapist",
    unknown: "not provided",
    ageBands: {
      under12: "under 12",
      from12To15: "12–15",
      from16To17: "16–17",
      adult: "18+",
    },
    requesterRoles: {
      selfAdult: "adult",
      guardian: "parent/guardian",
      adolescent: "adolescent",
      informationOnly: "information-only path",
    },
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
