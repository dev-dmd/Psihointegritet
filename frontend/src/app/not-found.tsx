import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Stranica nije pronađena</h1>
      <p className="max-w-md text-sm opacity-80">
        Stranica koju tražite ne postoji ili je premeštena.
      </p>
      <Link
        href="/"
        className="hover:bg-foreground/5 rounded-md border px-4 py-2 text-sm font-medium"
      >
        Nazad na početnu
      </Link>
    </main>
  );
}
