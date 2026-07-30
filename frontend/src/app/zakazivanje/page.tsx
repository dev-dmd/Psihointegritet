import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export default async function LegacyBookingRoute() {
  const redirect = (await getContentProvider()).getRedirect("/zakazivanje");
  permanentRedirect((redirect?.targetPath ?? "/zakazi") as Route);
}
