import Image from "next/image";

import { sanjaContent } from "@/features/tenants/sanja-neuer/content";
import { BookButton } from "@/features/tenants/sanja-neuer/ui/book-button";
import { Eyebrow } from "@/features/tenants/sanja-neuer/ui/eyebrow";
import { SectionHeading } from "@/features/tenants/sanja-neuer/ui/section-heading";

const { bio } = sanjaContent;

/**
 * Photo and quote read as one object: the image is rounded only at the top and
 * the burgundy quote plate closes it at the bottom. The `-mt-px` is deliberate —
 * without it a hairline of page ground shows between the two at some zoom
 * levels, and the join is the point of the composition.
 */
export function SanjaBio() {
  return (
    <section
      id="o-meni"
      className="mx-auto grid max-w-[1180px] grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-start gap-14 px-6 py-[88px]"
    >
      <div className="relative">
        <div className="bg-sn-surface relative aspect-square overflow-hidden rounded-t-[20px]">
          <Image
            src="/tenants/sanja-neuer/about-portrait.jpeg"
            alt={bio.portraitAlt}
            fill
            sizes="(max-width: 900px) 100vw, 45vw"
            className="object-cover"
          />
        </div>
        <figure className="bg-sn-burgundy -mt-px rounded-b-[20px] px-[26px] py-6">
          <blockquote className="font-sn-display text-sn-ivory text-[22px] leading-[1.4]">
            {bio.quote}
          </blockquote>
        </figure>
      </div>

      <div>
        <Eyebrow tone="burgundy">{bio.eyebrow}</Eyebrow>
        <SectionHeading className="mb-6">{bio.title}</SectionHeading>

        {bio.paragraphs.map((paragraph, index) => (
          <p
            key={paragraph.slice(0, 24)}
            className={
              index === bio.paragraphs.length - 1
                ? "text-sn-ink/75 mb-7 text-base leading-[1.8]"
                : "text-sn-ink/75 mb-4 text-base leading-[1.8]"
            }
          >
            {paragraph}
          </p>
        ))}

        <ul className="mb-[30px] flex list-none flex-wrap gap-2.5 p-0">
          {bio.chips.map((chip) => (
            <li
              key={chip}
              className="border-sn-ink/18 text-sn-ink rounded-full border px-[15px] py-2 text-xs tracking-[0.08em] uppercase"
            >
              {chip}
            </li>
          ))}
        </ul>

        <BookButton variant="text">{bio.cta}</BookButton>
      </div>
    </section>
  );
}
