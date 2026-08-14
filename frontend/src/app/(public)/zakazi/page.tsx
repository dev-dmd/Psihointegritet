import { PageHero } from "@/components/shared/page-hero";
import { TherapistBookingWidget } from "@/components/booking/TherapistBookingWidget";
import { getTranslations } from "next-intl/server";
import { getFallbackContent } from "@/content/server";
import {
  deriveBookingSelectionPolicy,
  parseBookingContext,
  type BookingSearchParams,
} from "@/features/booking/booking-context";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/zakazi", await getContentProvider());
}

interface BookingPageProps {
  searchParams: Promise<BookingSearchParams>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const t = await getTranslations("public.pages.booking");
  const params = await searchParams;
  const fallback = await getFallbackContent();

  // `parseBookingContext` is the validated entry parser: unknown slugs are
  // dropped and an incompatible therapist/service pair is reconciled before it
  // ever reaches the widget. The policy is derived here, once — components
  // downstream read the policy, never `source`.
  const context = parseBookingContext(params, {
    services: fallback.services.serviceCatalog,
    therapists: fallback.therapists,
  });
  const selectionPolicy = deriveBookingSelectionPolicy(context.source);

  return (
    <>
      <PageHero id="zakazi" tone="warm">
        <div className="max-w-[720px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-pretty">
            {t("title")}
          </h1>
          <p className="text-coffee/75 text-[16px] leading-[1.65]">
            {t("intro")}
          </p>
        </div>
      </PageHero>
      <section className="pt-[56px] pb-[72px] md:pt-20 md:pb-24">
        <TherapistBookingWidget
          selectionPolicy={selectionPolicy}
          {...(context.therapistSlug
            ? { therapistSlug: context.therapistSlug }
            : {})}
          {...(context.serviceSlug ? { serviceSlug: context.serviceSlug } : {})}
          {...(context.format ? { format: context.format } : {})}
          {...(context.source ? { source: context.source } : {})}
        />
      </section>
    </>
  );
}
