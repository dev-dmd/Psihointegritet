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

const LOGO = "/images/kompas-logo.png";

/**
 * Band decoration: three blurred aurora blobs, up to three rings and a corner
 * bracket, all `absolute` and clipped by the band's `overflow-hidden`.
 *
 * The blobs use organic (four-value) radii rather than circles so no two
 * schemes read as the same shape rotated. Which pieces appear is per variant —
 * the compact strip has no room for the second ring, and the centred block
 * would have the third blob sitting directly under its own text.
 */
function BandDecoration({
  scheme,
  withAurora3 = false,
  withRing2 = false,
}: {
  scheme: CompassCtaScheme;
  withAurora3?: boolean;
  withRing2?: boolean;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className={cn(
          "absolute top-[-16%] left-[-32%] aspect-square w-[88%] rounded-[48%_52%_60%_40%/55%_45%_55%_45%] bg-radial-[at_40%_40%] to-70% blur-[26px] md:top-[-46%] md:left-[-14%] md:w-[62%]",
          scheme.auroraGlow,
        )}
      />
      <div
        className={cn(
          "absolute top-[-12%] right-[-22%] aspect-square w-[74%] rounded-[58%_42%_40%_60%/42%_58%_42%_58%] bg-radial-[at_60%_50%] to-72% opacity-90 blur-[34px] md:top-[-30%] md:right-[4%] md:w-[46%]",
          scheme.aurora,
        )}
      />
      {withAurora3 ? (
        <div
          className={cn(
            "absolute bottom-[-26%] left-[6%] aspect-square w-[84%] rounded-[45%_55%_52%_48%/60%_40%_60%_40%] bg-radial-[at_50%_40%] to-74% opacity-85 blur-[40px] md:bottom-[-52%] md:left-[32%] md:w-[52%]",
            scheme.aurora2,
          )}
        />
      ) : null}

      <div
        className={cn(
          "absolute right-[-12%] bottom-[-70%] aspect-square w-[58%] rounded-full border opacity-40",
          scheme.ruleBorder,
        )}
      />
      {withRing2 ? (
        <div
          className={cn(
            "absolute bottom-[-46%] left-[-6%] aspect-square w-[40%] rounded-full border opacity-32",
            scheme.ruleBorder,
          )}
        />
      ) : null}
      <div
        className={cn(
          "absolute top-[-18%] right-[6%] aspect-square w-[26%] rounded-full border border-dashed opacity-28",
          scheme.ruleBorder,
        )}
      />

      <div
        className={cn(
          "absolute right-[18px] bottom-[16px] h-[54px] w-[96px] -skew-y-6 rounded-br-[40px_22px] border-r border-b opacity-40",
          scheme.ruleBorder,
        )}
      />
    </div>
  );
}

function CtaButton({
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
        "inline-flex min-h-12 cursor-pointer items-center gap-3 self-start rounded-full px-[22px] py-3.5 text-[14.5px] tracking-[0.01em] transition-colors",
        scheme.button,
        className,
      )}
    >
      {CTA_LABEL}
      <span aria-hidden className="text-[15px]">
        →
      </span>
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
        "font-serif leading-[1.12] font-normal text-pretty",
        scheme.title,
        className,
      )}
    >
      <em className={cn("font-medium not-italic", scheme.accent)}>Kompas</em>{" "}
      mentalnog zdravlja
    </h3>
  );
}

interface VariantProps {
  scheme: CompassCtaScheme;
  onStart: () => void;
}

/**
 * Variant A — split panel: the logo sits inside two frosted circles on the
 * left, the bordered panel on the right splits again into copy and aside.
 */
