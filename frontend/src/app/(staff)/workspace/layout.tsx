import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NextIntlClientProvider } from "next-intl";

import { getUiLocale } from "@/i18n/locale-boundary";
import { getPlatformMessages } from "@/messages";

import { WorkspaceBottomNav } from "@/features/workspace/components/bottom-nav";
import { WorkspaceSidebar } from "@/features/workspace/components/sidebar";
import { WorkspaceTopbar } from "@/features/workspace/components/topbar";
import { PanelErrorsProvider } from "@/features/workspace/panel-errors";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import {
  requireStaff,
  isWorkspaceAdmin,
  isWorkspaceTherapist,
} from "@/lib/auth/guards";
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
  const identity = await requireStaff();
  const isAdmin = isWorkspaceAdmin(identity);
  const isTherapist = isWorkspaceTherapist(identity);

  // Only the namespaces this subtree renders. The root provider carries the
  // locale alone, so a public marketing page never ships the Control Center
  // catalogue to the browser.
  const locale = await getUiLocale();
  const { workspace, common } = getPlatformMessages(locale);

  return (
    <NextIntlClientProvider messages={{ workspace, common }}>
      <QueryProvider>
        <WorkspaceProvider isAdmin={isAdmin} isTherapist={isTherapist}>
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
