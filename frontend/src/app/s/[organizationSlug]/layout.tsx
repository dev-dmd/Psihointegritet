import type { ReactNode } from "react";

/**
 * The tenant surface: a tenant's own public site and its clients' area, served
 * under the internal segment the proxy rewrites onto (`/s/[organizationSlug]`).
 *
 * Nothing here reads the request. The tenant arrives as a route param, which is
 * what lets these pages prerender per tenant while one project serves them all.
 */
export default function TenantLayout({ children }: { children: ReactNode }) {
  return children;
}
