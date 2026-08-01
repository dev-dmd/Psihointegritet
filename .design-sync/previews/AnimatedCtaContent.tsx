import { AnimatedCtaContent } from "psihointegritet-ds";

// AnimatedCtaContent is the shared inner content (sheen sweep + rotating
// arrow circle + label) for the "Zakaži termin" pill CTA — used by both
// AnimatedCtaLink's <a>/<Link> (site-header.tsx) and GuidanceCtaPill's
// <button> (features/guidance/guidance-cta.tsx). It renders no wrapper of
// its own, so previews reproduce the same "group" pill wrapper that
// components/ui/animated-cta.tsx's animatedCtaClassName() produces at both
// real call sites — without it the hover choreography (sheen translate,
// arrow rotate) has nothing to anchor to. animatedCtaClassName itself is an
// internal helper (not part of the DS's exported component surface), so the
// class string is reproduced literally here rather than imported.
const pillBase =
  "group bg-forest hover:bg-forest-lift text-canvas relative inline-flex items-center overflow-hidden rounded-full font-semibold whitespace-nowrap no-underline transition-colors duration-[250ms]";

export function Md() {
  return (
    <span className={`${pillBase} gap-3 py-2 pr-6 pl-2 text-[14.5px]`}>
      <AnimatedCtaContent label="Zakaži termin" size="md" />
    </span>
  );
}

export function Sm() {
  return (
    <span className={`${pillBase} gap-2.5 py-1.5 pr-[18px] pl-1.5 text-[13.5px]`}>
      <AnimatedCtaContent label="Zakaži termin" size="sm" />
    </span>
  );
}
