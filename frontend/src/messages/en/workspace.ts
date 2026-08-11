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
  topbar: {
    allTherapists: "All therapists",
    notifications: "Notifications",
    quickAction: "New",
    userMenu: "User menu",
    noNotifications: "No new notifications.",
    backToSite: "Back to site",
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
