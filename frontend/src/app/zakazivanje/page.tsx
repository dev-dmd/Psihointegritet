import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

import { staticContentProvider } from "@/lib/content-governance/static-provider";

export default function LegacyBookingRoute() {
  const redirect = staticContentProvider.getRedirect("/zakazivanje");
  permanentRedirect((redirect?.targetPath ?? "/zakazi") as Route);
}
