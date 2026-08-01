import { cn } from "@/helpers/cn";

interface StatCardProps {
  value: string;
  label: string;
  /** Accent dot next to the number — attention (warm) or alert (danger). */
  dot?: "meadow" | "warm" | "danger" | undefined;
  className?: string;
}

/** Superadmin/panel stat tile: big serif number + small muted label. */
export function StatCard({ value, label, dot, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "border-line rounded-stat bg-surface border px-4 py-[18px]",
        className,
      )}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-coffee font-serif text-[30px] leading-none">
          {value}
        </span>
        {dot ? (
          <span
            aria-hidden
            className={cn(
              "h-2 w-2 rounded-full",
              dot === "meadow" && "bg-meadow",
              dot === "warm" && "bg-warm",
              dot === "danger" && "bg-danger",
            )}
          />
        ) : null}
      </div>
      <div className="text-ink-55 mt-2 text-[12.5px] leading-[1.35] font-medium">
        {label}
      </div>
    </div>
  );
}
