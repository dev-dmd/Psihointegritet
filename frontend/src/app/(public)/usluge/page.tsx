import { ServicesPage } from "@/components/sections/services/services-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/usluge", await getContentProvider());
}

export default async function ServicesRoute() {
  const provider = await getContentProvider();
  return (
    <ServicesPage
      services={provider
        .listAll()
        .filter((entity) => entity.type === "service")
        .map((entity) => entity.source)}
      programs={provider
        .listAll()
        .filter((entity) => entity.type === "program")
        .map((entity) => entity.source)}
      packages={provider
        .listAll()
        .filter((entity) => entity.type === "package_offer")
        .map((entity) => entity.source)}
    />
  );
}
