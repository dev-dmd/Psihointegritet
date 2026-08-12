/**
 * The Control Center shell: navigation, topbar and role labels (I18N-4).
 *
 * Shell only. Screen bodies stay inline until I18N-5 lifts them family by
 * family — mixing the two would produce a PR nobody can review against the
 * "renders byte-identical Serbian" oracle.
 *
 * Nav keys are named after the **route id**, not the current label, so
 * renaming a screen is a copy change and nothing else.
 */
export const workspace = {
  brand: {
    name: "Psihointegritet",
    panel: "Control Center",
  },
  nav: {
    sections: {
      business: "Business",
      team: "Team",
      settings: "Settings",
    },
    home: "Overview",
    appointments: "Appointments",
    clients: "Clients",
    companies: "Companies",
    services: "Services and pricing",
    research: "Research",
    documents: "Documents and consents",
    content: "Content",
    compass: "Compass",
    therapists: "Therapists",
    profile: "My profile",
    // Three planned settings entries that share one destination until each
    // grows its own screen (D-077 Amendment §11: no route before its screen).
    locations: "Locations and formats",
    notifications: "Notifications",
    centreSettings: "Centre settings",
    more: "More",
    soon: "Soon",
    hasError: "(has an error)",
  },
  shell: {
    // Placeholder identity until the backend hands over a display name; the
    // role line beneath it already comes from `roles`.
    memberName: "Team member",
    quickActionSoon: "Quick actions arrive with the Booking engine.",
    moreSoon: "More options are coming soon.",
  },
  settings: {
    page: {
      title: "Settings",
      description:
        "Centre settings exist as routes and navigation — the configuration arrives in later phases.",
      locations: {
        title: "Locations and formats",
        body: "Addresses, rooms and the rules for online and in-person work.",
      },
      notifications: {
        title: "Notifications",
        body: "Email reminders and sending rules — they arrive with notifications.",
      },
      centre: {
        title: "Centre settings",
        body: "Opening hours, cancellation rules and general configuration.",
      },
    },
    title: "Language and regional settings",
    intro:
      "Language belongs to the organization, not to a person — a change here applies to everyone who works in it.",
    systemLanguage: "System language",
    systemLanguageHelp:
      "Navigation, system messages, statuses and system email. Takes effect on the next screen you open.",
    contentLanguage: "Language of the public site and new content",
    contentLanguageHelp:
      "Moves the public site, its addresses and its sitemap. Existing texts are not translated.",
    contentLanguageManaged:
      "Managed as a content release: legal documents, canonical URLs and the sitemap move with it. Ask an operator to prepare the change.",
    notice:
      "This changes platform navigation, system messages and future system emails. It does not translate or modify existing content.",
    save: "Save languages",
    saved: "Languages saved.",
    onlyAdmin: "Only an organization administrator can change these settings.",
    loadFailed: "Settings could not be loaded.",
  },
  topbar: {
    allTherapists: "All therapists",
    notifications: "Notifications",
    quickAction: "Quick action",
    userMenu: "User menu",
    noNotifications: "No new notifications.",
  },
  roles: {
    adminAndTherapist: "Administrator and therapist",
    admin: "Centre administrator",
    therapist: "Therapist",
    member: "Team member",
  },
  superadmin: {
    panel: "Superadmin",
    nav: {
      home: "Overview",
      tenants: "Tenants",
      features: "Feature Gates",
      // The bottom nav has room for one word.
      featuresShort: "Gates",
      diagnostics: "Diagnostics",
      billing: "Subscriptions",
      auditLog: "Audit Log",
      settings: "Settings",
    },
  },
} as const;

export type EnWorkspace = typeof workspace;
