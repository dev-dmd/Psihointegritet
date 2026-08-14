import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NextIntlClientProvider } from "next-intl";

import { getPlatformMessages } from "@/messages";

import { WorkspaceBottomNav } from "@/features/workspace/components/bottom-nav";
import { WorkspaceSidebar } from "@/features/workspace/components/sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/topbar";
import { PanelErrorsProvider } from "@/features/workspace/panel-errors";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { getWorkspaceBootstrap } from "@/features/workspace/workspace-bootstrap";
import { isWorkspaceAdmin, isWorkspaceTherapist } from "@/lib/auth/guards";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: { default: "Control Center", template: "%s · Control Center" },
  robots: { index: false, follow: false },
};

/**
 * Control Center shell (design handoff `design_handoff_paneli/` §8.1): forest
 * sidebar (desktop), sticky topbar, mobile bottom nav, 1160px content column.
 *
 * Role flags are derived server-side from the real `Identity` and handed to
 * the client `WorkspaceProvider` so the nav renders the union of what the
 * user's roles grant. The layout guard is the outer wall; every page under
 * this segment still calls its own guard (nav hiding is never authorization).
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { identity, organization } = await getWorkspaceBootstrap();
  const isAdmin = isWorkspaceAdmin(identity);
  const isTherapist = isWorkspaceTherapist(identity);

  // Only the namespaces this subtree renders. The root provider carries the
  // locale alone, so a public marketing page never ships the Control Center
  // catalogue to the browser.
  // `resolveWorkspaceLocale`, not `getUiLocale`: the latter asks next-intl what
  // it rendered with, and `i18n/request.ts` deliberately resolves the *public*
  // cached `ui_locale` so the marketing pages stay static. The workspace
  // is the surface `ui_locale` was created for (D-077), and reading the wrong
  // one is why the panel kept its old language while the URL changed.
  const locale = organization.uiLocale;
  const { workspace, content, common, screens } = getPlatformMessages(locale);

  return (
    <NextIntlClientProvider
      // Explicit, because the provider otherwise inherits the root one — which
      // carries the public locale. The messages below are chosen by `locale`,
      // so leaving it implicit lets the two disagree.
      locale={locale}
      messages={{ workspace, content, common, screens }}
    >
      <QueryProvider>
        <WorkspaceProvider
          isAdmin={isAdmin}
          isTherapist={isTherapist}
          displayName={identity.displayName ?? identity.email}
          initialOrganization={organization}
        >
          <PanelErrorsProvider>
            <div className="bg-panel-canvas flex min-h-screen">
              <WorkspaceSidebar />
              <div className="flex min-w-0 flex-1 flex-col lg:ml-[264px]">
                <WorkspaceTopbar />
                <main className="w-full max-w-[1160px] self-center px-4 pt-[30px] pb-[104px] md:px-8 lg:pb-14">
                  {children}
                </main>
              </div>
              <WorkspaceBottomNav />
            </div>
          </PanelErrorsProvider>
        </WorkspaceProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
