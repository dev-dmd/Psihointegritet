import { GuidanceFlow } from "@/features/guidance/guidance-flow";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/pronadji-podrsku");

export default function FindSupportPage() {
  return <GuidanceFlow entry="page" surface="page" />;
}
