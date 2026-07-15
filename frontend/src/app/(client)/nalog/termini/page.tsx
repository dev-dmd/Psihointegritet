import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moji termini",
};

/**
 * Protected client area — appointments list (Milestone 1 skeleton). The booking
 * data model and CRUD arrive with a later slice; this page exists so the header
 * account menu links to a real, session-gated destination.
 */
export default function ClientAppointmentsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <p className="text-forest-lift text-sm font-medium tracking-wide uppercase">
        Klijentska zona
      </p>
      <h1 className="text-forest mt-2 font-serif text-3xl md:text-4xl">
        Moji termini
      </h1>
      <p className="text-forest-lift mt-3 max-w-prose">
        Zaštićeni skeleton. Pregled i zakazivanje termina stižu sa backend
        slojem za rezervacije.
      </p>
    </main>
  );
}
