import type { Metadata } from "next";

import { ComingSoonSection } from "@/features/superadmin/components/coming-soon-section";
import { requireSuperadmin } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Podešavanja" };

export default async function SuperadminSettingsPage() {
  await requireSuperadmin();

  return <ComingSoonSection />;
}
