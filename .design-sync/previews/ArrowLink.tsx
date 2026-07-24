import { ArrowLink } from "psihointegritet-ds";

// Real call sites cover all four combinations of tone/circled:
// - components/sections/therapists.tsx: plain underline, section-level "see all" link.
// - components/shared/resource-card.tsx: default "plain" tone, on a warm card.
// - components/sections/support-paths.tsx: "underlineStrong" tone, forest border.
// - components/shared/therapist-card.tsx: circled arrow badge (therapist card style).
export function Underline() {
  return (
    <ArrowLink href="/tim" tone="underline">
      Pogledajte ceo tim
    </ArrowLink>
  );
}

export function Plain() {
  return <ArrowLink href="#resursi">Pročitaj tekst</ArrowLink>;
}

export function UnderlineStrong() {
  return (
    <ArrowLink href="/tim" tone="underlineStrong">
      Pregledaj terapeute
    </ArrowLink>
  );
}

export function Circled() {
  return (
    <ArrowLink href="/tim/anja-stamenkovic" circled>
      Upoznaj terapeuta
    </ArrowLink>
  );
}
