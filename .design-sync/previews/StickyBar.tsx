import { useEffect } from "react";
import { StickyBar } from "psihointegritet-ds";

// StickyBar only slides into view once window.scrollY > 50 (its own
// useEffect scroll listener — see motion/sticky-bar.tsx); real usage
// (sections/site-header.tsx) leaves that entirely to the visitor scrolling
// past the hero. A static capture never scrolls on its own, so each cell
// force-scrolls past the threshold on mount — the only state a screenshot
// can usefully show is the bar's visible resting position. Children are the
// real header content from site-header.tsx's <StickyBar>, minus the Clerk
// auth menu / booking CTA / mobile menu (those are separate, unbundled
// components) — same brand mark, same primary nav links.
//
// StickyBar always mounts with `visible=false` (its own useState default),
// so even a same-tick scroll still triggers its `duration-500` CSS
// transition from translateY(-220%) — neutralize the transition so the
// resting translate-y-0 applies on the very first paint instead of racing
// a capture screenshot against a 500ms animation.
//
// A REAL window.scrollTo doesn't work here: the capture card's single-story
// wrapper is `.ds-single{transform:translateZ(0)}` (verified via a direct
// Playwright probe), and a `transform` on an ancestor makes it the
// containing block for `position:fixed` descendants per the CSS spec — so
// StickyBar's pill stops being viewport-fixed and starts behaving like
// `position:absolute` relative to that wrapper instead. Any amount of real
// scroll needed to cross the component's `scrollY > 50` check shifts the
// pill by the same amount and pushes it out of frame — scrolled-enough and
// in-frame are mutually exclusive through this harness. Solution: fake the
// scroll signal the component reads without moving the actual page —
// override `window.scrollY` and dispatch a synthetic 'scroll' event so
// StickyBar's own listener sees >50 and flips `visible`, while the page
// itself (and therefore the pill's real computed position) never moves.
function ScrolledPastThreshold({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    Object.defineProperty(window, "scrollY", { value: 120, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  }, []);
  return (
    <div style={{ paddingTop: 90 }}>
      <style>{"*{transition-duration:0s!important}"}</style>
      {children}
    </div>
  );
}

const navLinks = [
  { label: "Pronađi podršku", href: "/pronadji-podrsku" },
  { label: "Terapeuti", href: "/tim" },
  { label: "Usluge", href: "/usluge" },
  { label: "Radionice", href: "/radionice" },
];

export function Visible() {
  return (
    <ScrolledPastThreshold>
      <StickyBar>
        <a
          href="/"
          className="flex items-baseline no-underline"
          onClick={(e) => e.preventDefault()}
        >
          <span className="text-forest font-serif text-[19px] font-medium tracking-[0.01em]">
            PDC
          </span>
          <span
            aria-hidden
            className="bg-warm-shine ml-[3px] inline-block h-[5px] w-[5px] rounded-full"
          />
        </a>
        <nav
          aria-label="Brza navigacija"
          className="hidden items-center gap-[clamp(12px,1.2vw,22px)] lg:flex"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => e.preventDefault()}
              className="text-forest text-[13px] font-medium transition-colors duration-200 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <span className="bg-forest text-canvas inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-semibold no-underline">
          Zakaži termin
        </span>
      </StickyBar>
    </ScrolledPastThreshold>
  );
}
