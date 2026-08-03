import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicTaxonomyListPage } from "@/app/(public)/kompas/_components/public-taxonomy-list-page";
import { isCompassPublicEnabled } from "@/lib/compass/flags";
import {
  compassListDiscoverability,
  createCompassMetadata,
} from "@/lib/compass/discoverability";
import { withFallbackTerms } from "@/features/compass/fallback-taxonomy";
import { getPublicTaxonomy } from "@/lib/compass/public-taxonomy";
import { publicTermsForRouteKind } from "@/lib/compass/taxonomy-view";

export const metadata: Metadata = createCompassMetadata(
  compassListDiscoverability("tema"),
);

export default async function CompassTopicsPage() {
  if (!isCompassPublicEnabled()) notFound();

  const collection = await getPublicTaxonomy();
  return (
    <PublicTaxonomyListPage
      routeKind="tema"
      terms={withFallbackTerms(
        publicTermsForRouteKind(collection, "tema"),
        "tema",
      )}
      areas={withFallbackTerms(
        publicTermsForRouteKind(collection, "oblast"),
        "oblast",
      )}
    />
  );
}
