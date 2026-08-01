import type { MetadataRoute } from "next";

import { robotsPolicy } from "@/lib/content-governance/discoverability";

export default function robots(): MetadataRoute.Robots {
  return robotsPolicy();
}
