import { ResourceCard } from "psihointegritet-ds";

// Real content from src/content/homepage.ts `resources` — the "Resursi"
// article grid on the public homepage.

export function BurnoutArticle() {
  return (
    <ResourceCard
      article={{
        category: "Stres i burnout",
        title:
          "Kako prepoznati burnout pre nego što postane ozbiljan problem?",
        description:
          "Burnout se ne pojavljuje odjednom. Često mu prethode dugotrajan umor, gubitak motivacije, razdražljivost i osećaj da se ni nakon odmora ne oporavljamo. Saznajte koje rane signale ne treba zanemariti.",
      }}
    />
  );
}

export function TherapyArticle() {
  return (
    <ResourceCard
      article={{
        category: "Psihoterapija",
        title:
          "Zašto nije potrebno da dođemo do „pucanja“ da bismo potražili podršku?",
        description:
          "Psihoterapija nije rezervisana samo za krizne trenutke. Razgovor sa terapeutom može biti prostor za bolje razumevanje sebe, odnosa i obrazaca koje želimo da promenimo.",
      }}
    />
  );
}

export function BoundariesArticle() {
  return (
    <ResourceCard
      article={{
        category: "Granice i odnosi",
        title: "Postavljanje granica bez osećaja krivice",
        description:
          "Granice nisu odbacivanje drugih, već način da zaštitimo svoje potrebe, vreme i emocionalni prostor. Istražite zašto se krivica javlja i kako možemo jasnije komunicirati ono što nam je važno.",
      }}
    />
  );
}
