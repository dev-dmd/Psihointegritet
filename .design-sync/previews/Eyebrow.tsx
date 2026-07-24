import { Eyebrow } from "psihointegritet-ds";

// Ported from real sections: default "sage" tone from final-cta.tsx (light
// surface), "meadow" tone from first-session.tsx (used on the bg-forest
// panel — the tone only reads correctly there, so the cell reproduces that
// dark surface), and "coffee" tone from workshop.tsx (used on the bg-warm
// panel, reproduced the same way).
export function Sage() {
  return <Eyebrow>Psihointegritet</Eyebrow>;
}

export function Meadow() {
  return (
    <div className="bg-forest rounded-2xl px-6 py-5">
      <Eyebrow tone="meadow">Prvi razgovor</Eyebrow>
    </div>
  );
}

export function Coffee() {
  return (
    <div className="bg-warm rounded-2xl px-6 py-5">
      <Eyebrow tone="coffee">Radionice · Primer radionice</Eyebrow>
    </div>
  );
}
