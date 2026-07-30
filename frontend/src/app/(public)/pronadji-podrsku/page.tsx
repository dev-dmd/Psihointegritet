import { GuidanceFlow } from "@/features/guidance/guidance-flow";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/pronadji-podrsku", await getContentProvider());
}

export default function FindSupportPage() {
  return <GuidanceFlow entry="page" surface="page" />;
}
