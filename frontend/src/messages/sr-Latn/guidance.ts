import type { Widen } from "@/messages/types";
import type { EnGuidance } from "@/messages/en/guidance";

export const guidance: Widen<EnGuidance> = {
  chooser: {
    title: "Kako želite da pronađete termin?",
    description: "Izaberite način koji vam više odgovara.",
    guidedTitle: "Pomozite mi da pronađem terapeuta",
    guidedDescription:
      "Odgovorite na nekoliko kratkih pitanja i odmah dobijte predlog.",
    directLabel: "Znam kog terapeuta želim",
  },
};
