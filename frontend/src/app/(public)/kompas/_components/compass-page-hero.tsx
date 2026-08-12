import { cn } from "@/helpers/cn";
import type { CompassBreadcrumb } from "@/lib/compass/discoverability";

import { CompassBreadcrumbs } from "./breadcrumbs";

/**
 * The hero card every Kompas page opens with.
 *
 * One component rather than one per route: the four pages differ only in tone,
 * eyebrow and what sits in the action row, and the design has them share an
 * identical card — same radius, same top inset clearing the sticky header, same
 * lead measure. Keeping that in one place is what stops the four from drifting.
 */
export function CompassPageHero({
  breadcrumbs,
  eyebrow,
  title,
  lead,
  tone = "surface",
  children,
}: {
  breadcrumbs: readonly CompassBreadcrumb[];
  eyebrow?: string;
  title: string;
  lead: string;
  tone?: "surface" | "meadow";
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[24px] px-5 pt-[104px] pb-[26px] md:px-8",
        tone === "meadow" ? "bg-meadow/30" : "bg-surface",
      )}
    >
      <CompassBreadcrumbs items={breadcrumbs} />

      {eyebrow ? (
        <p className="text-sage mb-3 text-[11.5px] font-semibold tracking-[0.16em] uppercase">
          {eyebrow}
        </p>
      ) : null}

      <h1 className="text-forest font-serif text-[clamp(30px,6vw,50px)] leading-[1.08] font-normal text-pretty">
        {title}
      </h1>

      <p className="text-coffee/72 mt-3.5 max-w-[58ch] text-[15px] leading-[1.7] text-pretty">
        {lead}
      </p>

      {children}
    </section>
  );
}
