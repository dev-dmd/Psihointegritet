import { cn } from "@/helpers/cn";

interface ProgressBarProps {
  /** Fill percentage 0–100. */
  value: number;
  /** Track/fill on a dark card (forest) vs light card. */
  tone?: "light" | "dark";
  className?: string;
}

/** Thin occupancy/capacity bar used across the panels. */
export function ProgressBar({
  value,
  tone = "light",
  className,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className={cn(
        "block h-2 overflow-hidden rounded-full",
        tone === "dark" ? "bg-canvas/14" : "bg-coffee/10",
        className,
      )}
    >
      <span
        className={cn(
          "block h-full rounded-full",
          tone === "dark" ? "bg-meadow" : "bg-sage",
        )}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
