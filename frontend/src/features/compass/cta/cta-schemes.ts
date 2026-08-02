/**
 * The five Kompas CTA colour schemes, in one map.
 *
 * Every value is a Tailwind class built from an `@theme` token — no inline hex
 * anywhere, which is what lets the client pick a scheme live without the
 * component knowing any colour. The layout variants (A/B/C) read only these
 * class strings, so adding or retiring a scheme never touches a component.
 *
 * Scheme → band mapping comes from the design handoff §1:
 *   coffee → bg-coffee   · dark button, cream text
 *   forest → bg-forest   · meadow button, dark green text
 *   sage   → bg-meadow   · forest button, light text
 *   warm   → bg-warm     · coffee button, cream text
 *   cream  → light cream · forest button, light text
 */

export const compassCtaSchemeIds = [
  "coffee",
  "forest",
  "sage",
  "warm",
  "cream",
] as const;

export type CompassCtaSchemeId = (typeof compassCtaSchemeIds)[number];

export interface CompassCtaScheme {
  id: CompassCtaSchemeId;
  label: string;
  /** Swatch used by the temporary preview control. */
  dot: string;
  band: string;
  panel: string;
  panelBorder: string;
  title: string;
  accent: string;
  body: string;
  button: string;
  rule: string;
  glow: string;
  ring: string;
  meta: string;
}

export const compassCtaSchemes: Record<CompassCtaSchemeId, CompassCtaScheme> = {
  coffee: {
    id: "coffee",
    label: "Coffee",
    dot: "bg-coffee",
    band: "bg-coffee",
    panel: "bg-canvas/5",
    panelBorder: "border-canvas/15",
    title: "text-canvas",
    accent: "text-warm-shine",
    body: "text-canvas/75",
    button: "bg-kompas-ink text-canvas hover:bg-coffee-hover",
    rule: "bg-canvas/20",
    glow: "bg-warm-shine/15",
    ring: "border-canvas/10",
    meta: "text-canvas/60",
  },
  forest: {
    id: "forest",
    label: "Forest",
    dot: "bg-forest",
    band: "bg-forest",
    panel: "bg-canvas/5",
    panelBorder: "border-meadow/25",
    title: "text-canvas",
    accent: "text-meadow",
    body: "text-canvas/75",
    button: "bg-meadow text-kompas-on-meadow hover:bg-meadow-hover",
    rule: "bg-meadow/25",
    glow: "bg-meadow/15",
    ring: "border-meadow/15",
    meta: "text-canvas/60",
  },
  sage: {
    id: "sage",
    label: "Sage",
    dot: "bg-meadow",
    band: "bg-meadow",
    panel: "bg-surface/35",
    panelBorder: "border-forest/15",
    title: "text-forest",
    accent: "text-forest-soft",
    body: "text-coffee/75",
    button: "bg-forest text-canvas hover:bg-forest-hover",
    rule: "bg-forest/20",
    glow: "bg-surface/40",
    ring: "border-forest/10",
    meta: "text-coffee/65",
  },
  warm: {
    id: "warm",
    label: "Warm",
    dot: "bg-warm",
    band: "bg-warm",
    panel: "bg-surface/25",
    panelBorder: "border-coffee/15",
    title: "text-coffee",
    accent: "text-kompas-clay",
    body: "text-coffee/75",
    button: "bg-coffee text-canvas hover:bg-coffee-hover",
    rule: "bg-coffee/20",
    glow: "bg-surface/35",
    ring: "border-coffee/10",
    meta: "text-coffee/65",
  },
  cream: {
    id: "cream",
    label: "Cream",
    dot: "bg-kompas-cream",
    band: "bg-kompas-cream",
    panel: "bg-surface/70",
    panelBorder: "border-coffee/10",
    title: "text-forest",
    accent: "text-kompas-ochre",
    body: "text-coffee/75",
    button: "bg-forest text-canvas hover:bg-forest-hover",
    rule: "bg-coffee/12",
    glow: "bg-warm/25",
    ring: "border-coffee/10",
    meta: "text-coffee/65",
  },
};

export const compassCtaVariantIds = ["A", "B", "C"] as const;
export type CompassCtaVariantId = (typeof compassCtaVariantIds)[number];

export const compassCtaVariantLabels: Record<CompassCtaVariantId, string> = {
  A: "Verzija A",
  B: "Verzija B",
  C: "Verzija C",
};

/** Defaults the section falls back to when no preview choice is stored. */
export const defaultCompassCtaVariant: CompassCtaVariantId = "A";
export const defaultCompassCtaScheme: CompassCtaSchemeId = "coffee";
