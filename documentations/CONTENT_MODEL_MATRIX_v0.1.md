# CONTENT MODEL MATRIX v0.1

**Status:** approved contract input for R1.4.i  
**Datum:** 2026-07-21  
**Povezano:** `CONTENT_GOVERNANCE_CONTRACT_v0.1.md`, D-028…D-033

## 1. Osnovni model

Svaki javni entitet ima stabilan identitet, status osi, approval zahteve, SEO podatke i kontrolisani template. Provider ne prihvata proizvoljan HTML, CSS, JavaScript ni neograničen page-builder JSON.

```ts
type ContentBase = {
  id: string;
  type: ContentType;
  canonicalSlug: string;
  publicationStatus: PublicationStatus;
  availabilityStatus?: AvailabilityStatus;
  indexingPolicy: IndexingPolicy;
  requiredApprovals: ApprovalRequirement[];
  approvalEvidence: ApprovalEvidence[];
  seo: SeoFields;
};

type SeoFields = {
  title: string;
  description: string;
  ogImageAssetId?: string;
};
```

## 2. Model matrix

| Model             | R1.4.i provider                  | Kontrolisani template         | Bitna ograničenja                                                    | Future owner                    |
| ----------------- | -------------------------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------- |
| `SiteSettings`    | postojeći `site-settings.ts`     | globalni facts                | nema slobodnog nav-a; samo potvrđeni kontakti/lokacije               | R3 settings                     |
| `StaticPage`      | postojeće javne stranice         | hero + odobreni section slots | jedna H1; nema arbitrarnih blokova                                   | R3 CMS                          |
| `Service`         | `services.ts`                    | service detail                | booking mode, price i trajanje imaju business gate                   | R3 CMS + R2 operational mapping |
| `SupportArea`     | `services.ts` / route content    | overview/detail               | nije dijagnoza; CTA samo registry action                             | R3 CMS                          |
| `Therapist`       | `therapists.ts`                  | profile                       | title/credentials traže clinical + business approval                 | R3 CMS                          |
| `AudiencePage`    | roditelji/adolescenti            | audience landing              | maloletnici traže clinical/legal/business kada pravila postanu javna | R3 CMS                          |
| `Program`         | `programs.ts`                    | program detail                | aktivna prijava tek uz datum/voditelja/kapacitet/politike            | R4 Program Engine               |
| `CompanyPlan`     | `company.ts`                     | B2B plan                      | opis ponude nije subscription/billing                                | R3 CMS, R4/R5 operativno        |
| `PackageOffer`    | `services.ts`                    | price/package strip           | samo informativna ponuda; nema checkout/credits                      | R3 CMS, R5 finance              |
| `FAQ`             | `homepage.ts` i page collections | FAQ slot                      | vidljiv sadržaj; bez health claims bez review-a                      | R3 CMS                          |
| `LegalPage`       | placeholder/rule contract        | legal template                | legal + business approval obavezni                                   | R3 CMS                          |
| `ResourceArticle` | nema objavljenih članaka u R1    | article template              | stručni review, izvori i author/reviewer metapodaci                  | R3 Content Engine               |

## 3. Character limits

Limiti su početni hard guard-ovi izvedeni iz sadašnjih komponenti i prostora koji layout već ima. Broje se normalizovani Unicode karakteri bez vodećih/završnih razmaka. Prelazak maksimuma je `error`; UI nikada ne sme automatski smanjivati font ili skrivati višak teksta da bi ga „progurao“.

| Polje                       | Maksimum | Napomena                                      |
| --------------------------- | -------: | --------------------------------------------- |
| navigation label            |       28 | header/footer ne smeju menjati širinu layouta |
| CTA label                   |       36 | action ostaje registry vrednost               |
| eyebrow                     |       40 | jedna kratka oznaka                           |
| page H1                     |       80 | jedna H1 po template-u                        |
| section H2                  |       90 | stabilan prelom na mobilnom                   |
| card title                  |       72 | uključuje program/plan kartice                |
| card description            |      220 | za standardne kartice                         |
| hero lead                   |      300 | bez drugog skrivenog pasusa                   |
| section intro               |      360 | pre dužeg sadržaja                            |
| rich paragraph              |    1,200 | template ograničava broj pasusa               |
| service description         |      260 | sadašnji katalog je kraći od limita           |
| therapist public title      |      120 | bez neproverenih credentials                  |
| therapist card excerpt      |      300 |                                               |
| therapist quote             |      320 |                                               |
| therapist bio paragraph     |      900 |                                               |
| therapist full bio          |    3,600 | zbir svih pasusa                              |
| FAQ question                |      160 |                                               |
| FAQ answer                  |      800 | bez rich-text layouta u accordion-u           |
| SEO title                   |       65 | fallback ne menja canonical naslov            |
| SEO description             |      170 |                                               |
| image alt                   |      150 | opisni, ne keyword lista                      |
| slug                        |       80 | lowercase latinica, brojevi i crtice          |
| redirect source/target path |      180 | samo interne apsolutne putanje                |

