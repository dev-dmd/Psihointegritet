import type { SVGProps } from "react";

/**
 * Client panel icons — inline SVG copied 1:1 from the „Psihointegritet Klijent
 * Panel" handoff (stroke 1.8, round caps), pinned here so the panel matches
 * the design regardless of icon-library versions.
 *
 * Separate from the Control Center set even where a glyph repeats: the two
 * panels are different products with different handoffs, and a shared file
 * would make a client-side tweak silently redraw a staff screen.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 19, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2, ...props })}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base({ size: 16, strokeWidth: 2, ...props })}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <svg {...base({ size: 14, ...props })}>
      <rect x="2" y="5" width="14" height="14" rx="2" />
      <path d="m22 7-6 5 6 5V7Z" />
    </svg>
  );
}
