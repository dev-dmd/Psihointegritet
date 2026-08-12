import type { EnSuperadmin } from "@/messages/en/superadmin";
import type { Widen } from "@/messages/types";

/** Byte-identical to what these screens rendered before the extraction. */
export const superadmin: Widen<EnSuperadmin> = {
  gateStatus: {
    on: "Uključeno",
    off: "Isključeno",
    comingSoon: "U pripremi",
  },
  comingSoon: {
    title: "U pripremi",
    description:
      "Pretplate, Audit Log i Podešavanja postoje kao rute i navigacija — poslovna logika stiže u kasnijim fazama.",
    billing: {
      title: "Pretplate i potrošnja",
      body: "Plan, trial period, obnove, istorija uplata i procenjena mesečna potrošnja — read-only sa ručno unetim planom.",
    },
    auditLog: {
      title: "Audit Log",
      body: "Ko, koja akcija, nad kojim tenantom, prethodna i nova vrednost, razlog, vreme — zapisi već nastaju kroz Feature Gates.",
    },
  },
  gateToggle: {
    enabled: "Uključen feature gate — {gate}",
    disabled: "Isključen feature gate — {gate}",
  },
};
