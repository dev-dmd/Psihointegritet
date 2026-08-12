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
  appointments: {
    tabs: {
      today: "Danas",
      week: "Nedelja",
      upcoming: "Predstojeći",
      requests: "Zahtevi · {count, number}",
      waitlist: "Lista čekanja",
    },
    freeSlot: "Slobodan termin",
    book: "+ Zakaži",
    allAppointments: "Svi termini →",
    thisWeek: "Ova nedelja",
    occupancy: "Popunjenost {percent, number}%",
    upcomingNote: "Pun predstojeći kalendar stiže sa Booking engine-om.",
    requested: "Traženo: {preferred}",
    requestNote:
      "Zahtev ističe posle 24h ako se ne potvrdi. Potvrda i predlog izmene stižu sa Booking engine-om.",
  },
  companies: {
    noActiveFund: "Bez aktivnog fonda — u fazi {phase}.",
  },
  status: {
    potvrdjen: "Potvrđen",
    ceka: "Čeka potvrdu",
    predlog: "Predložena izmena",
    zavrsen: "Završen",
    odrzan: "Održan",
    otkazanK: "Otkazao klijent",
    otkazanT: "Otkazao terapeut",
    odbijen: "Odbijen",
    rezervisano: "Kompanijski termin",
    aktivan: "Aktivan klijent",
    neaktivan: "Neaktivan",
    nedodeljen: "Nedodeljen",
    preuzet: "Preuzet",
    koNovi: "Novi upit",
    koPonuda: "Ponuda poslata",
    koPilot: "Pilot program",
    koAktivna: "Aktivna",
    usAktivna: "Aktivna",
    usPriprema: "U pripremi",
    usNacrt: "Nacrt",
  },
};
