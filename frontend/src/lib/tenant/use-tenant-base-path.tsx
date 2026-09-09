"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The tenant prefix every link on a tenant surface has to carry, for Client
 * Components.
 *
 * Outside production a tenant is addressed by path — `staging.example.com/
 * sanja-neuer/nalog` — so a sidebar rendering a bare `/nalog/termini` sends the
 * person to the *platform's* client area, which is a 404 there. In production
 * the value is `""` and every link is exactly what it was.
 *
 * A context rather than a prop threaded through five components, and rather
 * than each component asking: the answer is one value per request, the server
 * already knows it, and a component that computed it itself would need the
 * request — which is what `scripts/check-frontend-architecture.mjs` exists to
 * keep out of the render path. The client twin of `useUiLocale`, and provided
 * next to the locale for the same reason.
 *
 * Defaults to `""` rather than throwing. A Client Component rendering inside an
 * error boundary or a test without a provider should degrade to an unprefixed
 * link, not take the tree down.
 */
const TenantBasePathContext = createContext<string>("");

export function TenantBasePathProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: ReactNode;
}) {
  return (
    <TenantBasePathContext value={basePath}>{children}</TenantBasePathContext>
  );
}

export function useTenantBasePath(): string {
  return useContext(TenantBasePathContext);
}
