import { CompaniesPage } from "@/components/sections/companies/companies-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/rad-sa-kompanijama");

export default function CompaniesRoute() {
  return <CompaniesPage />;
}
