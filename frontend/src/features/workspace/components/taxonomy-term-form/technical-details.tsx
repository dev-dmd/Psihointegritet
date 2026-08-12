import { cn } from "@/helpers/cn";

/**
 * The collapsed home for values the platform owns (D-062).
 *
 * Deliberately unstyled as a box: no border, no panel, no focus ring drawn
 * around it. A bordered card reads as "another section to fill in", which is
 * the opposite of the intent — internal ids and lock versions are reachable
 * for a platform admin and invisible for everyone else. It sits flush with the
 * field above it so nothing about the layout suggests a required step.
 *
 * The summary is still a real disclosure control, so it keeps a visible
 * keyboard focus state — an underline rather than a box.
 */
export function TechnicalDetails({
  summary = "Tehnički detalji",
  className,
  children,
}: {
  summary?: string;
  /** Lets a caller place it inline with a label row instead of below it. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details className={cn("mt-3", className)}>
      <summary className="text-ink-45 hover:text-ink-55 focus-visible:text-ink-70 inline-flex cursor-pointer list-none items-center gap-1.5 text-[12px] outline-none focus-visible:underline">
        <span aria-hidden className="text-[10px]">
          ▸
        </span>
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
