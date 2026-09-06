import type { Widen } from "@/messages/types";
import type { EnGuidance } from "@/messages/en/guidance";

export const guidance: Widen<EnGuidance> = {
  flow: {
    dialogLabel: "Vođeni izbor podrške",
    intro: {
      eyebrow: "Vođeni izbor",
      title: "Pronađite podršku koja vam odgovara",
      description:
        "Odgovorite na nekoliko kratkih pitanja kako bismo vam predložili terapeuta i oblik rada koji prema oblastima rada i iskustvu može odgovarati vašim potrebama.",
      note: "Upitnik nije dijagnostički alat i ne postavlja dijagnozu. Preporuka služi kao pomoć pri izboru i ne predstavlja stručnu procenu.",
      start: "Započni upitnik",
      browseTherapists: "Samostalno upoznajte terapeute",
      book: "Zakaži termin",
    },
  },
  chooser: {
    title: "Kako želite da pronađete termin?",
    description: "Izaberite način koji vam više odgovara.",
    guidedTitle: "Pomozite mi da pronađem terapeuta",
    guidedDescription:
      "Odgovorite na nekoliko kratkih pitanja i odmah dobijte predlog.",
    directLabel: "Znam kog terapeuta želim",
  },
};
