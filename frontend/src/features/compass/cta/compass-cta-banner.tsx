import Image from "next/image";

import { cn } from "@/helpers/cn";

import type { CompassCtaScheme, CompassCtaVariantId } from "./cta-schemes";

const CTA_LABEL = "Pokreni Kompas";

/** Fixed copy from the handoff — deliberately free of diagnostic language. */
const LEAD_FULL =
  "Odgovorite na nekoliko kratkih pitanja kako bismo vam predložili sadržaje koji bi vam trenutno mogli biti korisni. Kompas nije dijagnostički alat.";
const LEAD_CENTERED =
  "Nekoliko kratkih pitanja, pa vam predlažemo sadržaje i alate koji bi vam sada mogli pomoći. Bez testa, bez dijagnoze.";
const LEAD_STRIP =
  "Kratka pitanja koja vas usmeravaju ka sadržaju i alatima. Bez dijagnoze.";
const ASIDE =
  "Pomaže vam da razumete svoju situaciju i usmerava vas ka edukativnom sadržaju i alatima.";

/** Decoration: one radial glow and one thin ring, both low opacity, no SVG. */
function BandDecoration({ scheme }: { scheme: CompassCtaScheme }) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full blur-3xl",
          scheme.glow,
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-28 -left-12 h-64 w-64 rounded-full border",
          scheme.ring,
        )}
      />
    </>
  );
}

function CtaLink({
  scheme,
  onStart,
  className,
}: {
  scheme: CompassCtaScheme;
  onStart: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-colors",
        scheme.button,
        className,
      )}
    >
      {CTA_LABEL}
      <span aria-hidden>→</span>
    </button>
  );
}

function Title({
  scheme,
  className,
}: {
  scheme: CompassCtaScheme;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "font-serif leading-[1.12] font-normal text-balance",
        scheme.title,
        className,
      )}
    >
      <em className={cn("not-italic", scheme.accent)}>Kompas</em> mentalnog
      zdravlja
    </h3>
  );
}

interface VariantProps {
  scheme: CompassCtaScheme;
  onStart: () => void;
}

/** Variant A — split panel: illustration left, bordered panel right. */
function VariantA({ scheme, onStart }: VariantProps) {
  return (
    <div className="relative mx-auto grid max-w-[1180px] items-center gap-8 px-5 py-12 md:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 lg:py-16">
      <div className="flex justify-center">
        <Image
          src="/images/kompas-logo.png"
          alt="Kompas mentalnog zdravlja"
          width={512}
          height={512}
          sizes="(min-width: 1024px) 30vw, 60vw"
          className="h-auto w-[clamp(140px,26vw,220px)] drop-shadow-2xl"
        />
      </div>

      <div
        className={cn(
          "rounded-panel border px-6 py-7 md:px-8 md:py-9",
          scheme.panel,
          scheme.panelBorder,
        )}
      >
        <div className="grid gap-7 md:grid-cols-2 md:gap-8">
          <div>
            <Title scheme={scheme} className="text-[26px] md:text-[32px]" />
            <p
              className={cn(
                "mt-4 text-[14.5px] leading-[1.7] text-pretty",
                scheme.body,
              )}
            >
              {LEAD_FULL}
            </p>
          </div>

          <div className="flex flex-col gap-5 md:border-l md:border-transparent md:pl-8">
            <div
              aria-hidden
              className={cn("hidden h-px w-full md:block", scheme.rule)}
            />
            <p className={cn("text-[13.5px] leading-[1.65]", scheme.body)}>
              {ASIDE}
            </p>
            <CtaLink scheme={scheme} onStart={onStart} className="self-start" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Variant B — centred block with an icon and a meta row. */
function VariantB({ scheme, onStart }: VariantProps) {
  return (
    <div className="relative mx-auto flex max-w-[720px] flex-col items-center gap-5 px-5 py-14 text-center md:px-8 md:py-16">
      <Image
        src="/images/kompas-logo.png"
        alt=""
        width={512}
        height={512}
        sizes="88px"
        className="h-auto w-[88px] drop-shadow-xl"
      />
      <Title scheme={scheme} className="text-[28px] md:text-[36px]" />
      <p className={cn("max-w-[52ch] text-[15px] leading-[1.7]", scheme.body)}>
        {LEAD_CENTERED}
      </p>
      <CtaLink scheme={scheme} onStart={onStart} className="mt-1" />

      <div
        className={cn(
          "mt-3 flex w-full flex-col items-center gap-2 border-t pt-5 text-[12.5px] sm:flex-row sm:justify-center sm:gap-6",
          scheme.panelBorder,
          scheme.meta,
        )}
      >
        <span>≈ 2 minuta</span>
        <span>Pitanja možete preskočiti</span>
        <span>Anonimno</span>
      </div>
    </div>
  );
}

/** Variant C — compact strip: badge, two-line title, meta and CTA. */
function VariantC({ scheme, onStart }: VariantProps) {
  return (
    <div className="relative mx-auto flex max-w-[1180px] flex-wrap items-center gap-5 px-5 py-7 md:px-8 md:py-8">
      <div
        className={cn(
          "grid h-[76px] w-[76px] flex-none place-items-center rounded-full border p-3",
          scheme.panel,
          scheme.panelBorder,
        )}
      >
        <Image
          src="/images/kompas-logo.png"
          alt=""
          width={512}
          height={512}
          sizes="76px"
          className="h-auto w-full"
        />
      </div>

      <div className="min-w-[200px] flex-1">
        <Title scheme={scheme} className="text-[21px] md:text-[24px]" />
        <p className={cn("mt-1.5 text-[13.5px] leading-[1.6]", scheme.body)}>
          {LEAD_STRIP}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <span className={cn("text-[12.5px]", scheme.meta)}>
          ≈ 2 min · možete preskočiti
        </span>
        <CtaLink scheme={scheme} onStart={onStart} />
      </div>
    </div>
  );
}

/**
 * Full-bleed Kompas CTA band for the landing page.
 *
 * Presentational only: it takes a resolved scheme and a variant and renders.
 * Which variant and scheme are active is decided one level up, so this file
 * survives the removal of the temporary preview control untouched.
 */
export function CompassCtaBanner({
  variant,
  scheme,
  onStart,
}: {
  variant: CompassCtaVariantId;
  scheme: CompassCtaScheme;
  onStart: () => void;
}) {
  return (
    <div
      className={cn(
        "hover:shadow-card-hover-lg relative overflow-hidden rounded-3xl transition-shadow duration-300 md:rounded-[32px]",
        scheme.band,
      )}
    >
      <BandDecoration scheme={scheme} />
      {variant === "A" ? <VariantA scheme={scheme} onStart={onStart} /> : null}
      {variant === "B" ? <VariantB scheme={scheme} onStart={onStart} /> : null}
      {variant === "C" ? <VariantC scheme={scheme} onStart={onStart} /> : null}
    </div>
  );
}
