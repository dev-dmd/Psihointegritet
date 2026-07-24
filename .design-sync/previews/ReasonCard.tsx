import { ReasonCard } from "psihointegritet-ds";

// Real content from src/content/homepage.ts `reasons` — the numbered
// "razlog dolaska" grid on the public homepage, each linking to
// /pronadji-podrsku (or a more specific route).

export function StressAndBurnout() {
  return (
    <ReasonCard
      reason={{
        number: "01",
        title: "Stres i burnout",
        description:
          "Kada iscrpljenost postane svakodnevica, a odmor više ne pomaže.",
        href: "/pronadji-podrsku",
      }}
    />
  );
}

export function PartnerRelationships() {
  return (
    <ReasonCard
      reason={{
        number: "02",
        title: "Partnerski odnosi",
        description:
          "Komunikacija, bliskost, konflikti i faze kroz koje odnos prolazi.",
        href: "/pronadji-podrsku",
      }}
    />
  );
}

export function AdolescentSupport() {
  return (
    <ReasonCard
      reason={{
        number: "06",
        title: "Podrška adolescentima",
        description:
          "Siguran prostor za mlade u periodu odrastanja i promena.",
        href: "/tim",
      }}
    />
  );
}
