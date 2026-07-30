import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";
import { getContentProvider } from "@/lib/content-governance/provider-resolver";

export async function generateMetadata() {
  return metadataForRoute("/pravila-zakazivanja", await getContentProvider());
}

export default function PravilaZakazivanjaPage() {
  return (
    <LegalDocumentPage
      kind="booking_rules"
      eyebrow="Pravni tekst"
      fallbackTitle="Pravila zakazivanja"
    />
  );
}
