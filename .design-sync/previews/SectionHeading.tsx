import { SectionHeading } from "psihointegritet-ds";

// Three real callers (components/sections/*.tsx), covering the prop's main
// axis: no description, a plain string description, and a ReactNode
// description (the Faq section wraps its lead in a <span> to cap its width
// independently of the block's own max-width).

// From sections/therapists.tsx — no description at all.
export function NoDescription() {
  return (
    <SectionHeading
      eyebrow="Naš tim"
      title="Upoznajte terapeute Psihointegriteta"
    />
  );
}

// From sections/reasons.tsx — plain string description.
export function StringDescription() {
  return (
    <SectionHeading
      eyebrow="Razlozi dolaska"
      title="Od čega želite da počnete?"
      description="Ne postoji „dovoljno velik“ razlog za dolazak. Izaberite temu koja vam je najbliža — to je dovoljno za početak razgovora."
    />
  );
}

// From sections/faq.tsx — ReactNode description.
export function RichDescription() {
  return (
    <SectionHeading
      eyebrow="Poverenje i privatnost"
      title="Najčešća pitanja"
      description={
        <span className="block max-w-[400px]">
          Sve što razgovarate sa terapeutom ostaje poverljivo. Ako imate
          pitanje koje ovde ne vidite, slobodno nam pišite.
        </span>
      }
    />
  );
}
