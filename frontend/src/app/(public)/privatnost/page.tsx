import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/privatnost", await getContentProvider());
}

export default function PrivatnostPage() {
  return (
    <LegalDocumentPage
      kind="privacy_policy"
      eyebrow="Pravni tekst"
      fallbackTitle="Politika privatnosti"
    />
  );
}
