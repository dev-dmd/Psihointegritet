import { LegalDocumentPage } from "@/components/sections/legal/legal-document-page";
import { metadataForRoute } from "@/lib/content-governance/discoverability";

export const metadata = metadataForRoute("/kolacici");

export default function KolaciciPage() {
  return (
    <LegalDocumentPage
      kind="cookie_policy"
      eyebrow="Pravni tekst"
      fallbackTitle="Politika kolačića"
    />
  );
}
