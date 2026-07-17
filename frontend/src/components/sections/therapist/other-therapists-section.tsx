import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import type { Therapist } from "@/types/therapist";

export function OtherTherapistsSection({ others }: { others: Therapist[] }) {
  return (
    <section className="pt-[72px] pb-[72px] md:pt-32 md:pb-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="mb-11 max-w-[640px]">
            <Eyebrow className="mb-4">Ostali terapeuti</Eyebrow>
            <h2 className="text-forest font-serif text-[clamp(26px,6.5vw,30px)] leading-[1.12] font-normal">
              Upoznajte i ostatak tima
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {others.map((therapist) => (
              <Link
                key={therapist.slug}
                href={`/tim/${therapist.slug}`}
                className="bg-surface border-coffee/6 hover:shadow-card-hover flex items-center gap-5 rounded-[22px] border p-[26px] no-underline transition-all duration-[250ms] hover:-translate-y-1"
              >
                <MonogramAvatar
                  initials={therapist.initials}
                  name={therapist.name}
                  imageSrc={therapist.image}
                />
                <span className="min-w-0 flex-1">
                  <span className="text-forest mb-[3px] block font-serif text-[22px]">
                    {therapist.name}
                  </span>
                  <span className="text-coffee/60 block text-[13px]">
                    {therapist.title}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="bg-meadow/40 text-forest inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-sm"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
