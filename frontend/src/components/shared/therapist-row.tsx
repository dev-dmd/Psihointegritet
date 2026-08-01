import Image from "next/image";
import Link from "next/link";

import { Chip } from "@/components/ui/chip";
import { cn } from "@/helpers/cn";
import type { Therapist } from "@/types/therapist";

interface TherapistRowProps {
  therapist: Therapist;
  /** Even rows put the portrait first; odd rows flip it (zigzag). */
  flipped: boolean;
  /** The first row carries the LCP portrait. */
  priority?: boolean;
}

export function TherapistRow({
  therapist,
  flipped,
  priority = false,
}: TherapistRowProps) {
  return (
    <div className="border-coffee/10 grid grid-cols-1 items-center gap-8 border-t py-16 md:grid-cols-2 md:gap-[72px]">
      <div className={cn(flipped && "md:order-2")}>
        <div className="bg-meadow/30 relative aspect-4/5 overflow-hidden rounded-[28px]">
          <Image
            src={therapist.image}
            alt={therapist.name}
            fill
            priority={priority}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className={cn(flipped && "md:order-1")}>
        <Chip variant="label" className="mb-[22px]">
          {therapist.badge}
        </Chip>
        <h3 className="text-forest mb-2 font-serif text-[32px] leading-[1.1] font-normal md:text-[40px]">
          {therapist.name}
        </h3>
        <div className="text-coffee/60 mb-5 text-sm font-semibold">
          {therapist.title}
        </div>
        <p className="text-coffee/82 mb-5 font-serif text-[19px] leading-[1.5] italic">
          „{therapist.quote}“
        </p>
        <p className="text-coffee/72 mb-6 max-w-[520px] text-[15.5px] leading-[1.65]">
          {therapist.cardExcerpt}
        </p>
        <div className="mb-7 flex flex-wrap gap-2">
          {therapist.areas.map((area) => (
            <Chip key={area} variant="tagOutlined">
              {area}
            </Chip>
          ))}
        </div>
        <Link
          href={`/tim/${therapist.slug}`}
          className="bg-forest text-canvas hover:bg-forest-hover inline-flex items-center gap-2.5 rounded-full px-[26px] py-3.5 text-[15px] font-semibold transition-colors"
        >
          Upoznaj {therapist.nameAccusative} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
