import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

import { NextIntlClientProvider } from "next-intl";

import { getUiLocale } from "@/i18n/locale-boundary";
import { HTML_LANG_BY_LOCALE } from "@/i18n/locales";
import { AuthProvider } from "@/lib/auth/clerk/auth-provider";
import { serverEnv } from "@/lib/validation/env";
import { ToastProvider } from "@/providers/toast-provider";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500"],
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

/**
 * Defaults for the founding tenant's pages, which still live in `app/(public)`.
 *
 * **These name one tenant and this layout now serves several** — the platform
 * host and every tenant host share it. Tenant surfaces under
 * `app/s/[organizationSlug]` therefore override every field here, `title`
 * included, with `absolute` so the template below cannot append someone else's
 * brand to their page.
 *
 * The proper fix is for this to assert nothing and for the founding tenant's
 * pages to carry their own defaults — which happens when they move under the
 * tenant segment in PDC-1. Removing it now would strip the demo tenant's page
 * titles for no gain, so it stays, scoped by override rather than by hope.
 */
export const metadata: Metadata = {
  metadataBase: new URL(serverEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Psihointegritet — Digitalni centar za mentalno zdravlje",
    template: "%s | Psihointegritet",
  },
  description:
    "Psihointegritet povezuje psihoterapiju, savetovanje, edukativne sadržaje, radionice i programe ličnog razvoja — online i uživo.",
};
// RootLayout is a Server Component by default. If you want to use a Client Component inside it, you need to add the "use client" directive at the top of the file.
/**
 * `lang` follows the organization, not a hardcoded value (D-077).
 *
 * `getLocale()` resolves through `i18n/request.ts`, which reads only
 * `process.env` and a checked-in table — no `headers()`, no `cookies()`. That
 * is what keeps this layout, and therefore every public page under it,
 * statically renderable. Making it `async` does not change that; awaiting a
 * value that needs no request is free.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getUiLocale();

  return (
    <html
      lang={HTML_LANG_BY_LOCALE[locale]}
      className={`${newsreader.variable} ${instrumentSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          Passed locale only, on the assumption that omitting `messages` keeps
          the catalogue on the server. **That is not what happens.** next-intl
          4.x has this provider inherit configuration from `getRequestConfig`
          when it renders inside a Server Component, so the whole platform
          catalogue — workspace and superadmin strings included — is serialized
          into every page's flight payload, public pages among them.

          Measured, not assumed: on a tenant home page the rendered markup is
          ~3 KB and the payload ~62 KB, and it carries the founding tenant's
          marketing copy on a *different* tenant's domain. Nothing renders from
          it, no metadata comes from it, and it predates B2 — the legacy public
          tree ships the identical payload — so this is a payload defect, not a
          content fallback.

          Narrowing it means giving ~71 client components a scoped provider
          each, which is its own task (TODO D40). It belongs with PDC-1, where
          the catalogue stops being one platform-wide object anyway.
        */}
        <NextIntlClientProvider locale={locale}>
          <AuthProvider>
            {children}
            <ToastProvider />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
