import { JsonLd } from "psihointegritet-ds";

// JsonLd renders a <script type="application/ld+json"> for search-engine
// structured data — it has NO visible output by design. This is the real
// shape produced by jsonLdForRoute("/") in
// src/lib/content-governance/discoverability.ts for the homepage
// (Organization + WebSite + FAQPage nodes). An empty-looking render here is
// correct, not a bug: the component intentionally paints nothing.

const homepageJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Psihointegritet",
    url: "https://psihointegritet.rs/",
    description:
      "Centar za psihoterapiju i psihološku podršku u Nišu i Leskovcu — individualni rad, rad sa parovima i radionice, uživo i online.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Psihointegritet",
    url: "https://psihointegritet.rs/",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Da li je sve što kažem poverljivo?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Da. Sve informacije ostaju između klijenta i terapeuta, osim u situacijama propisanim zakonom i etičkim kodeksom.",
        },
      },
    ],
  },
];

export function HomepageStructuredData() {
  return <JsonLd data={homepageJsonLd} />;
}
