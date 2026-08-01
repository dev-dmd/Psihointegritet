import { AnimatedCtaLink } from "psihointegritet-ds";

// Ported from components/sections/site-header.tsx — the header's primary
// booking CTA ("Zakaži termin" → /zakazi?source=header), shown at its
// default (transparent header) size and at the "sm" size used once the
// user scrolls and the sticky pill bar takes over.
export function Header() {
  return <AnimatedCtaLink href="/zakazi?source=header" label="Zakaži termin" />;
}

export function StickyBar() {
  return (
    <AnimatedCtaLink href="/zakazi?source=header" label="Zakaži termin" size="sm" />
  );
}
