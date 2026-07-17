import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

const sizeClasses = {
  md: {
    root: "gap-3 py-2 pr-6 pl-2 text-[14.5px]",
    circle: "h-9 w-9",
    icon: 16,
  },
  sm: {
    root: "gap-2.5 py-1.5 pr-[18px] pl-1.5 text-[13.5px]",
    circle: "h-[30px] w-[30px]",
    icon: 14,
  },
} as const;

export type AnimatedCtaSize = keyof typeof sizeClasses;

/**
 * Shared pill styling + inner choreography for the "Zakaži termin" CTA, so the
 * navigational `<a>`/`<Link>` version and the drawer-opening `<button>` version
 * look identical. Pure presentation, no interactivity — safe on the server.
 */
export function animatedCtaClassName(
  size: AnimatedCtaSize,
  className?: string,
): string {
  return cn(
    "group bg-forest hover:bg-forest-lift text-canvas relative inline-flex items-center overflow-hidden rounded-full font-semibold whitespace-nowrap no-underline transition-colors duration-[250ms]",
    sizeClasses[size].root,
    className,
  );
}

export function AnimatedCtaContent({
  label,
  size,
}: {
  label: ReactNode;
  size: AnimatedCtaSize;
}) {
  const s = sizeClasses[size];
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-0 w-[55%] -translate-x-[150%] bg-[linear-gradient(100deg,transparent_15%,rgba(250,248,243,0.13)_50%,transparent_85%)] transition-transform duration-[600ms] group-hover:translate-x-[300%]"
      />
      <span
        aria-hidden
        className={cn(
          "bg-forest-soft relative inline-flex -rotate-45 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-0",
          s.circle,
        )}
      >
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-canvas)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </span>
      <span className="relative">{label}</span>
    </>
  );
}
