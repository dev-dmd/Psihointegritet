import { PageHero } from "psihointegritet-ds";

// Ported from src/app/(public)/o-nama/page.tsx — the "o-nama" (About) page's
// real hero composition (site name eyebrow + serif h1 + lead paragraph).
export function Surface() {
  return (
    <PageHero id="o-nama">
      <div style={{ maxWidth: 760 }}>
        <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
          Psihointegritet
        </p>
        <h1 className="text-forest mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal">
          Digitalni centar za mentalno zdravlje
        </h1>
        <p className="text-coffee/75 text-[16.5px] leading-[1.65]">
          Psihointegritet povezuje psihoterapiju, savetovanje, edukativne
          sadržaje, radionice i programe ličnog razvoja - online i uživo.
        </p>
      </div>
    </PageHero>
  );
}

export function Forest() {
  return (
    <PageHero id="tim" tone="forest">
      <div style={{ maxWidth: 760 }}>
        <p className="text-sage mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
          Naš tim
        </p>
        <h1 className="font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-white">
          Terapeuti koji vas prate
        </h1>
        <p className="mt-4 max-w-[640px] text-[16.5px] leading-[1.65] text-white/75">
          Svaki terapeut u timu radi po geštalt pristupu, uz sopstveni fokus i
          format rada — individualno, sa parovima ili online.
        </p>
      </div>
    </PageHero>
  );
}