## 4. Template registry i section slots

Editor kasnije može menjati sadržaj u postojećem slotu ili dodati dozvoljeni ponovljivi item do maksimuma. Ne može menjati redosled nosivih sekcija, ubaciti novi tip sekcije, sakriti obavezni disclaimer ili napraviti nested cards.

| Template             | Fiksni slotovi                                                     | Opcioni slotovi i maksimum                                        |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `service_detail`     | hero, ključne činjenice, opis, prvi korak, related therapists, CTA | packages 0-1, FAQ 0-1 kolekcija sa 3-8 stavki                     |
| `therapist_profile`  | hero, pristup/quote, areas, formats/services, bio, CTA             | FAQ 0-1 sa 3-6 stavki, media 0-3                                  |
| `support_area`       | hero, plain-language intro, povezane usluge/terapeuti, CTA         | FAQ 0-1 sa 3-6 stavki                                             |
| `audience_page`      | hero, komu je namenjeno, prvi korak, relevantne usluge, CTA        | program cards 0-6, FAQ 0-1 sa 3-8 stavki                          |
| `program_detail`     | hero, činjenice, kome je namenjen, format, status                  | facilitator 0-3, FAQ 0-1; registration widget samo kad gate prođe |
| `company_page`       | hero, support types, plan cards, privacy, configurator CTA         | plan cards 1-4, FAQ 0-1 sa 3-8 stavki                             |
| `pricing_page`       | service prices, package offers, notice, CTA                        | program/CompanyPlan references 0-8                                |
| `static_information` | hero, intro, prose sections, CTA                                   | 1-6 prose sections, FAQ 0-1                                       |
| `legal_page`         | title, approved legal copy, version/date                           | nema marketinški CTA; links only                                  |
| `article` (R3)       | hero, author/reviewer strip, lead, body, sources                   | approved block registry only                                      |

Za sve cards/grid slotove važi jedan nivo kartice: kartica ne sadrži drugu vizuelnu karticu. Prazan optional slot se ne renderuje; ne ostavlja razmak niti placeholder na javnoj strani.

## 5. Image i asset ugovor

- Asset se bira iz odobrene biblioteke/referencira stabilnim `assetId`; ne čuva se proizvoljan URL.
- Slika ima obavezan `alt`, osim kada je eksplicitno dekorativna (`alt: ""`).
- Fotografija terapeuta je vezana za pravi profil; stock portret pod realnim imenom nije dozvoljen.
- Aspect ratio i crop preset bira template, ne editor. Editor bira asset, ne CSS pozicioniranje.
- Obavezni fallback za nedostajući asset je definisan komponentom, a Content Health prijavljuje problem.

## 6. CTA registry

| Action                      | Potreban target          | R1.4.i pravilo                                     |
| --------------------------- | ------------------------ | -------------------------------------------------- |
| `START_MATCHING`            | ne                       | vodi na kanonski guided flow                       |
| `BOOK_SERVICE`              | `Service.id`             | dozvoljen samo uz aktivan `request`/`slot_request` |
| `BOOK_THERAPIST`            | `Therapist.id`           | koristi kanonski therapist parametar               |
| `VIEW_SERVICE`              | `Service.id`             | samo published target                              |
| `VIEW_THERAPIST`            | `Therapist.id`           | samo published target                              |
| `VIEW_PROGRAM`              | `Program.id`             | samo published target                              |
| `JOIN_PROGRAM_WAITLIST`     | `Program.id`             | interest flow, ne registration/purchase            |
| `OPEN_COMPANY_CONFIGURATOR` | opcioni `CompanyPlan.id` | bez billing značenja                               |
| `VIEW_PRICING`              | ne                       | kanonska `/cene` ruta                              |
| `GENERAL_CONTACT`           | ne                       | kanonska kontakt ruta                              |

## 7. Widget registry

| Widget                 | Dozvoljen placement                | Jedina promenljiva u sadržaju  | Zabranjeno menjanje                        |
| ---------------------- | ---------------------------------- | ------------------------------ | ------------------------------------------ |
| `matching`             | hero/guide CTA slot                | `enabled`                      | pitanja, težine, routing, safety copy      |
| `booking`              | service/therapist/booking template | `enabled` kada gate to dozvoli | koraci, mode, consent, destinacija         |
| `company_configurator` | company page                       | `enabled`                      | pitanja, preporuka, pricing/billing logika |
| `program_interest`     | program page                       | `enabled`                      | prijavni workflow i capacity pravila       |
| `research_survey`      | odobreni survey trigger            | `enabled`                      | survey pitanja, retention, endpoint        |

Kada je widget `disabled`, template bira unapred definisan alternativni CTA ili ništa. Ne prikazuje se administrativni kontrolni element na javnoj strani.

## 8. Budući CMS mapping

R3 CMS može proširiti model sa `revisionId`, `createdBy`, `updatedBy`, `publishedAt`, audit podacima i scheduling poljima, ali ne sme menjati javne field name-ove, CTA registry, template registry niti ograničenja bez nove product odluke.
