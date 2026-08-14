import { ArrowLink } from "@/components/ui/arrow-link";
import { Chip } from "@/components/ui/chip";
import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import type { UiLocale } from "@/i18n/locales";
import { localizedPublicPath } from "@/lib/routes/public-path";
import type { Therapist } from "@/types/therapist";
import { getLocale, getTranslations } from "next-intl/server";

interface TherapistCardProps {
  therapist: Therapist;
}

export async function TherapistCard({ therapist }: TherapistCardProps) {
  const t = await getTranslations("public.pages.therapist");
  const locale = (await getLocale()) as UiLocale;
  return (
    <article className="bg-surface border-coffee/6 hover:shadow-card-hover-lg flex flex-col gap-[22px] rounded-3xl border px-8 pt-[34px] pb-[30px] transition-all duration-[250ms] hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <MonogramAvatar
          initials={therapist.initials}
          name={therapist.name}
          imageSrc={therapist.image}
        />
        {therapist.badge ? (
          <Chip variant="label">{therapist.badge}</Chip>
        ) : null}
      </div>
      <div>
        <h3 className="text-forest mb-1.5 font-serif text-[29px] leading-[1.1] font-normal">
          {therapist.name}
        </h3>
        <div className="text-coffee/60 text-[13.5px] font-semibold tracking-[0.04em]">
          {therapist.title}
        </div>
      </div>
      {therapist.quote ? (
        <p className="text-coffee/82 font-serif text-[18.5px] leading-[1.45] italic">
          „{therapist.quote}“
        </p>
      ) : null}
      {therapist.formats ? (
        <div className="border-coffee/8 border-t pt-[18px]">
          <div className="text-sage mb-2 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
            {t("formats")}
          </div>
          <div className="text-coffee/75 text-[14.5px] leading-[1.6]">
            {therapist.formats}
          </div>
        </div>
      ) : null}
      <div>
        <div className="text-sage mb-2.5 text-[11.5px] font-semibold tracking-[0.14em] uppercase">
          {t("mainAreas")}
        </div>
        <div className="flex flex-wrap gap-2">
          {therapist.areas.map((area) => (
            <Chip key={area} variant="tagOutlined">
              {area}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mt-auto pt-2">
        <ArrowLink
          href={localizedPublicPath("public.team.detail", {
            locale,
            params: { slug: therapist.slug },
          })}
          circled
        >
          {t("meet")}
        </ArrowLink>
      </div>
    </article>
  );
}
