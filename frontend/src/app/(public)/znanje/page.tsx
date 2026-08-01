import { KnowledgePage } from "@/components/sections/resources/knowledge-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/znanje", await getContentProvider());
}

export default function KnowledgeRoute() {
  return <KnowledgePage />;
}
