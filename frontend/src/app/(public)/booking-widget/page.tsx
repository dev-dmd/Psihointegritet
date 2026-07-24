import { BookingWidgetDemo } from "@/features/booking-widget/components/BookingWidgetDemo";

export default function BookingWidgetDemoPage() {
  return (
    <main className="pt-32 pb-16 sm:pt-40 sm:pb-24">
      <section className="mx-auto max-w-[1536px] px-5 md:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sage mb-3 text-xs font-semibold tracking-[0.14em] uppercase">
            UI preview
          </p>
          <h1 className="text-forest font-serif text-[clamp(32px,6vw,52px)] leading-[1.06] font-normal">
            Booking Widget — tri vizuelne varijante
          </h1>
          <p className="text-coffee/72 mt-4 text-[16px] leading-[1.65]">
            Interaktivni UI prikaz za glass, light i dark temu. Slanje i Notify
            Me koriste samo lokalne demo callback-e; Booking Engine nije deo
            ovog prikaza.
          </p>
        </div>
        <BookingWidgetDemo />
      </section>
    </main>
  );
}
