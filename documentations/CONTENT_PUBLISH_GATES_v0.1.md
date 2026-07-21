# CONTENT PUBLISH GATES v0.1

**Status:** implemented static gate input for R1.4.i  
**Datum:** 2026-07-21  
**Povezano:** D-029, D-030, D-031, D-033

## 1. Cilj

Publish gate sprečava da se javno objavi nepotpun, neodobren ili pogrešno aktiviran sadržaj. Nije dovoljno da tekst postoji: gate proverava status, template granice, approval evidence, CTA, availability, booking/registration i discoverability.

```ts
type PublishGateResult = {
  canApprove: boolean;
  canPublish: boolean;
  canActivate: boolean;
  findings: ContentHealthFinding[];
};
```

Gate je čista, read-only funkcija nad provider podacima. Ne menja status, ne piše audit zapis, ne šalje notifikaciju i ne radi automatsku popravku.

## 2. Status pravila

| Akcija                           | Preduslovi                                                        | Posledica                                                                       |
| -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `draft -> in_review`             | identitet, template i obavezna polja su validni                   | sadržaj čeka review                                                             |
| `in_review -> approved`          | sva potrebna approval evidence su `approved`; nema `error` nalaza | spreman za objavu, ali nije javan                                               |
| `approved -> published`          | `canPublish = true`                                               | javna verzija postaje dostupna                                                  |
| edit approved/published sadržaja | nova verzija prolazi field/template validaciju                    | nova verzija je `draft`; staro objavljeno ostaje javno tek u R3 revision modelu |
| `published -> archived`          | sitemap/CTA/redirect posledice rešene                             | van aktivnog sitemapa i flow-a                                                  |

`approved` nikada nije isto što i `published`. Statički R1.4.i provider može unapred uneti validan status/evidence, ali ne sme simulirati workflow ili audit.

## 3. Generički gate-ovi

Svi `published` entiteti moraju imati:

1. jedinstven `id` i validan `canonicalSlug`;
2. validan tip/template i sadržaj unutar dozvoljenih character/count limita;
3. `requiredApprovals` čije evidence nisu `pending` ni `rejected`;
4. SEO title, description i validan self-canonical;
5. `indexingPolicy` koji je eksplicitan;
6. sve CTA targete i interne linkove koji postoje i dozvoljeni su;
7. asset/reference podatke koji ne krše image/alt ugovor;
8. status kombinaciju koja nema kontradikciju, na primer `availabilityStatus: active` + `bookingMode: disabled` mora imati jasan informativni/interest razlog.

Sledeće je uvek `error`: nepoznat status, `BookingMode: live`, proizvoljan CTA URL, slug konflikt, objavljen sadržaj bez obaveznog odobrenja, `noindex` URL u sitemap-u, ili Event JSON-LD bez stvarnog događaja.

## 4. Gate po tipu sadržaja

| Tip               | Minimum za `published` informativno                                             | Dodatno za `active`/transakcioni CTA                                                                         | Approval                                                          |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `Service`         | naziv, opis, format, vezani terapeuti ili jasno objašnjenje, SEO/canonical      | cena, trajanje, najmanje jedan aktivan terapeut, validan `BookingMode`, booking/otkazivanje reference, CTA   | `business`; clinical kada sadržaj nosi stručnu tvrdnju            |
| `Therapist`       | ime, javna fotografija/fallback, neutralan naslov, areas/formats, SEO/canonical | booking CTA samo uz aktivnu vezu sa uslugom                                                                  | `clinical`, `business`                                            |
| `SupportArea`     | plain-language opis, povezani sadržaj, SEO/canonical                            | booking CTA samo preko validne usluge/terapeuta                                                              | clinical kada ima stručne tvrdnje                                 |
| `AudiencePage`    | jasna publika, dostupne/informativne opcije, SEO/canonical                      | maloletnički booking/consent tekst zahteva potvrđene politike                                                | `clinical`; `legal` + `business` za maloletnike                   |
| `Program`         | naslov, publika, format/status najave, SEO/canonical                            | aktivna prijava: datum, broj susreta, trajanje, kapacitet, cena, voditelj, registration/cancellation pravila | `business`; clinical po sadržaju; legal kad ima prijavne politike |
| `CompanyPlan`     | opis, privatnost zaposlenih, inquiry CTA, SEO/canonical                         | nema subscription/purchase CTA pre R5; javne finansijske tvrdnje moraju biti potvrđene                       | `business`                                                        |
| `PackageOffer`    | title, sessions, price, validity label, SEO reference gde se prikazuje          | samo `VIEW_PRICING`/booking informativni CTA; nema checkout/credit balance                                   | `business`                                                        |
| `FAQ`             | pitanje i odgovor u limitu, vidljivi na strani                                  | health/legal odgovor traži pripadajući review                                                                | zavisno od teme                                                   |
| `LegalPage`       | odobren tekst, verzija/datum, canonical/noindex politika                        | ne sme imati marketinški booking CTA                                                                         | `legal`, `business`                                               |
| `ResourceArticle` | author/reviewer, datum pregleda, izvori kada se iznose stručne tvrdnje          | download/access samo kroz kasniji R3 access contract                                                         | `clinical`; legal po potrebi                                      |

