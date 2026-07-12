import { cn } from "@/helpers/cn";

const sizeClasses = {
  md: "h-[72px] w-[72px] border-[3px] text-[22px]",
  sm: "h-[52px] w-[52px] border-2 text-base",
} as const;

interface MonogramAvatarProps {
  /** Therapist initials, e.g. "AS". Placeholder until real portraits are approved. */
  initials: string;
  name: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function MonogramAvatar({
  initials,
  name,
  size = "md",
  className,
}: MonogramAvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "border-meadow/60 bg-meadow/30 text-forest inline-flex items-center justify-center rounded-full font-serif",
        sizeClasses[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
