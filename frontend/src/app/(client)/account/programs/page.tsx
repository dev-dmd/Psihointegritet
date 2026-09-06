import type { Metadata } from "next";

import { ScreenProgrami } from "@/features/account/components/screen-programi";
import { requireClient } from "@/lib/auth/guards";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";
import { getPlatformMessages } from "@/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveWorkspaceLocale();
  return { title: getPlatformMessages(locale).account.metadata.programs };
}

/** KP 03 „Programi i paketi" — the tab exists, the module behind it does not. */
export default async function ClientProgramsPage() {
  await requireClient();
  return <ScreenProgrami />;
}