## 5. Availability i CTA ponašanje

| Availability + mode                  | Javni prikaz                               | Dozvoljeno                                             |
| ------------------------------------ | ------------------------------------------ | ------------------------------------------------------ |
| `active + request`                   | usluga je dostupna                         | request CTA                                            |
| `active + slot_request`              | slotovi su vidljivi kada R2 engine postoji | request nakon izbora slota; poruka da nije rezervacija |
| `active + disabled`                  | informativno aktivna usluga                | view/contact/interest, ne booking                      |
| `coming_soon + disabled`             | jasna oznaka „u pripremi“                  | view ili odobreni interest/waitlist                    |
| `temporarily_unavailable + disabled` | jasna nedostupnost                         | view, eventualno waitlist                              |
| `retired`                            | ne vodi novi korisnički flow               | redirect/archival politika                             |

Gate mora da spreči `BOOK_SERVICE`/`BOOK_THERAPIST` kada target nije `active` i u `request`/`slot_request` režimu. Prazna kartica ili kartica sa neaktivnim CTA-om nije prihvatljiva zamena za jasno stanje.

## 6. Programi i B2B nisu BookingMode

`BookingMode` je samo za individualne usluge. Program koristi odvojeni režim, na primer `interest`, `application` ili `disabled`; R1 ne uvodi aktivnu programsku prijavu bez svih gate podataka. B2B plan koristi `configurator`, `direct_inquiry` ili `disabled`; ne koristi pretplatu kao CMS status.

`CompanyPlan` i `PackageOffer` mogu biti objavljeni kao javni sadržaj, ali sledeći elementi su izričito blokirani do R5: purchase, ledger, subscription, payment provider, refund, invoice, coupon, company billing i financial reconciliation.

## 7. Discoverability gate

Pre ulaska u sitemap objavljena stranica mora zadovoljiti:

```text
publicationStatus === "published"
indexingPolicy === "index"
canonicalUrlIsValid === true
routeIsPublic === true
environmentIsProduction === true
```

`draft`, `in_review`, `approved`, `archived`, auth/panel rute, preview/staging, query-param varijante, matching rezultat i booking koraci se ne indeksiraju. Canonical, metadata i JSON-LD pravila detaljno su u `DISCOVERABILITY_CONTRACT_v0.1.md`.

## 8. Widget gate

Widget se može renderovati samo ako su istovremeno tačni:

1. registrovan je na tom template slotu;
2. `enabled === true`;
3. njegov sadržajni gate prolazi;
4. feature i sistemska implementacija postoje u trenutnom release-u.

Editor nema mogućnost da promeni workflow. Ako R2 Booking Engine nije implementiran, `slot_request` nema slot picker čak ni kada je content model validan; javni UI koristi postojeći request flow ili informativni prikaz.

## 9. Negativni primeri koje gate mora zaustaviti

- terapeut profil sa neodobrenim zvanjem;
- aktivna usluga bez cene ili trajanja;
- adolescent page sa aktivnim self-service CTA bez legal/clinical/business evidence;
- radionica sa „prijave otvorene“ bez datuma, voditelja, kapaciteta ili pravila;
- B2B plan koji obećava pretplatu ili fakturisanje pre R5;
- `slot_request` CTA koji piše „Rezervišite odmah“;
- promena objavljenog sluga bez redirect zapisa;
- canonical/meta podaci koji opisuju nešto što nije vidljivo na stranici.

## 10. R3 proširenje

R3 može dodati stvarne state transition komande, review queue, content accounts, audit evidence, revision diff/rollback i scheduled publishing. Ne sme ublažiti R1.4.i gate-ove niti dozvoliti direktno menjanje booking, privacy, CTA ili widget sistema bez nove odluke.
