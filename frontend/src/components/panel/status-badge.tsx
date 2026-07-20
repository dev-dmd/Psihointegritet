import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/helpers/cn";

/**
 * Platform-wide status badge (design_handoff_paneli §6): colored dot + text,
 * never color alone. One variant set for services, gates, tenants and
 * appointments across all panels.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        ok: "bg-badge-ok-bg text-badge-ok",
        wait: "bg-badge-wait-bg text-badge-wait",
        soft: "bg-badge-soft-bg text-badge-soft",
        amber: "bg-badge-amber-bg text-badge-amber",
        neutral: "bg-badge-neutral-bg text-badge-neutral",
        danger: "bg-badge-danger-bg text-badge-danger",
        dark: "bg-badge-dark-bg text-badge-dark",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type StatusBadgeTone = NonNullable<
  VariantProps<typeof statusBadgeVariants>["tone"]
>;

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  children: string;
  className?: string;
}

export function StatusBadge({ children, tone, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}
