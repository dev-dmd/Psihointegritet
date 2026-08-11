import { redirect } from "next/navigation";

import { localizedPath } from "@/lib/routes/localized-path";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";

/**
 * Kompas content is a tab inside Kompas, not a separate destination. The path
 * stays valid so links and the editor's back button keep working.
 *
 * The target is built for the organization's locale rather than hardcoded:
 * redirecting a Serbian user onto an English path would be a 404 today and a
 * pointless extra 308 hop once the proxy lands.
 */
export default async function KompasContentIndexPage() {
  redirect(
    localizedPath("workspace.compass.home", {
      locale: await resolveWorkspaceLocale(),
      tab: "content",
    }),
  );
}
