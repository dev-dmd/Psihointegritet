import { ServicesPage } from "@/components/sections/services/services-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/usluge");

export default function ServicesRoute() {
  return <ServicesPage />;
}
