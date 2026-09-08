import { cn } from "@/helpers/cn";

/**
 * The rule-and-label pair that opens every section.
 *
 * `tone` is the design's odd/even rhythm made explicit: odd sections take
 * lilac, even sections burgundy. Passing it rather than deriving it keeps the
 * rhythm visible at the call site, where somebody reordering sections will see
 * it.
 */
export function Eyebrow({
  children,
  tone = "burgundy",
  className,
}: {
  children: string;
  tone?: "burgundy" | "lilac" | "ivory";
  className?: string;
}) {
  return (
    <div className={cn("mb-[18px] flex items-center gap-3", className)}>
      <span
        aria-hidden
        className={cn(
          "block h-px w-[38px]",
          tone === "lilac" ? "bg-sn-lilac" : "bg-sn-burgundy",
        )}
      />
      <span
        className={cn(
          "text-[11px] tracking-[0.24em] uppercase",
          tone === "lilac" ? "text-sn-lilac-deep" : "text-sn-burgundy",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** The same label on a dark ground, where the rule would disappear. */
export function EyebrowOnDark({ children }: { children: string }) {
  return (
    <span className="text-sn-lilac text-[11px] tracking-[0.24em] uppercase">
      {children}
    </span>
  );
}
