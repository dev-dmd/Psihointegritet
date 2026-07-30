import { ButtonLink } from "psihointegritet-ds";

// Ported from real sections: primary + outline pairing from final-cta.tsx
// (the homepage closing CTA), the "meadow" variant + copy from
// support-paths.tsx's guided-quiz tile, and the "warm" variant + copy from
// first-session.tsx.
export function Primary() {
  return (
    <ButtonLink href="/pronadji-podrsku" size="lg">
      Pronađi podršku
    </ButtonLink>
  );
}

export function Outline() {
  return (
    <ButtonLink href="/tim" variant="outline" size="lg">
      Pregledaj terapeute
    </ButtonLink>
  );
}

export function Meadow() {
  return (
    <div className="bg-forest inline-block rounded-2xl p-6">
      <ButtonLink href="/pronadji-podrsku" variant="meadow">
        Započni kratki upitnik
      </ButtonLink>
    </div>
  );
}

export function Warm() {
  return (
    <ButtonLink href="/zakazi?source=homepage" variant="warm">
      Pošaljite zahtev za termin
    </ButtonLink>
  );
}
