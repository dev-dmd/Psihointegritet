import type { ReasonCard as ReasonCardContent } from "@/content/homepage";
import type { Route } from "next";
import Link from "next/link";

interface ReasonCardProps {
  reason: ReasonCardContent;
}

/** Numbered "razlog dolaska" card linking to the therapists section. */
export function ReasonCard({ reason }: ReasonCardProps) {
  const href = (reason.href || "/") as Route;

  return (
    <Link
      href={href}
      className="group bg-surface border-coffee/6 hover:shadow-card-hover flex flex-col gap-10 rounded-[22px] border p-[30px] pb-7 no-underline transition-all duration-[250ms] hover:-translate-y-1"
    >
      <div className="flex items-center justify-between">
        <span className="text-sage font-serif text-[15px] italic">
          {reason.number}
        </span>
        <span
          aria-hidden
          className="border-coffee/14 text-forest group-hover:text-forest group-hover:bg-meadow flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[15px] transition-colors duration-[250ms]"
        >
          →
        </span>
      </div>
      <div>
        <div className="text-forest mb-2 font-serif text-[26px] leading-[1.15] font-normal">
          {reason.title}
        </div>
        <div className="text-coffee/65 text-[14.5px] leading-[1.55]">
          {reason.description}
        </div>
      </div>
    </Link>
  );
}
