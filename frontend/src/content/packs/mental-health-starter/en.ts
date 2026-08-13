import type { FallbackContent } from "@/content/pack-types";

import { emptyWorkspaceDemo } from "../empty-workspace";

export const mentalHealthStarterEn: FallbackContent = {
  metadata: {
    packId: "mental-health-starter",
    locale: "en",
    demoDataMode: "empty",
    sourceStatus: {
      publicSite: "draft",
      therapists: "missing",
      services: "missing",
      companies: "missing",
      research: "missing",
      compass: "missing",
      legal: "missing",
    },
    editorGuidance: {
      homepage:
        "Explain who the centre supports, how it works and one clear next step. Replace the starter before requesting publication review.",
      services:
        "Add only confirmed services. Record the duration, format, fee and booking rules from an approved business source.",
      therapists:
        "Create a profile only from a biography and credentials supplied or approved by that professional.",
    },
  },
  homepage: {
    companies: {
      eyebrow: "For organizations",
      title: "Support that fits your team",
      description:
        "Explore a clear route for discussing your organization's needs with the centre.",
      action: { label: "Start a conversation", href: "/rad-sa-kompanijama" },
    },
    clientLink: {
      prefix: "Already working with the centre?",
      label: "Open the client panel",
      href: "/zakazi?source=homepage",
    },
    footerServiceLinks: [],
    trustItems: [
      { icon: "screen", label: "Clear information before the next step" },
      { icon: "people", label: "Choose support based on published profiles" },
      {
        icon: "shield",
        label: "Contact details are used to answer your request",
      },
    ],
    reasons: [
      {
        number: "01",
        title: "Understand the available support",
        description:
          "Review the centre's published services, approach and practical details in one place.",
        href: "/usluge",
      },
      {
        number: "02",
        title: "Meet the professionals",
        description:
          "Read approved profiles and decide who you would like to contact.",
        href: "/tim",
      },
      {
        number: "03",
        title: "Choose a next step",
        description:
          "Send a request when you are ready. A request is not an appointment confirmation.",
        href: "/zakazi",
      },
    ],
    firstSessionSteps: [
      {
        number: "01",
        title: "Review the published information",
        description:
          "Check the service, professional and practical details provided by the centre.",
      },
      {
        number: "02",
        title: "Send your request",
        description:
          "Share the contact information needed for the centre to respond.",
      },
      {
        number: "03",
        title: "Agree what happens next",
        description:
          "The centre confirms availability and explains the next step directly.",
      },
    ],
    workshopFacts: [],
    resources: [
      {
        category: "Getting started",
        title: "How to use the information on this site",
        description:
          "Compare the centre's published services and professional profiles, then choose the contact route that matches your needs.",
      },
    ],
    faqItems: [
      {
        id: "choose-next-step",
        question: "How do I choose a next step?",
        answer:
          "Start with the published service and professional profiles. If something is unclear, contact the centre before sending an appointment request.",
      },
      {
        id: "request-confirmation",
        question: "Is a submitted request a confirmed appointment?",
        answer:
          "No. The centre reviews the request and contacts you to confirm availability and the next step.",
      },
    ],
  },
  services: {
    serviceCatalog: [],
    PRICE_NOTE:
      "Service details and fees will appear here after the centre publishes them.",
    sessionPackages: [],
    supportAreas: [],
  },
  therapists: [],
  workspaceDemo: emptyWorkspaceDemo(),
};
