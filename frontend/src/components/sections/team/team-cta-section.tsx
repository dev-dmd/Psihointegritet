import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";

/** Route-level guided choice, kept consistent with the public header. */
export function TeamCtaSection() {
  return (
    <section className="pt-[72px] pb-[72px] md:pt-24 md:pb-24">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <div className="bg-meadow/32 flex flex-col items-start justify-between gap-10 rounded-[28px] px-7 py-10 md:flex-row md:flex-wrap md:items-center md:px-16 md:py-14">
            <div>
              <h2 className="text-forest mb-2 font-serif text-[30px] leading-tight font-normal">
                Niste sigurni koga da izaberete?
              </h2>
              <p className="text-coffee/70 max-w-[440px] text-[15.5px] leading-[1.6]">
                Kroz pet kratkih pitanja predložićemo terapeuta koji najbliže
                odgovara onome što tražite.
              </p>
            </div>
            <Link
              href="/pronadji-podrsku"
              className="bg-forest text-canvas hover:bg-forest-hover inline-flex min-h-11 items-center rounded-full px-7 font-sans text-[15px] font-semibold whitespace-nowrap no-underline transition-colors"
            >
              Pomozi mi da izaberem
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
