import type { Metadata } from "next";

import { ScreenProfil } from "@/features/workspace/components/screen-profil";
import { requireTherapist } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Moj profil" };

export default async function WorkspaceProfilePage() {
  await requireTherapist();
  return <ScreenProfil />;
}
