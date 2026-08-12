import { platformRootSegments } from "@/lib/routes/platform-routes";

/**
 * Slugs a custom CMS document may not use, because a static route already owns
 * that path.
 *
 * Next resolves static segments before the root-level `[documentSlug]` catch,
 * so a document slugged `workspace` is **silently shadowed**: it publishes
 * cleanly, appears in the registry, and 404s forever with no error anywhere.
 * That is the failure this list exists to prevent.
 *
 * The platform roots are **derived, not typed out** (D-077 Amendment). The
 * hand-written list below covers the public marketing pages; the workspace,
 * account and superadmin roots come from the route registry, so a locale or a
 * route added later is covered without anyone remembering to come back here.
 * Before this, the list contained none of `radni-prostor`, `nalog`,
 * `superadmin`, `prijava`, `registracija` or `zakazivanje` — every one of them
 * was a shadowing bug waiting for someone to pick the wrong slug.
 */
const PUBLIC_PAGE_SLUGS = [
  "booking-widget",
  "cene",
  "kolacici",
  "kompas",
  "kontakt",
  "o-nama",
  "podrska-roditeljima",
  "pravila-zakazivanja",
  "privatnost",
  "pronadji-podrsku",
  "rad-sa-kompanijama",
  "radionice",
  "tim",
  "uslovi",
  "usluge",
  "zakazi",
  "znanje",
] as const;

/**
 * App roots that are not platform routes: the auth pages (never localized,
 * D-077 Amendment §10) and the legacy booking redirect.
 */
const NON_REGISTRY_ROOTS = ["prijava", "registracija", "zakazivanje"] as const;

export const RESERVED_CUSTOM_DOCUMENT_SLUGS: readonly string[] = [
  ...new Set<string>([
    ...PUBLIC_PAGE_SLUGS,
    ...NON_REGISTRY_ROOTS,
    ...platformRootSegments(),
  ]),
].sort();

export const reservedCustomDocumentSlugs = new Set<string>(
  RESERVED_CUSTOM_DOCUMENT_SLUGS,
);