function VariantA({ scheme, onStart }: VariantProps) {
  return (
    <div className="relative mx-auto grid max-w-[1536px] items-center gap-2.5 px-[18px] py-[26px] md:grid-cols-[minmax(180px,1fr)_2fr] md:items-stretch md:gap-[26px] md:px-[30px] md:py-[38px]">
      <div className="flex items-center justify-center p-1.5">
        <div className="relative grid aspect-square w-[200px] max-w-full place-items-center md:w-[min(288px,100%)]">
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full border backdrop-blur-[14px]",
              scheme.glass,
              scheme.glassRule,
            )}
          />
          <span
            aria-hidden
            className={cn(
              "absolute inset-[11%] rounded-full border backdrop-blur-[10px]",
              scheme.glass2,
              scheme.glassRule,
            )}
          />
          <Image
            src={LOGO}
            alt="Kompas mentalnog zdravlja"
            width={512}
            height={512}
            sizes="(min-width: 768px) 288px, 200px"
            className="relative h-auto w-[66%] drop-shadow-[0_22px_42px_rgba(0,0,0,0.32)]"
          />
        </div>
      </div>

      <div
        className={cn(
          "relative flex h-full flex-col justify-center rounded-[20px] border p-5 md:p-[26px]",
          scheme.panel,
          scheme.panelBorder,
        )}
      >
        <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] items-stretch gap-[18px]">
          <div>
            <Title
              scheme={scheme}
              className="text-[24px] md:text-[30px] lg:text-[36px]"
            />
            <p
              className={cn(
                "mt-3 text-[14px] leading-[1.65] text-pretty",
                scheme.body,
              )}
            >
              {LEAD_FULL}
            </p>
          </div>

          <div
            className={cn(
              "flex h-full flex-col items-center justify-between gap-4 border-t pt-4 text-center md:items-stretch md:border-t-0 md:border-l md:pt-0 md:pl-[18px] md:text-left",
              scheme.ruleBorder,
            )}
          >
            <p className={cn("text-[14px] leading-[1.6]", scheme.body)}>
              {ASIDE}
            </p>
            <CtaButton
              scheme={scheme}
              onStart={onStart}
              className="mt-0.5 self-center md:mt-2.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Variant B — centred block with the logo on top and a meta row underneath. */
function VariantB({ scheme, onStart }: VariantProps) {
  return (
    <div className="relative mx-auto flex max-w-[720px] flex-col items-center gap-4 px-[22px] pt-[34px] pb-[30px] text-center">
      <Image
        src={LOGO}
        alt=""
        width={512}
        height={512}
        sizes="88px"
        className="h-auto w-[88px] drop-shadow-[0_14px_26px_rgba(0,0,0,0.3)]"
      />
      <Title scheme={scheme} className="text-[24px] md:text-[36px]" />
      <p className={cn("text-[14px] leading-[1.65] text-pretty", scheme.body)}>
        {LEAD_CENTERED}
      </p>
      <CtaButton scheme={scheme} onStart={onStart} className="self-center" />

      <div
        className={cn(
          "mt-1 flex w-full flex-wrap justify-center gap-x-[18px] gap-y-2 border-t pt-3.5 text-[12px] tracking-[0.03em]",
          scheme.ruleBorder,
          scheme.body,
        )}
      >
        <span>≈ 2 minuta</span>
        <span>Pitanja možete preskočiti</span>
        <span>Anonimno</span>
      </div>
    </div>
  );
}

/** Variant C — compact strip: circular badge, two-line copy, meta and CTA. */
function VariantC({ scheme, onStart }: VariantProps) {
  return (
    <div className="relative mx-auto flex max-w-[1536px] flex-wrap items-center gap-x-5 gap-y-4 px-5 py-[18px]">
      <div
        className={cn(
          "grid h-[76px] w-[76px] flex-none place-items-center rounded-full border p-2",
          scheme.panel,
          scheme.panelBorder,
        )}
      >
        <Image
          src={LOGO}
          alt=""
          width={512}
          height={512}
          sizes="76px"
          className="h-auto w-full"
        />
      </div>

      <div className="min-w-[200px] flex-[1_1_240px]">
        <Title scheme={scheme} className="text-[20px] md:text-[26px]" />
        <p className={cn("mt-1.5 text-[13.5px] leading-[1.55]", scheme.body)}>
          {LEAD_STRIP}
        </p>
        <p
          className={cn(
            "mt-2 text-[12.5px] tracking-[0.02em] opacity-85",
            scheme.body,
          )}
        >
          ≈ 2 min · možete preskočiti
        </p>
      </div>

      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 md:ml-auto md:w-auto">
        <CtaButton
          scheme={scheme}
          onStart={onStart}
          className="w-full justify-center self-stretch md:w-auto md:justify-start md:self-start"
        />
      </div>
    </div>
  );
}

/**
 * Kompas CTA band for the landing page, in the design's updated appearance.
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
        "shadow-kompas-band hover:shadow-kompas-band-hover relative mt-1 overflow-hidden rounded-3xl transition-all duration-[250ms] hover:-translate-y-1",
        scheme.band,
      )}
    >
      {variant === "A" ? (
        <>
          <BandDecoration scheme={scheme} withAurora3 withRing2 />
          <VariantA scheme={scheme} onStart={onStart} />
        </>
      ) : null}
      {variant === "B" ? (
        <>
          <BandDecoration scheme={scheme} />
          <VariantB scheme={scheme} onStart={onStart} />
        </>
      ) : null}
      {variant === "C" ? (
        <>
          <BandDecoration scheme={scheme} withAurora3 />
          <VariantC scheme={scheme} onStart={onStart} />
        </>
      ) : null}
    </div>
  );
}
