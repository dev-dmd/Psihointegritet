import type { EnAccount } from "@/messages/en/account";
import type { Widen } from "@/messages/types";

/**
 * Serbian Latin, ekavica — the client panel catalogue (D-017, D-077).
 *
 * Mirrors the wording of the „Psihointegritet Klijent Panel" design handoff
 * wherever the screen behind it is real, and states plainly that a module is
 * not there yet wherever it is not. No sentence here promises an email the
 * Booking Engine does not send.
 */
export const account: Widen<EnAccount> = {
  metadata: {
    panel: "Moj panel",
    appointments: "Moji termini",
    programs: "Programi",
    profile: "Profil",
  },
  brand: {
    panel: "Klijentska zona",
  },
  nav: {
    home: "Početna",
    appointments: "Termini",
    programs: "Programi",
    profile: "Profil",
  },
  topbar: {
    notifications: "Obaveštenja",
    noNotifications: "Nema novih obaveštenja.",
    userMenu: "Korisnički meni",
  },
  home: {
    morning: "Dobro jutro",
    afternoon: "Dobar dan",
    evening: "Dobro veče",
    greeting: "{greeting}, {name}.",
    greetingPlain: "{greeting}.",
    nextAppointment: "Sledeći termin",
    yourRequest: "Vaš zahtev",
    // Colon rather than „poslat 1. avgusta": `Intl` renders the month in the
    // nominative, and Serbian would need the genitive after the verb.
    requestSentOn: "Zahtev poslat: {date}",
    confirmedTitle: "Vaš termin je potvrđen",
    confirmedNote: "Terapeut će vam poslati detalje za ovu sesiju.",
    pendingNote:
      "Terapeut pregleda zahtev i javlja vam se na kontakt koji ste ostavili.",
    emptyTitle: "Još nemate zakazan termin",
    emptyNote:
      "Pošaljite zahtev — terapeut će vas kontaktirati da dogovorite vreme.",
    book: "Zakaži termin",
    bookHint: "Zahtev potvrđuje terapeut",
    myPackage: "Moj paket",
    myPackageHint: "Još nije dostupno",
    allAppointments: "Svi moji termini",
    programsTitle: "Programi i paketi",
    programsNote:
      "Online programi i krediti za sesije prikazivaće ovde svoj napredak kada ih centar otvori.",
  },
  state: {
    loadFailed: "Vaši termini trenutno ne mogu da se učitaju.",
  },
  appointments: {
    title: "Moji termini",
    tabs: {
      upcoming: "Predstojeći",
      history: "Istorija",
    },
    requestTitle: "Zahtev za termin",
    sentOn: "Poslato: {date}",
    emptyUpcoming: "Nemate otvorenih zahteva za termin.",
    emptyHistory: "Još nema ranijih zahteva.",
    newAppointment: "+ Zakaži novi termin",
    timeNote:
      "Tačno vreme dogovarate sa terapeutom — ovde se još ne prikazuje.",
  },
  status: {
    submitted: "Čeka potvrdu terapeuta",
    underReview: "U pregledu",
    alternativeProposed: "Predložen drugi termin",
    awaitingClient: "Čeka vaš izbor",
    converted: "Potvrđen",
    declined: "Odbijen",
    withdrawn: "Povučen",
    expired: "Istekao",
  },
  format: {
    online: "Online",
    inPerson: "Uživo",
  },
  programs: {
    title: "Programi i paketi",
    emptyTitle: "Nemate aktivnih programa ni paketa",
    emptyNote:
      "Online programi i paketi sesija još nisu deo vašeg naloga. Kada budu, ovde ćete videti napredak i preostale kredite.",
  },
  profile: {
    title: "Profil",
    noEmail: "Na ovom nalogu nema email adrese",
    notificationsTitle: "Obaveštenja",
    confirmationEmails: "Potvrde termina emailom",
    reminder24h: "Podsetnik 24 sata pre termina",
    newsletter: "Novosti i edukativni sadržaji",
    notificationsNote:
      "Podešavanja obaveštenja još ne mogu da se menjaju — ovo je najava opcija koje stižu.",
    documentsTitle: "Dokumenti",
    privacyPolicy: "Politika privatnosti",
    bookingRules: "Pravila zakazivanja",
    terms: "Uslovi korišćenja",
  },
};
