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
          Locale only, deliberately without `messages`. `useLocale()` then works
          in every Client Component — which is what lets navigation build
          localized hrefs — while no catalogue crosses the server/client
          boundary from here. Message-bearing providers are scoped to the
          subtrees that render text, so the public pages never ship the
          workspace catalogue.
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
