import type { Metadata } from "next";

import { PublicTaxonomyListPage } from "@/app/(public)/kompas/_components/public-taxonomy-list-page";
import {
  compassListDiscoverability,
  createCompassMetadata,
} from "@/lib/compass/discoverability";
import { getPublicTaxonomy } from "@/lib/compass/public-taxonomy";
import { publicTermsForRouteKind } from "@/lib/compass/taxonomy-view";

export const metadata: Metadata = createCompassMetadata(
  compassListDiscoverability("oblast"),
);

export default async function CompassAreasPage() {
  const collection = await getPublicTaxonomy();
  return (
    <PublicTaxonomyListPage
      routeKind="oblast"
      terms={publicTermsForRouteKind(collection, "oblast")}
    />
  );
}
