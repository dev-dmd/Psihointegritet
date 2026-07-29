import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/privatnost");

export default function PrivatnostPage() {
  return (
    <LegalDocumentPage
      kind="privacy_policy"
      eyebrow="Pravni tekst"
      fallbackTitle="Politika privatnosti"
    />
  );
}
