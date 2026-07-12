"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Foundation placeholder: report to observability once it is configured.
    console.error(error.digest ?? "route-error");
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Došlo je do greške</h1>
      <p className="max-w-md text-sm opacity-80">
        Nešto nije u redu na našoj strani. Pokušajte ponovo — ako se greška
        ponavlja, kontaktirajte nas.
      </p>
      <button
        type="button"
        onClick={reset}
        className="hover:bg-foreground/5 rounded-md border px-4 py-2 text-sm font-medium"
      >
        Pokušaj ponovo
      </button>
    </main>
  );
}
