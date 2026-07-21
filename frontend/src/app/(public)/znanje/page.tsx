import { KnowledgePage } from "@/components/sections/resources/knowledge-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/znanje");

export default function KnowledgeRoute() {
  return <KnowledgePage />;
}
