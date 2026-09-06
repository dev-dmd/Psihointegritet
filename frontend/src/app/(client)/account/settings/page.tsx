import { redirect } from "next/navigation";

import { localizedPath } from "@/lib/routes/localized-path";
import { requireClient } from "@/lib/auth/guards";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";

/**
 * `/nalog/podesavanja` predates the panel and was a skeleton page. The design
 * merges settings into „KP 04 Profil" — one screen for identity, notification
 * preferences and consents — so this route now forwards there rather than
 * offering a second, emptier version of the same thing.
 *
 * Kept as a redirect instead of deleted: the header account menu and any link
 * minted before the panel existed still point at it.
 */
export default async function ClientSettingsPage() {
  await requireClient();
  redirect(
    localizedPath("account.profile", {
      locale: await resolveWorkspaceLocale(),
    }),
  );
}
