import type { Metadata } from "next";

import { ScreenProgrami } from "@/features/account/components/screen-programi";
import { requireClient } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Programi" };

/** KP 03 „Programi i paketi" — the tab exists, the module behind it does not. */
export default async function ClientProgramsPage() {
  await requireClient();
  return <ScreenProgrami />;
}
