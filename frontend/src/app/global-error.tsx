"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sr-Latn">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1>Došlo je do neočekivane greške</h1>
        <p>Osvežite stranicu ili pokušajte ponovo kasnije.</p>
        {error.digest ? <p>Kod greške: {error.digest}</p> : null}
        <button type="button" onClick={reset}>
          Pokušaj ponovo
        </button>
      </body>
    </html>
  );
}
