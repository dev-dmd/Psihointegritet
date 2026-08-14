/**
 * Client panel („Psihointegritet Klijent Panel" design handoff, screens KP 01–04).
 *
 * Chrome and state copy only. Nothing a tenant authors — service names,
 * therapist names, session notes — belongs here; those are content and arrive
 * from the API untranslated.
 *
 * The wording is deliberately narrow about what happens after a request is
 * sent: the Booking Engine dispatches no email today, so this catalogue says
 * the therapist gets in touch, never that a confirmation mail is on its way.
 */
export const account = {
  metadata: {
    panel: "My account",
    appointments: "My appointments",
    programs: "Programs",
    profile: "Profile",
  },
  brand: {
    /** Caption under the wordmark in the desktop sidebar. */
    panel: "Client area",
  },
  nav: {
    home: "Home",
    appointments: "Appointments",
    programs: "Programs",
    profile: "Profile",
  },
  topbar: {
    notifications: "Notifications",
    noNotifications: "No new notifications.",
    userMenu: "Account menu",
  },
  home: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    greeting: "{greeting}, {name}.",
    /** Same line for an account that holds neither a name nor an email. */
    greetingPlain: "{greeting}.",
    nextAppointment: "Next appointment",
    yourRequest: "Your request",
    requestSentOn: "Request sent: {date}",
    confirmedTitle: "Your appointment is confirmed",
    confirmedNote: "Your therapist will send you the details for this session.",
    pendingNote:
      "Your therapist reviews the request and gets back to you on the contact details you left.",
    emptyTitle: "No appointment booked yet",
    emptyNote:
      "Send a request and your therapist will get in touch to agree on a time.",
    book: "Book an appointment",
    bookHint: "Your therapist confirms the request",
    myPackage: "My package",
    myPackageHint: "Not available yet",
    allAppointments: "All my appointments",
    programsTitle: "Programs and packages",
    programsNote:
      "Online programs and session credits will show their progress here once the centre opens them.",
  },
  state: {
    loadFailed: "Your appointments could not be loaded right now.",
  },
  appointments: {
    title: "My appointments",
    tabs: {
      upcoming: "Upcoming",
      history: "History",
    },
    requestTitle: "Appointment request",
    sentOn: "Sent: {date}",
    emptyUpcoming: "You have no open appointment requests.",
    emptyHistory: "No past requests yet.",
    newAppointment: "+ Book a new appointment",
    timeNote:
      "The exact time is agreed with your therapist — it is not shown here yet.",
  },
  /**
   * One key per `AppointmentRequest.status` the backend stores. The stored
   * values are snake_case and these are not: `appointment-view.ts` owns that
   * translation, because a catalogue key is a key, not a wire format.
   */
  status: {
    submitted: "Waiting for the therapist",
    underReview: "Under review",
    alternativeProposed: "Alternative proposed",
    awaitingClient: "Waiting for your choice",
    converted: "Confirmed",
    declined: "Declined",
    withdrawn: "Withdrawn",
    expired: "Expired",
  },
  format: {
    online: "Online",
    inPerson: "In person",
  },
  programs: {
    title: "Programs and packages",
    emptyTitle: "No active programs or packages",
    emptyNote:
      "Online programs and session packages are not part of your account yet. When they are, you will see your progress and remaining credits here.",
  },
  profile: {
    title: "Profile",
    noEmail: "No email address on this account",
    notificationsTitle: "Notifications",
    confirmationEmails: "Appointment confirmations by email",
    reminder24h: "Reminder 24 hours before the appointment",
    newsletter: "News and educational content",
    notificationsNote:
      "Notification preferences cannot be changed yet — this is a preview of the settings that are coming.",
    documentsTitle: "Documents",
    privacyPolicy: "Privacy policy",
    bookingRules: "Booking rules",
    terms: "Terms of use",
  },
} as const;

export type EnAccount = typeof account;
