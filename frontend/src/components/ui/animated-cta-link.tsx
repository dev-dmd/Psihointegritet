import type { Route } from "next";
import Link from "next/link";

import {
  AnimatedCtaContent,
  animatedCtaClassName,
  type AnimatedCtaSize,
} from "@/components/ui/animated-cta";

interface AnimatedCtaLinkProps {
  href: string;
  label: string;
  size?: AnimatedCtaSize;
  className?: string;
}

/**
 * Pill CTA with the handoff's hover choreography — sheen sweep, arrow
 * un-rotating to horizontal, background lift. Pure CSS, stays server-safe.
 * Same-page anchors stay <a>; routes navigate client-side via next/link.
 */
export function AnimatedCtaLink({
  href,
  label,
  size = "md",
  className,
}: AnimatedCtaLinkProps) {
  const linkClassName = animatedCtaClassName(size, className);
  const content = <AnimatedCtaContent label={label} size={size} />;

  if (href.startsWith("#")) {
    return (
      <a href={href} className={linkClassName}>
        {content}
      </a>
    );
  }

  // Content-driven hrefs are non-literal strings — documented `as Route` cast.
  return (
    <Link href={href as Route} className={linkClassName}>
      {content}
    </Link>
  );
}
