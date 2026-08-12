/**
 * Superadmin screens (I18N-5, first family).
 *
 * Separate from `workspace.superadmin`, which holds only that panel's shell.
 * Screen copy and chrome copy move on different schedules and are reviewed by
 * different people, so they do not share a namespace.
 */
export const superadmin = {
  gateStatus: {
    on: "Enabled",
    off: "Disabled",
    comingSoon: "In preparation",
  },
  comingSoon: {
    title: "In preparation",
    description:
      "Subscriptions, Audit Log and Settings exist as routes and navigation — the business logic arrives in later phases.",
    billing: {
      title: "Subscriptions and spend",
      body: "Plan, trial period, renewals, payment history and estimated monthly spend — read-only, with the plan entered by hand.",
    },
    auditLog: {
      title: "Audit Log",
      body: "Who, which action, on which tenant, previous and new value, reason, time — the records already accrue through Feature Gates.",
    },
  },
  gateToggle: {
    // `{gate}` is the gate's own name — data, never translated.
    enabled: "Enabled feature gate — {gate}",
    disabled: "Disabled feature gate — {gate}",
  },
} as const;

export type EnSuperadmin = typeof superadmin;
