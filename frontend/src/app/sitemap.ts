import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await getContentProvider());
}
