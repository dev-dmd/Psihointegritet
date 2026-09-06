import type { Metadata } from "next";

import { ScreenKlijenti } from "@/features/workspace/components/screen-klijenti";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Klijenti" };

export default async function WorkspaceClientsPage() {
  await requireStaff();
  return <ScreenKlijenti />;
}
