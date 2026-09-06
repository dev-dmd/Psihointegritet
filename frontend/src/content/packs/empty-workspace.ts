import type { WorkspaceDemoContent } from "@/content/pack-types";

/** Empty demo shape for starter/blank packs. It never enters DB aggregates. */
export function emptyWorkspaceDemo(): WorkspaceDemoContent {
  return {
    priorityCards: [],
    todayAgenda: [],
    weekBars: [],
    researchStats: [],
    researchSurvey: {
      name: "",
      period: "",
      responses: 0,
      questions: [],
      open: [],
    },
    appointmentRequests: [],
    waitlist: [],
    clients: [],
    unassignedRequests: [],
    companyPipeline: [],
    companies: [],
    serviceCatalog: [],
    therapistCards: [],
    matchingPreferences: {
      ageGroups: "",
      maxNewMonthly: "",
      priority: "",
      cities: "",
      notAccepting: [],
      toggles: [],
      formatNote: "",
    },
    availabilityLayers: [],
  };
}
