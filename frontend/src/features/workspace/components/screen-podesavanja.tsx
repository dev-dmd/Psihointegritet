import { EmptyDashedCard } from "@/components/panel/empty-dashed-card";

import { PageHeader } from "./page-header";

const items = [
  {
    title: "Lokacije i način rada",
    body: "Adrese, prostorije i pravila za online/uživo rad centra.",
  },
  {
    title: "Obaveštenja",
    body: "Email podsetnici i pravila slanja — stižu sa notifikacijama.",
  },
  {
    title: "Podešavanja centra",
    body: "Radno vreme centra, pravila otkazivanja i opšte postavke.",
  },
];

/** Podešavanja — planned admin settings (U pripremi). */
export function ScreenPodesavanja() {
  return (
    <section className="animate-fade-up">
      <PageHeader
        title="Podešavanja"
        description="Postavke centra postoje kao rute i navigacija — konfiguracija stiže u kasnijim fazama."
      />
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {items.map((item) => (
          <EmptyDashedCard key={item.title} title={item.title} soon>
            {item.body}
          </EmptyDashedCard>
        ))}
      </div>
    </section>
  );
}
