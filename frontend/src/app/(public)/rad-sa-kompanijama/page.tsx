import type { Metadata } from "next";

import { CompaniesPage } from "@/components/sections/companies/companies-page";

export const metadata: Metadata = {
  title: "Rad sa kompanijama",
  description:
    "Radionice, edukacije i psihološka podrška za timove i zaposlene. Psihointegritet — podrška mentalnom zdravlju u radnom okruženju, online i uživo.",
  alternates: { canonical: "/rad-sa-kompanijama" },
};

export default function CompaniesRoute() {
  return <CompaniesPage />;
}
