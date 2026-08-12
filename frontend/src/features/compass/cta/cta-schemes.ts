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
  meta: string;
  /**
   * Single border colour behind every hairline in the band: the three rings,
   * the corner bracket, the aside divider and the meta rule. The design varies
   * their weight with `opacity-*`, not with five near-identical colours.
   */
  ruleBorder: string;
  /**
   * `from-*` stops of the three blurred aurora blobs. They are gradient stops
   * rather than flat fills because a solid blob at these sizes reads as a patch
   * — the falloff, not the blur, is what makes it look like light.
   */
  auroraGlow: string;
  aurora: string;
  aurora2: string;
  /** Frosted circles sitting behind the variant A logo. */
  glass: string;
  glass2: string;
  glassRule: string;
}

export const compassCtaSchemes: Record<CompassCtaSchemeId, CompassCtaScheme> = {
  coffee: {
    id: "coffee",
    label: "Coffee",
    dot: "bg-coffee",
    band: "bg-coffee",
    panel: "bg-canvas/5",
    panelBorder: "border-canvas/16",
    title: "text-canvas",
    accent: "text-warm-shine",
    body: "text-canvas/74",
    button: "bg-kompas-ink text-canvas hover:bg-coffee-hover",
    meta: "text-canvas/60",
    ruleBorder: "border-canvas/18",
    auroraGlow: "from-warm-shine/16 to-warm-shine/0",
    aurora: "from-warm/26 to-warm/0",
    aurora2: "from-meadow/16 to-meadow/0",
    glass: "bg-canvas/7",
    glass2: "bg-warm-shine/9",
    glassRule: "border-canvas/20",
  },
  forest: {
    id: "forest",
    label: "Forest",
    dot: "bg-forest",
    band: "bg-forest",
    panel: "bg-canvas/6",
    panelBorder: "border-meadow/22",
    title: "text-canvas",
    accent: "text-meadow",
    body: "text-canvas/76",
    button: "bg-meadow text-kompas-on-meadow hover:bg-meadow-hover",
    meta: "text-canvas/60",
    ruleBorder: "border-meadow/24",
    auroraGlow: "from-meadow/14 to-meadow/0",
    aurora: "from-meadow/24 to-meadow/0",
    aurora2: "from-warm/16 to-warm/0",
    glass: "bg-canvas/8",
    glass2: "bg-meadow/12",
    glassRule: "border-meadow/26",
  },
  sage: {
    id: "sage",
    label: "Sage",
    dot: "bg-meadow",
    band: "bg-meadow",
    panel: "bg-surface/34",
    panelBorder: "border-forest/16",
    title: "text-forest",
    accent: "text-forest-soft",
    body: "text-coffee/78",
    button: "bg-forest text-canvas hover:bg-forest-hover",
    meta: "text-coffee/65",
    ruleBorder: "border-forest/18",
    auroraGlow: "from-surface/40 to-surface/0",
    aurora: "from-surface/50 to-surface/0",
    aurora2: "from-warm/30 to-warm/0",
    glass: "bg-surface/32",
    glass2: "bg-forest/8",
    glassRule: "border-surface/50",
  },
  warm: {
    id: "warm",
    label: "Warm",
    dot: "bg-warm",
    band: "bg-warm",
    panel: "bg-surface/26",
    panelBorder: "border-coffee/16",
    title: "text-coffee",
    accent: "text-kompas-clay",
    body: "text-coffee/78",
    button: "bg-coffee text-canvas hover:bg-coffee-hover",
    meta: "text-coffee/65",
    ruleBorder: "border-coffee/18",
    auroraGlow: "from-surface/34 to-surface/0",
    aurora: "from-surface/44 to-surface/0",
    aurora2: "from-meadow/28 to-meadow/0",
    glass: "bg-surface/28",
    glass2: "bg-coffee/7",
    glassRule: "border-surface/46",
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
    body: "text-coffee/74",
    button: "bg-forest text-canvas hover:bg-forest-hover",
    meta: "text-coffee/65",
    ruleBorder: "border-coffee/12",
    auroraGlow: "from-warm/28 to-warm/0",
    aurora: "from-warm/34 to-warm/0",
    aurora2: "from-meadow/32 to-meadow/0",
    glass: "bg-surface/60",
    glass2: "bg-warm/18",
    glassRule: "border-surface/80",
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
