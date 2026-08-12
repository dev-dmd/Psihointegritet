import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NextIntlClientProvider } from "next-intl";

import { AccountBottomNav } from "@/features/account/components/bottom-nav";
import { AccountSidebar } from "@/features/account/components/sidebar";
import { AccountTopbar } from "@/features/account/components/topbar";
import { profileNameOf } from "@/features/account/identity-display";
import { getInitials } from "@/lib/auth/clerk/initials";
import { requireClient } from "@/lib/auth/guards";
import { resolveWorkspaceLocale } from "@/lib/tenant/workspace-locale";
import { getPlatformMessages } from "@/messages";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: { default: "Moj panel", template: "%s · Psihointegritet" },
  robots: { index: false, follow: false },
};

/**
 * Client panel shell, in two shapes.
 *
 * Below `lg` it is the handoff exactly: one 480px app column on the canvas,
 * sticky header, four-tab bottom bar. From `lg` up it becomes the Control
 * Center shell — fixed forest sidebar, content across the full width — because
 * the handoff only ever drew the phone frame and the panels are one product.
 * Copying that shell rather than inventing a second desktop language is also
 * what keeps the two in step when either changes.
 *
 * The content column is capped at 780px, not the workspace's 1160px: every
 * client screen is a single stack of cards, and stretching the „Sledeći
 * termin" card the full width of a monitor would leave a dark band with four
 * words in it.
 *
 * The layout guard is the outer wall only; every page below still calls
 * `requireClient()` itself, because layouts do not re-run on soft navigation
 * (rules §11, D-026).
 */
export default async function ClientLayout({
  children,
}: {
  children: ReactNode;
}) {
  const identity = await requireClient();
  const [firstName, lastName] = (identity.displayName ?? "").split(" ");

  // The client panel is a tenant surface, so it follows the organization's
  // `ui_locale` — never a personal choice, never the public content locale.
  const locale = await resolveWorkspaceLocale();
  const { account, common } = getPlatformMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={{ account, common }}>
      <QueryProvider>
        <div className="bg-canvas flex min-h-screen justify-center lg:justify-start">
          <AccountSidebar
            displayName={profileNameOf(identity)}
            email={identity.email}
            initials={getInitials(firstName, lastName, identity.email)}
          />
          <div className="bg-panel-canvas relative flex min-h-screen w-full max-w-[480px] flex-col shadow-[0_30px_80px_-30px_rgba(58,46,40,0.35)] lg:ml-[264px] lg:max-w-none lg:shadow-none">
            <AccountTopbar />
            <main className="w-full flex-1 self-center px-[22px] pt-[22px] pb-8 lg:max-w-[780px] lg:px-8 lg:pt-8 lg:pb-14">
              {children}
            </main>
            <AccountBottomNav />
          </div>
        </div>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
