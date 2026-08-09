import type { Metadata } from "next";

import { ScreenDostupnost } from "@/features/workspace/components/availability/screen-dostupnost";
import { requireTherapist } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Dostupnost" };

export default async function WorkspaceAvailabilityPage() {
  await requireTherapist();
  return <ScreenDostupnost />;
}
