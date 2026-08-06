import { PageHero } from "@/components/shared/page-hero";
import { TherapistBookingWidget } from "@/components/booking/TherapistBookingWidget";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/zakazi", await getContentProvider());
}

interface BookingPageProps {
  searchParams: Promise<{ therapist?: string; source?: string }>;
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const params = await searchParams;

  return (
    <>
      <PageHero id="zakazi" tone="warm">
        <div className="max-w-[720px]">
          <p className="text-coffee/60 mb-4 text-[12px] font-semibold tracking-[0.14em] uppercase">
            Zakazivanje
          </p>
          <h1 className="text-coffee mb-4 font-serif text-[clamp(32px,8.5vw,52px)] leading-[1.06] font-normal text-pretty">
            Pošaljite zahtev za termin
          </h1>
          <p className="text-coffee/75 text-[16px] leading-[1.65]">
            Izaberite uslugu, terapeuta i željeni termin. Dostupnost proverava
            terapeut ili član tima pre konačne potvrde.
          </p>
        </div>
      </PageHero>
      <section className="pt-[56px] pb-[72px] md:pt-20 md:pb-24">
        <TherapistBookingWidget
          therapistSlug={params.therapist}
          source={params.source}
        />
      </section>
    </>
  );
}
