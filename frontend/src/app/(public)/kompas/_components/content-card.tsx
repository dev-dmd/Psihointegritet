import type { Route } from "next";
import { PublicLink as Link } from "@/components/ui/public-link";
import { useTranslations } from "next-intl";

import type { PublicCompassContentCardView } from "@/lib/compass/taxonomy-view";

const FORMAT_IDS = [
  "article",
  "guide",
  "exercise",
  "program",
  "workshop",
  "video",
  "audio",
] as const;

/**
 * A published content card on a canonical Kompas page.
 *
 * The access badge is a real field off the revision, never a guess: „Za
 * registrovane" on something actually public would push people to sign up for
 * nothing, and the reverse would promise access that does not exist.
 *
 * No score, no „match" percentage and no therapist reference by construction —
 * ranking belongs to the backend's `compass_rules.py` with its own
 * `ruleVersion`, and this card is a listing, not a recommendation.
 */
export function CompassContentCard({
  card,
}: {
  card: PublicCompassContentCardView;
}) {
  const t = useTranslations("public.compass.lists");
  const formatLabel = FORMAT_IDS.includes(card.contentFormat as never)
    ? t(`formats.${card.contentFormat as (typeof FORMAT_IDS)[number]}`)
    : card.contentFormat;

  return (
    <article className="border-coffee/8 bg-surface hover:shadow-card-hover flex flex-col gap-2.5 rounded-[18px] border p-[18px] transition-shadow">
      <div className="flex flex-wrap items-center gap-2">
        <span className="bg-coffee/6 text-coffee rounded-full px-2.5 py-1 text-[11px] tracking-[0.06em] uppercase">
          {formatLabel}
        </span>
        <span
          className={
            card.accessLevel === "public"
              ? "bg-meadow/40 text-forest rounded-full px-2.5 py-1 text-[11px] tracking-[0.06em] uppercase"
              : "border-coffee/16 text-coffee/70 rounded-full border px-2.5 py-1 text-[11px] tracking-[0.06em] uppercase"
          }
        >
          {card.accessLevel === "public" ? t("public") : t("registered")}
        </span>
      </div>

      <h3 className="text-forest font-serif text-[19px] leading-[1.25] font-normal">
        {card.title}
      </h3>

      {card.description ? (
        <p className="text-coffee/65 text-[13px] leading-[1.6]">
          {card.description}
        </p>
      ) : null}

      <Link
        href={card.href as Route}
        className="text-forest hover:text-forest-soft mt-auto self-start pt-2 text-[13.5px] underline underline-offset-[3px]"
      >
        {t("open")} <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
