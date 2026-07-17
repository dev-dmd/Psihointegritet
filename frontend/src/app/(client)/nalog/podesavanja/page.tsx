import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Podešavanja",
};

/**
 * Protected client area — account settings (Milestone 1 skeleton). Profile and
 * preferences editing arrive with the backend identity slice; this page exists
 * so the header account menu links to a real, session-gated destination.
 */
export default function ClientSettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-20 md:px-8">
      <p className="text-forest-lift text-sm font-medium tracking-wide uppercase">
        Klijentska zona
      </p>
      <h1 className="text-forest mt-2 font-serif text-3xl md:text-4xl">
        Podešavanja
      </h1>
      <p className="text-forest-lift mt-3 max-w-prose">
        Zaštićeni skeleton. Uređivanje profila i preferencija stiže sa backend
        identity sloja (<code>GET /api/v1/me</code>).
      </p>
    </main>
  );
}
