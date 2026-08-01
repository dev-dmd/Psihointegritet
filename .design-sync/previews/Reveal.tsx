import { Reveal } from "psihointegritet-ds";

// Reveal is a pure scroll-triggered wrapper (motion/react whileInView) — no
// visual output of its own, so each cell reproduces a real section's inner
// content verbatim to show what actually ends up on screen once the fade/lift
// settles (`once: true`, so the resting state is just the content at
// opacity 1 / y 0 — exactly what a static capture shows).
//
// A static screenshot never scrolls, so the IntersectionObserver-driven
// whileInView animation may not have fired (or completed its 0.7s
// transition) by capture time — the first attempt came back fully blank
// (opacity: 0) for both cells. Reveal itself checks `useReducedMotion()`
// and renders children in a PLAIN div (no animation at all) when true —
// forcing that branch, by making `prefers-reduced-motion: reduce` true
// before Reveal's module-level media query check runs, sidesteps the
// timing race entirely and always shows the resting state.
if (typeof window !== "undefined" && window.matchMedia) {
  const realMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query: string) =>
    query.includes("prefers-reduced-motion")
      ? ({ matches: true, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true, onchange: null } as MediaQueryList)
      : realMatchMedia(query);
}

// From sections/trust-strip.tsx — trustItems from content/homepage.ts,
// rendered on the forest strip exactly as the real section does.
export function TrustStrip() {
  const trustItems = [
    { label: "Online i uživo" },
    { label: "Niš, Leskovac i druge lokacije" },
    { label: "Individualni i partnerski rad" },
    { label: "Poverljivost i stručnost" },
  ];

  return (
    <Reveal>
      <div className="bg-forest grid grid-cols-1 gap-[18px] rounded-3xl px-6 py-[26px] sm:grid-cols-2 sm:gap-[22px] md:px-12 md:py-9 lg:grid-cols-4 lg:gap-8">
        {trustItems.map((item, index) => (
          <div
            key={item.label}
            className={
              index > 0
                ? "lg:border-canvas/14 flex items-center gap-3.5 lg:border-l lg:pl-8"
                : "flex items-center gap-3.5"
            }
          >
            <span
              aria-hidden
              className="bg-meadow/70 inline-block h-[22px] w-[22px] shrink-0 rounded-full"
            />
            <span className="text-canvas text-[15px] font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

// From sections/final-cta.tsx — closing headline + two CTAs, centered.
export function FinalCta() {
  return (
    <Reveal>
      <div className="mx-auto max-w-[760px] text-center">
        <p className="text-sage mb-5 text-[12px] font-semibold tracking-[0.14em] uppercase">
          Psihointegritet
        </p>
        <h2 className="text-forest mb-[22px] font-serif text-[clamp(30px,8.5vw,38px)] leading-[1.05] font-normal tracking-[-0.018em] text-pretty md:text-6xl">
          Ne morate unapred znati odakle da počnete.
        </h2>
        <p className="text-coffee/72 mb-10 text-[17px] leading-[1.65]">
          Dovoljan je jedan korak — a mi ćemo vam pomoći da pronađete pravi.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <span className="bg-forest text-canvas inline-flex items-center rounded-full px-[30px] py-3.5 text-[15px] font-semibold no-underline">
            Pronađi podršku
          </span>
          <span className="border-forest/25 text-forest inline-flex items-center rounded-full border px-[30px] py-3.5 text-[15px] font-semibold no-underline">
            Pregledaj terapeute
          </span>
        </div>
      </div>
    </Reveal>
  );
}
