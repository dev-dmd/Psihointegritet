import type { Route } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { MonogramAvatar } from "@/components/ui/monogram-avatar";
import { buildBookingHref } from "@/features/booking/booking-context";
import type { Therapist } from "@/types/therapist";

export function ChooserScreen({
  headingRef,
  therapists,
  onQuiz,
  onChooseTherapist,
  onClose,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  therapists: readonly Therapist[];
  onQuiz: () => void;
  onChooseTherapist?: ((therapistSlug: string) => void) | undefined;
  onClose?: (() => void) | undefined;
}) {
  const t = useTranslations("guidance.chooser");
  return (
    <>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="text-forest mb-2 font-serif text-[28px] leading-[1.12] font-normal text-pretty outline-none md:text-[32px]"
      >
        {t("title")}
      </h2>
      <p className="text-coffee/70 mb-7 text-[15px] leading-[1.6]">
        {t("description")}
      </p>
      <button
        type="button"
        onClick={onQuiz}
        className="border-coffee/12 bg-surface hover:border-sage mb-3 flex min-h-11 w-full cursor-pointer flex-col gap-1.5 rounded-2xl border-[1.5px] px-[22px] py-[18px] text-left transition-colors duration-200"
      >
        <span className="text-forest font-serif text-xl">
          {t("guidedTitle")}
        </span>
        <span className="text-coffee/65 text-[14px] leading-[1.5]">
          {t("guidedDescription")}
        </span>
      </button>
      <div className="text-sage mt-6 mb-3 text-[12.5px] font-semibold tracking-[0.14em] uppercase">
        {t("directLabel")}
      </div>
      <div className="flex flex-col gap-2.5">
        {therapists.map((therapist) => {
          const content = (
            <>
              <MonogramAvatar
                initials={therapist.initials}
                name={therapist.name}
                imageSrc={therapist.image}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="text-forest block font-serif text-lg">
                  {therapist.name}
                </span>
                <span className="text-coffee/60 block truncate text-[13px]">
                  {therapist.title}
                </span>
              </span>
              <span aria-hidden className="text-forest text-[15px]">
                →
              </span>
            </>
          );
          const className =
            "bg-surface border-coffee/8 hover:shadow-row-hover flex items-center gap-4 rounded-[18px] border px-5 py-3.5 text-left no-underline transition-shadow duration-200";
          return onChooseTherapist ? (
            <button
              key={therapist.slug}
              type="button"
              onClick={() => onChooseTherapist(therapist.slug)}
              className={`${className} w-full cursor-pointer`}
            >
              {content}
            </button>
          ) : (
            <Link
              key={therapist.slug}
              href={
                buildBookingHref({
                  therapist: therapist.slug,
                  source: "therapist",
                }) as Route
              }
              onClick={() => onClose?.()}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </>
  );
}
