import { Accordion } from "psihointegritet-ds";

// Real FAQ content ported verbatim from src/content/homepage.ts's
// `faqItems`, the same data the Faq section (components/sections/faq.tsx)
// passes straight through. That section always opens the first item
// (`defaultOpenId={faqItems[0]?.id ?? null}`); the second cell shows the
// fully collapsed resting state.
const faqItems = [
  {
    id: "poverljivost",
    question: "Da li je sve što kažem poverljivo?",
    answer:
      "Da. Sve informacije ostaju između klijenta i terapeuta, osim u situacijama propisanim zakonom i etičkim kodeksom.",
  },
  {
    id: "trajanje",
    question: "Koliko traje terapija?",
    answer:
      "Trajanje zavisi od vaših ciljeva i potreba. Neki ljudi dolaze nekoliko meseci, dok drugi biraju dugoročniji proces.",
  },
  {
    id: "online",
    question: "Da li mogu raditi online?",
    answer: "Da. Sve usluge dostupne su i online.",
  },
  {
    id: "izbor-terapeuta",
    question: "Kako da znam koji terapeut mi odgovara?",
    answer:
      "Na profilima terapeuta možete pronaći informacije o njihovom pristupu, iskustvu i oblastima rada, a uvek nas možete kontaktirati za preporuku.",
  },
  {
    id: "dijagnoza",
    question: "Da li mi treba dijagnoza da bih došao na terapiju?",
    answer:
      "Ne. Psihoterapija je namenjena svima koji žele bolje razumeti sebe ili prolaze kroz izazovan životni period.",
  },
];

export function FirstOpen() {
  return <Accordion items={faqItems} defaultOpenId={faqItems[0]?.id ?? null} />;
}

export function Collapsed() {
  return <Accordion items={faqItems} defaultOpenId={null} />;
}
