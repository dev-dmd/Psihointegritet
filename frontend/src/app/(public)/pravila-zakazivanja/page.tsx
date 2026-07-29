import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/pravila-zakazivanja");

export default function PravilaZakazivanjaPage() {
  return (
    <LegalDocumentPage
      kind="booking_rules"
      eyebrow="Pravni tekst"
      fallbackTitle="Pravila zakazivanja"
    />
  );
}
