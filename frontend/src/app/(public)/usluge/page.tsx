import type { Metadata } from "next";

import { ServicesPage } from "@/components/sections/services/services-page";

export const metadata: Metadata = {
  title: "Usluge",
  description:
    "Individualna psihoterapija, bračno savetovanje i psihoterapijsko savetovanje — trajanje, okvirne cene i format. Online i uživo u Nišu i Leskovcu.",
  alternates: { canonical: "/usluge" },
};

export default function ServicesRoute() {
  return <ServicesPage />;
}
