import { CompaniesPage } from "@/components/sections/companies/companies-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/rad-sa-kompanijama", await getContentProvider());
}

export default async function CompaniesRoute() {
  const plans = (await getContentProvider())
    .listAll()
    .filter((entity) => entity.type === "company_plan")
    .map((entity) => entity.source);
  return <CompaniesPage plans={plans} />;
}
