import type { MetadataRoute } from "next";

import { sitemapEntries } from "@/lib/content-governance/discoverability";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
