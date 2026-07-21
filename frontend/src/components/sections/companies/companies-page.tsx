import { Reveal } from "@/components/motion/reveal";
import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CompanyCta } from "@/features/company/company-cta";
import {
  companyDeliveryFacts,
  companyFaqItems,
  companyPlanCards,
} from "@/content/company";

const offerings = [
  {
    title: "Radionice za timove",
    description:
      "Iskustvene radionice o stresu, sagorevanju i komunikaciji, prilagođene vašem timu i tempu rada.",
  },
  {
    title: "Edukacije i predavanja",
    description:
      "Teme iz mentalnog zdravlja, emocionalne pismenosti i prevencije burnout-a, u formatu koji odgovara organizaciji.",
  },
  {
    title: "Psihološka podrška zaposlenima",
    description:
      "Individualne konsultacije i savetovanje kao benefit koji zaposlenima olakšava svakodnevni rad.",
  },
];

const steps = [
  "Javite nam se sa kratkim opisom vašeg tima i potreba.",
  "Predlažemo format, teme i okvirni obim saradnje.",
  "Dogovaramo termine i način rada — online ili uživo.",
];

/** B2B presentation page with the existing structured configurator drawer. */
export function CompaniesPage() {
  return (
    <>
      <PageHero tone="warm">
        <div className="max-w-[680px]">
          <Eyebrow tone="coffee" className="mb-4">
            Za organizacije
          </Eyebrow>
          <h1 className="text-coffee mb-[18px] font-serif text-[clamp(30px,8.5vw,40px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
            Rad sa kompanijama
          </h1>
          <p className="text-coffee/72 mb-8 text-[16.5px] leading-[1.65]">
            Radionice, edukacije i psihološka podrška za timove i zaposlene —
            osmišljene tako da podrže mentalno zdravlje u radnom okruženju, sa
            istim principima poverljivosti i stručnosti kao i naš rad sa
            klijentima.
          </p>
          <CompanyCta variant="coffee">Konfigurišite program</CompanyCta>
        </div>
      </PageHero>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {offerings.map((offering) => (
                <div
                  key={offering.title}
                  className="bg-surface border-coffee/6 flex flex-col gap-3 rounded-[22px] border p-8"
                >
                  <h2 className="text-forest font-serif text-[24px] leading-[1.15] font-normal">
                    {offering.title}
                  </h2>
                  <p className="text-coffee/70 text-[15px] leading-[1.6]">
                    {offering.description}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="mb-8 max-w-[700px]">
              <Eyebrow className="mb-4">Modeli saradnje</Eyebrow>
              <h2 className="text-forest font-serif text-[clamp(27px,6vw,32px)] leading-[1.12] font-normal">
                Početni modeli za razgovor
              </h2>
              <p className="text-coffee/68 mt-3 text-[15px] leading-[1.6]">
                Ovo nisu konačne javne ponude. Cena, obim, kapacitet i način
                plaćanja potvrđuju se nakon razgovora.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {companyPlanCards.map((plan) => (
                <article
                  key={plan.slug}
                  className="bg-meadow/22 flex min-h-[260px] flex-col justify-between rounded-[20px] p-6"
                >
                  <div>
                    <p className="text-sage text-[11px] font-semibold tracking-[0.14em] uppercase">
                      {plan.status === "draft"
                        ? "Nacrt modela"
                        : "Čeka potvrdu"}
                    </p>
                    <h3 className="text-forest mt-3 font-serif text-[23px] font-normal">
                      {plan.title}
                    </h3>
                    <p className="text-coffee/70 mt-3 text-[14px] leading-[1.55]">
                      {plan.description}
                    </p>
                  </div>
                  <CompanyCta
                    variant="outline"
                    className="mt-5 self-start"
                    preselectedPlanSlug={plan.slug}
                  >
                    Konfigurišite program
                  </CompanyCta>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {companyDeliveryFacts.map((fact) => (
                <article
                  key={fact.title}
                  className="bg-surface border-coffee/8 rounded-[20px] border p-6"
                >
                  <h2 className="text-forest font-serif text-[23px] font-normal">
                    {fact.title}
                  </h2>
                  <p className="text-coffee/70 mt-3 text-[14px] leading-[1.6]">
                    {fact.description}
                  </p>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1120px] px-5 md:px-8">
          <Reveal>
            <Eyebrow className="mb-4">Najčešća pitanja</Eyebrow>
            <div className="space-y-3">
              {companyFaqItems.map((item) => (
                <details
                  key={item.question}
                  className="bg-surface border-coffee/8 rounded-[18px] border px-5 py-4"
                >
                  <summary className="text-forest cursor-pointer font-medium">
                    {item.question}
                  </summary>
                  <p className="text-coffee/70 mt-3 text-[14px] leading-[1.6]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-10 md:grid-cols-[5fr_7fr] md:gap-16">
              <div>
                <Eyebrow className="mb-4">Kako počinje saradnja</Eyebrow>
                <h2 className="text-forest font-serif text-[clamp(26px,6.5vw,30px)] leading-[1.12] font-normal text-pretty">
                  Tri koraka do prve radionice
                </h2>
              </div>
              <ol className="flex flex-col gap-5">
                {steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-4">
                    <Chip variant="labelSolid" className="shrink-0">
                      {`0${index + 1}`}
                    </Chip>
                    <p className="text-coffee/78 text-[16px] leading-[1.6]">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] pb-[72px] md:pt-24 md:pb-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="bg-forest flex flex-col items-start gap-6 rounded-[28px] px-7 py-10 md:px-16 md:py-14">
              <div>
                <h2 className="text-canvas mb-3 font-serif text-[28px] leading-[1.12] font-normal text-pretty md:text-[32px]">
                  Zainteresovani za saradnju?
                </h2>
                <p className="text-canvas/72 max-w-[520px] text-[15.5px] leading-[1.65]">
                  Javite nam se i predložićemo format koji odgovara vašem timu.
                  Konkretan upitnik i ponuda stižu nakon prvog razgovora.
                </p>
              </div>
              <CompanyCta variant="meadow">Konfigurišite program</CompanyCta>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
