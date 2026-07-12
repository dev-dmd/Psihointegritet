import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/helpers/cn";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  className?: string;
}

/** Repeated light-surface section intro: eyebrow → editorial title → lead. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("max-w-[640px]", className)}>
      <Eyebrow className="mb-4">{eyebrow}</Eyebrow>
      <h2 className="text-forest mb-[18px] font-serif text-[clamp(30px,8.5vw,38px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
        {title}
      </h2>
      {description ? (
        <p className="text-coffee/72 text-[16.5px] leading-[1.65]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
