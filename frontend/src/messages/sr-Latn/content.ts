import type { EnContent } from "@/messages/en/content";
import type { Widen } from "@/messages/types";

/** Byte-identical to what these screens rendered before the extraction. */
export const content: Widen<EnContent> = {
  title: "Sadržaj",
  description:
    "Sistemske stranice, usluge, terapeuti, programi, kompanije i paketi. Izaberite postojeću stavku i menjajte samo polja definisana njenom strukturom.",
  loadFailed: "Sadržaj se ne može učitati",
  loadFailedHelp:
    "Server trenutno ne može da obradi zahtev. Pokušajte ponovo. Ako se greška ponovi, pošaljite podršci ID greške: {id}.",
  requestFailed: "Zahtev nije uspeo. Pokušajte ponovo.",
  reloadHint: "Sadržaj se trenutno ne može učitati. Osvežite stranicu.",
  systemNotice:
    "Zaštićeni sistemski sadržaj. Stavka bez CMS revizije koristi postojeći tekst iz koda; izmena počinje praznim poljima i čuva samo unete vrednosti.",
  wrongTemplate: "Pogrešan template",
  counted: "{label} ({count})",
};
