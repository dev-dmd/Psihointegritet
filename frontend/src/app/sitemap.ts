import type { MetadataRoute } from "next";

import {
  compassSitemapEntries,
  mergeSitemapEntries,
} from "@/lib/compass/discoverability";
import { isCompassPublicEnabled } from "@/lib/compass/flags";
import { getPublicTaxonomy } from "@/lib/compass/public-taxonomy";
import { sitemapEntries } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";
import {
  deploymentEnvironment,
  isProductionEnvironment,
} from "@/lib/content-governance/runtime";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const environment = deploymentEnvironment();
  // A deactivated Kompas answers 404 (D-059), so its routes must not be
  // advertised even where the environment would otherwise be indexable.
  if (!isProductionEnvironment(environment) || !isCompassPublicEnabled()) {
    return sitemapEntries(await getContentProvider(), undefined, environment);
  }

  const [provider, taxonomy] = await Promise.all([
    getContentProvider(),
    getPublicTaxonomy(),
  ]);
  return mergeSitemapEntries(
    sitemapEntries(provider, undefined, environment),
    compassSitemapEntries(taxonomy, undefined, environment),
  );
}
