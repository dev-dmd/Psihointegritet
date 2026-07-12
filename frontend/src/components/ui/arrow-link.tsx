import type { ReactNode } from "react";

import { cn } from "@/helpers/cn";

const toneClasses = {
  /** Plain forest link with sage hover. */
  plain: "text-forest hover:text-sage",
  /** Underlined with a bottom border that recolors on hover. */
  underline:
    "border-b-[1.5px] border-coffee/30 pb-1 text-forest hover:border-sage hover:text-sage",
  /** Underlined in full forest (dark border), for emphasized links. */
  underlineStrong:
    "border-b-[1.5px] border-forest pb-1 text-forest hover:border-sage hover:text-sage",
} as const;

interface ArrowLinkProps {
  href: string;
  children: ReactNode;
  tone?: keyof typeof toneClasses;
  /** Wrap the arrow in a meadow circle (therapist card style). */
  circled?: boolean;
  className?: string;
}

export function ArrowLink({
  href,
  children,
  tone = "plain",
  circled = false,
  className,
}: ArrowLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 text-[15px] font-semibold no-underline transition-colors duration-200",
        toneClasses[tone],
        className,
      )}
    >
      <span>{children}</span>
      {circled ? (
        <span
          aria-hidden
          className="bg-meadow/40 inline-flex h-[30px] w-[30px] items-center justify-center rounded-full text-sm"
        >
          →
        </span>
      ) : (
        <span aria-hidden>→</span>
      )}
    </a>
  );
}
