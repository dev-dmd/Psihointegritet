import type { ReactNode } from "react";

import { PLATFORM_NAME } from "@/lib/tenant/domain-registry";

/**
 * The frame around sign-in, chosen by surface rather than by hostname.
 *
 * `/prijava` answers on every host — it has to, since it is how anybody reaches
 * anything — but it must not *look* the same on all of them. The platform's
 * owners are signing in to their workplace and get the platform's own panel;
 * a client on a practitioner's domain is signing in to that practice and must
 * not be handed P. Digital Centar branding they have no reason to know about.
 *
 * The surface arrives as a prop from the stamp the proxy already applies, never
 * from a hostname comparison in here. A component that compares host strings
 * would be a second, quieter copy of the domain registry, and the two would
 * disagree the first time a domain moved.
 *
 * Under Clerk satellite domains a tenant's client is briefly carried to the
 * primary domain to sign in and returned afterwards. That is Clerk's contract,
 * not a bug, and it is exactly why this component takes the *return* surface
 * rather than the current URL as its input once that lands.
 */
export function AuthSurfaceLayout({
  surface,
  children,
}: {
  surface: "tenant" | "platform";
  children: ReactNode;
}) {
  if (surface !== "platform") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-16">
        {children}
      </main>
    );
  }

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Neutral stand-in until PDC-1 brings real artwork. It carries the
          platform's name so the panel says whose workplace this is, which is
          the only job it has today. */}
      <aside className="bg-coffee/[0.04] hidden flex-col justify-center px-12 py-16 lg:flex">
        <div
          aria-hidden
          className="border-coffee/10 bg-coffee/[0.03] text-coffee/25 flex aspect-[4/3] w-full items-center justify-center rounded-2xl border font-serif text-[clamp(28px,4vw,44px)]"
        >
          PDC
        </div>
        <p className="text-coffee mt-8 font-serif text-[clamp(22px,2.4vw,30px)] leading-[1.2]">
          {PLATFORM_NAME}
        </p>
      </aside>

      {/* On a phone the branding stacks above the form rather than disappearing,
          so the person still knows where they are signing in. */}
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <p className="text-coffee mb-8 font-serif text-[22px] lg:hidden">
          {PLATFORM_NAME}
        </p>
        {children}
      </div>
    </main>
  );
}
