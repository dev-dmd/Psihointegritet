import { serverEnv } from "@/lib/validation/env";

/**
 * Foundation smoke page. Rendered as a React Server Component — the
 * `process.version` read below can only execute on the server, which is what
 * the e2e smoke test asserts. Replaced by the Claude Design handoff later.
 */
export default async function HomePage() {
  const apiUrl = new URL(serverEnv.NEXT_PUBLIC_API_URL);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Psihointegritet — Digitalni centar
      </h1>
      <p className="max-w-xl text-balance opacity-80">
        Platforma za pronalaženje stručne psihološke podrške. Temelj projekta je
        postavljen — dizajn i funkcionalnosti stižu u narednim koracima.
      </p>
      <dl className="text-sm opacity-60">
        <div className="flex gap-2">
          <dt>Server runtime:</dt>
          <dd data-testid="server-runtime">Node {process.version}</dd>
        </div>
        <div className="flex gap-2">
          <dt>API host:</dt>
          <dd>{apiUrl.host}</dd>
        </div>
      </dl>
    </main>
  );
}
