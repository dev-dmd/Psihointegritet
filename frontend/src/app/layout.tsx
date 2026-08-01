import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <html
        lang="sr-Latn"
        className={`${newsreader.variable} ${instrumentSans.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          {children}
          <ToastProvider />
        </body>
      </html>
    </AuthProvider>
  );
}
