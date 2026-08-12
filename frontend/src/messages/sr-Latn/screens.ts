import type { EnScreens } from "@/messages/en/screens";
import type { Widen } from "@/messages/types";

/** Byte-identical to what these screens rendered before the extraction. */
export const screens: Widen<EnScreens> = {
  overview: {
    morning: "Dobro jutro",
    afternoon: "Dobar dan",
    evening: "Dobro veče",
    lead: "Evo šta danas traži vašu pažnju.",
    errors: "Greške koje traže vašu pažnju ({count, number})",
    dismissError: "Ukloni grešku: {title}",
    todaySchedule: "Današnji raspored",
    research: "Istraživanja",
    newResponses: "+{count, number} novih odgovora ove nedelje",
    surveyProgress: "{survey} · completion {rate}",
  },
  profile: {
    internalLabel: "Interno.",
    internalNote:
      "Ove preferencije čita samo Matching engine — ne prikazuju se u javnoj biografiji.",
    acceptsHeading: "Koga prima",
    maxNewMonthly: "Max novih mesečno",
    onlineOrInPerson: "Online / uživo",
  },
};
