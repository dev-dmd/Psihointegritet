import Image from "next/image";

import { cn } from "@/helpers/cn";

const sizeClasses = {
  md: "h-[72px] w-[72px] border-[3px] text-[22px]",
  sm: "h-[52px] w-[52px] border-2 text-base",
} as const;

interface MonogramAvatarProps {
  /** Therapist initials, e.g. "AS". Placeholder until real portraits are approved. */
  initials: string;
  name: string;
  imageSrc?: string | undefined;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function MonogramAvatar({
  initials,
  name,
  imageSrc,
  size = "md",
  className,
}: MonogramAvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "border-meadow/60 bg-meadow/30 text-forest relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-serif",
        sizeClasses[size],
        className,
      )}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={name}
          fill
          sizes={size === "md" ? "72px" : "52px"}
          className="object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
