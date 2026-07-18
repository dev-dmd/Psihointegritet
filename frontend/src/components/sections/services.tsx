import { Reveal } from "@/components/motion/reveal";
import { ArrowLink } from "@/components/ui/arrow-link";
import { ButtonLink } from "@/components/ui/button-link";
import { Chip } from "@/components/ui/chip";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  featuredService,
  midServices,
  smallServices,
} from "@/content/homepage";

export function Services() {
  return (
    <section id="usluge" className="scroll-mt-24 pt-[72px] md:pt-32">
      <div className="mx-auto max-w-[1536px] px-5 md:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Usluge"
            title="Podrška prilagođena vašoj situaciji"
            description="Svaka usluga jasno definiše šta uključuje, kome odgovara i koji je sledeći korak."
            className="mb-14"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <article className="bg-forest flex flex-col justify-between gap-12 rounded-[28px] p-8 md:col-span-2 md:p-14 lg:row-span-2">
              <div>
                <div className="mb-[22px] flex items-center gap-3">
                  <Chip variant="labelSolid">{featuredService.badge}</Chip>
                </div>
                <h3 className="text-canvas mb-4 font-serif text-[34px] leading-[1.08] font-normal tracking-[-0.01em] md:text-[42px]">
                  {featuredService.title}
                </h3>
                <p className="text-canvas/72 max-w-[520px] text-base leading-[1.65]">
                  {featuredService.description}
                </p>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-8">
                <div className="flex flex-wrap gap-[18px] md:gap-10">
                  {featuredService.stats.map((stat, index) => (
                    <div
                      key={stat.label}
                      className={
                        index > 0
                          ? "md:border-canvas/15 md:border-l md:pl-10"
                          : undefined
                      }
                    >
                      <div className="text-meadow/85 mb-1.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
                        {stat.label}
                      </div>
                      <div className="text-canvas font-serif text-2xl">
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>
                <ButtonLink
                  href={featuredService.ctaHref}
                  variant="light"
                  className="whitespace-nowrap"
                >
                  {featuredService.ctaLabel}
                </ButtonLink>
              </div>
            </article>

            {midServices.map((service) => (
              <article
                key={service.title}
                className="bg-surface border-coffee/6 hover:shadow-card-hover flex flex-col justify-between gap-8 rounded-3xl border px-6 py-[30px] transition-all duration-[250ms] hover:-translate-y-1 md:px-[34px] md:py-9"
              >
                <div>
                  <h3 className="text-forest mb-2.5 font-serif text-[28px] leading-[1.12] font-normal">
                    {service.title}
                  </h3>
                  <p className="text-coffee/68 text-[14.5px] leading-[1.6]">
                    {service.description}
                  </p>
                </div>
                <div>
                  <div className="mb-[18px] flex flex-wrap gap-2.5">
                    <Chip>{service.duration}</Chip>
                    <Chip>{service.price}</Chip>
                    <Chip>{service.format}</Chip>
                  </div>
                  <ArrowLink href="#prvi-razgovor">Zakaži termin</ArrowLink>
                </div>
              </article>
            ))}

            {smallServices.map((service) => (
              <article
                key={service.title}
                className="bg-meadow/24 hover:bg-meadow/42 flex flex-col justify-between gap-7 rounded-[22px] px-6 py-[26px] transition-colors duration-[250ms] md:px-[30px] md:pt-[30px]"
              >
                <div>
                  <h3 className="text-forest mb-2 font-serif text-2xl leading-[1.15] font-normal">
                    {service.title}
                  </h3>
                  <p className="text-coffee/68 text-sm leading-[1.55]">
                    {service.description}
                  </p>
                </div>
                <ArrowLink href={service.href} className="text-[14.5px]">
                  Saznaj više
                </ArrowLink>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
