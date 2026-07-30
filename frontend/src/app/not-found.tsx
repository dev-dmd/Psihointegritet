import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70svh] flex-col items-center justify-center gap-4 px-6 pt-36 pb-16 text-center sm:pt-44 md:px-8">
      <p className="text-sage text-[11px] font-semibold tracking-[0.16em] uppercase">
        Greška 404
      </p>
      <h1 className="text-forest font-serif text-4xl leading-[1.1] font-medium sm:text-5xl">
        Stranica nije pronađena
      </h1>
      <p className="text-coffee/70 max-w-md text-[15px] leading-relaxed">
        Stranica koju tražite ne postoji ili je premeštena.
      </p>
      <Link
        href="/"
        className="border-forest bg-forest text-canvas hover:bg-forest-hover mt-2 rounded-full border px-5 py-2.5 text-sm font-semibold no-underline transition-colors"
      >
        Nazad na početnu
      </Link>
    </main>
  );
}
