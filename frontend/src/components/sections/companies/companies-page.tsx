import { Reveal } from "@/components/motion/reveal";
import { PageHero } from "@/components/shared/page-hero";
import { Chip } from "@/components/ui/chip";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CompanyCta } from "@/features/company/company-cta";
import { companyPlanCards, type CompanyPlanCard } from "@/content/company";

const OFFERINGS = ["workshops", "education", "support"] as const;
const DELIVERY_FACTS = ["flexible", "reserved", "payment", "privacy"] as const;
const FAQ_ITEMS = ["prices", "capacity", "next"] as const;
const PROCESS_STEPS = ["contact", "proposal", "schedule"] as const;
const PLAN_KEYS = {
  "pojedinacni-pristup": "individual",
  "team-flex": "teamFlex",
  "rezervisani-kapacitet": "reserved",
  "program-po-meri": "custom",
} as const;

/** B2B presentation page with the existing structured configurator drawer. */
export function CompaniesPage({
  plans = companyPlanCards,
}: {
  plans?: readonly CompanyPlanCard[];
}) {
  const t = useTranslations("public.pages.companies");

  return (
    <>
      <PageHero tone="warm">
        <div className="max-w-[680px]">
          <Eyebrow tone="coffee" className="mb-4">
            {t("eyebrow")}
          </Eyebrow>
          <h1 className="text-coffee mb-[18px] font-serif text-[clamp(30px,8.5vw,40px)] leading-[1.06] font-normal tracking-[-0.015em] text-pretty md:text-[52px]">
            {t("title")}
          </h1>
          <p className="text-coffee/72 mb-8 text-[16.5px] leading-[1.65]">
            {t("intro")}
          </p>
          <CompanyCta variant="coffee">{t("configure")}</CompanyCta>
        </div>
      </PageHero>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {OFFERINGS.map((offering) => (
                <div
                  key={offering}
                  className="bg-surface border-coffee/6 flex flex-col gap-3 rounded-[22px] border p-8"
                >
                  <h2 className="text-forest font-serif text-[24px] leading-[1.15] font-normal">
                    {t(`offerings.${offering}.title`)}
                  </h2>
                  <p className="text-coffee/70 text-[15px] leading-[1.6]">
                    {t(`offerings.${offering}.description`)}
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
              <Eyebrow className="mb-4">{t("modelsEyebrow")}</Eyebrow>
              <h2 className="text-forest font-serif text-[clamp(27px,6vw,32px)] leading-[1.12] font-normal">
                {t("modelsTitle")}
              </h2>
              <p className="text-coffee/68 mt-3 text-[15px] leading-[1.6]">
                {t("modelsNote")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => {
                const planKey = PLAN_KEYS[plan.slug as keyof typeof PLAN_KEYS];
                return (
                  <article
                    key={plan.slug}
                    className="bg-meadow/22 flex min-h-[260px] flex-col justify-between rounded-[20px] p-6"
                  >
                    <div>
                      <p className="text-sage text-[11px] font-semibold tracking-[0.14em] uppercase">
                        {plan.status === "draft"
                          ? t("status.draft")
                          : t("status.pending")}
                      </p>
                      <h3 className="text-forest mt-3 font-serif text-[23px] font-normal">
                        {planKey ? t(`plans.${planKey}.title`) : plan.title}
                      </h3>
                      <p className="text-coffee/70 mt-3 text-[14px] leading-[1.55]">
                        {planKey
                          ? t(`plans.${planKey}.description`)
                          : plan.description}
                      </p>
                    </div>
                    <CompanyCta
                      variant="outline"
                      className="mt-5 self-start"
                      preselectedPlanSlug={plan.slug}
                    >
                      {t("configure")}
                    </CompanyCta>
                  </article>
                );
              })}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pt-[72px] md:pt-24">
        <div className="mx-auto max-w-[1536px] px-5 md:px-8">
          <Reveal>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {DELIVERY_FACTS.map((fact) => (
                <article
                  key={fact}
                  className="bg-surface border-coffee/8 rounded-[20px] border p-6"
                >
                  <h2 className="text-forest font-serif text-[23px] font-normal">
                    {t(`delivery.${fact}.title`)}
                  </h2>
                  <p className="text-coffee/70 mt-3 text-[14px] leading-[1.6]">
                    {t(`delivery.${fact}.description`)}
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
            <Eyebrow className="mb-4">{t("faqEyebrow")}</Eyebrow>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item}
                  className="bg-surface border-coffee/8 rounded-[18px] border px-5 py-4"
                >
                  <summary className="text-forest cursor-pointer font-medium">
                    {t(`faq.${item}.question`)}
                  </summary>
                  <p className="text-coffee/70 mt-3 text-[14px] leading-[1.6]">
                    {t(`faq.${item}.answer`)}
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
                <Eyebrow className="mb-4">{t("processEyebrow")}</Eyebrow>
                <h2 className="text-forest font-serif text-[clamp(26px,6.5vw,30px)] leading-[1.12] font-normal text-pretty">
                  {t("processTitle")}
                </h2>
              </div>
              <ol className="flex flex-col gap-5">
                {PROCESS_STEPS.map((step, index) => (
                  <li key={step} className="flex items-start gap-4">
                    <Chip variant="labelSolid" className="shrink-0">
                      {`0${index + 1}`}
                    </Chip>
                    <p className="text-coffee/78 text-[16px] leading-[1.6]">
                      {t(`steps.${step}`)}
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
                  {t("closingTitle")}
                </h2>
                <p className="text-canvas/72 max-w-[520px] text-[15.5px] leading-[1.65]">
                  {t("closingBody")}
                </p>
              </div>
              <CompanyCta variant="meadow">{t("configure")}</CompanyCta>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
import { useTranslations } from "next-intl";
