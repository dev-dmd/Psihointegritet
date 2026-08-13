import * as homepageEn from "@/content/en/homepage";
import * as servicesEn from "@/content/en/services";
import { therapists as therapistsEn } from "@/content/en/therapists";
import * as workspaceEn from "@/content/en/workspace-demo";
import type { ContentPack, ContentPackMetadata } from "@/content/pack-types";
import * as homepageSrLatn from "@/content/sr-Latn/homepage";
import * as servicesSrLatn from "@/content/sr-Latn/services";
import { therapists as therapistsSrLatn } from "@/content/sr-Latn/therapists";
import * as workspaceSrLatn from "@/content/sr-Latn/workspace-demo";

function metadata(locale: ContentPackMetadata["locale"]): ContentPackMetadata {
  return {
    packId: "psihointegritet",
    locale,
    demoDataMode: "showcase",
    // Mirrors PLATFORM-CONTENT/CONTENT_GAPS.yaml. Presence in runtime is not
    // upgraded to approved/published without the documented review.
    sourceStatus: {
      publicSite: "in_review",
      therapists: "in_review",
      services: "missing",
      companies: "missing",
      research: "missing",
      compass: "in_review",
      legal: "missing",
    },
    editorGuidance:
      locale === "en"
        ? {
            homepage:
              "Review every inherited section and replace it only where the centre has approved source copy.",
            services:
              "Confirm service names, duration, fees, formats and booking rules with the owner before publication.",
            therapists:
              "Use an owner-provided biography and verify credentials before requesting clinical and business review.",
          }
        : {
            homepage:
              "Pregledajte svaku nasleđenu sekciju i zamenite je samo potvrđenim izvornim tekstom centra.",
            services:
              "Pre objave sa vlasnikom potvrdite nazive, trajanje, cene, formate i pravila zakazivanja.",
            therapists:
              "Koristite biografiju koju je dostavio vlasnik i proverite zvanja pre stručnog i poslovnog pregleda.",
          },
  };
}

export const psihointegritetPack: ContentPack = {
  en: {
    metadata: metadata("en"),
    homepage: homepageEn,
    services: servicesEn,
    therapists: therapistsEn,
    workspaceDemo: workspaceEn,
  },
  "sr-Latn": {
    metadata: metadata("sr-Latn"),
    homepage: homepageSrLatn,
    services: servicesSrLatn,
    therapists: therapistsSrLatn,
    workspaceDemo: workspaceSrLatn,
  },
};
