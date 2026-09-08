import { cn } from "@/helpers/cn";

/**
 * Section headings, at the one size the design uses for them.
 *
 * `clamp(30px,3.6vw,44px)` with `leading-[1.2]` — the line-height is not a
 * preference. The handoff is explicit that serif headings need ≥1.16 for
 * diacritic clearance, and Serbian Latin puts carons on `č ć š ž` in almost
 * every heading on this page. Tightening it clips them.
 */
export function SectionHeading({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-sn-display text-sn-ink text-[clamp(30px,3.6vw,44px)] leading-[1.2] font-normal text-pretty",
        className,
      )}
    >
      {children}
    </h2>
  );
}
