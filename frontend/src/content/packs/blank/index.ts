import type { ContentPack, FallbackContent } from "@/content/pack-types";

import { emptyWorkspaceDemo } from "../empty-workspace";

function blankContent(
  locale: FallbackContent["metadata"]["locale"],
): FallbackContent {
  const isEnglish = locale === "en";

  return {
    metadata: {
      packId: "blank",
      locale,
      demoDataMode: "off",
      sourceStatus: {
        publicSite: "missing",
        therapists: "missing",
        services: "missing",
        companies: "missing",
        research: "missing",
        compass: "missing",
        legal: "missing",
      },
      editorGuidance: isEnglish
        ? {
            homepage:
              "Add reviewed public copy before publishing this organization.",
            services: "Add only confirmed services, prices and booking rules.",
            therapists:
              "Add only owner-supplied biographies and verified credentials.",
          }
        : {
            homepage:
              "Dodajte pregledan javni sadržaj pre objavljivanja organizacije.",
            services:
              "Dodajte samo potvrđene usluge, cene i pravila zakazivanja.",
            therapists:
              "Dodajte samo dostavljene biografije i proverena zvanja.",
          },
    },
    homepage: {
      companies: {
        eyebrow: "",
        title: "",
        description: "",
        action: { label: "", href: "" },
      },
      clientLink: { prefix: "", label: "", href: "" },
      footerServiceLinks: [],
      trustItems: [],
      reasons: [],
      firstSessionSteps: [],
      workshopFacts: [],
      resources: [],
      faqItems: [],
    },
    services: {
      serviceCatalog: [],
      PRICE_NOTE: "",
      sessionPackages: [],
      supportAreas: [],
    },
    therapists: [],
    workspaceDemo: emptyWorkspaceDemo(),
  };
}

export const blankPack: ContentPack = {
  en: blankContent("en"),
  "sr-Latn": blankContent("sr-Latn"),
};
