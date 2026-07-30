# DISCOVERABILITY CONTRACT v0.1

**Status:** implemented R1.4.i static foundation  
**Datum:** 2026-07-21  
**Povezano:** D-028, D-029, D-032; `CONTENT_PUBLISH_GATES_v0.1.md`

## 1. Cilj

Discoverability je konzistentan javni izlaz iz content contract-a: metadata, canonical URL, sitemap, robots, structured data i redirecti moraju opisivati isti sadržaj koji korisnik vidi. Nije zaseban „SEO/GEO trik“ niti način da se sakrije neodobren sadržaj.

## 2. Javni discoverability zapis

```ts
type DiscoverabilityRecord = {
  route: string;
  canonicalPath: string;
  indexingPolicy: IndexingPolicy;
  title: string;
  description: string;
  ogImageAssetId?: string;
  jsonLdKinds: JsonLdKind[];
  breadcrumbItems?: BreadcrumbItem[];
};
```

`route` je kanonska javna putanja bez query parametara. `canonicalPath` je interna apsolutna putanja; produkcijski origin dolazi iz jednog environment izvora (`NEXT_PUBLIC_APP_URL`), nikad iz request header-a ili CMS slobodnog unosa.

## 3. Metadata i canonical pravila

- Svaka indexabilna stranica ima title, description i self-referencing canonical.
- Title/description poštuju limite iz Content Model Matrix-a i opisuju vidljiv sadržaj bez neproverenih stručnih ili poslovnih tvrdnji.
- Query parametri (`source`, `service`, `therapist`, UTM) ne proizvode novu canonical stranicu.
- Dinamički profili/usluge/programi grade canonical iz validnog published sluga.
- Nedostajući OG asset koristi sistemski fallback; ne ruši render stranice, ali Content Health prijavljuje finding.
- Internal, auth, staff, superadmin, preview i error rute imaju `noindex`; privatne podatke štiti autentifikacija, ne robots pravilo.

## 4. Indexing i sitemap pravila

Sitemap filter je jedna funkcija nad content providerom:

```ts
const isSitemapEligible = (page: PublicPage) =>
  page.publicationStatus === "published" &&
  page.indexingPolicy === "index" &&
  page.canonicalUrlIsValid &&
  page.routeIsPublic;
```

| Kategorija                                                        | Default indexing           | Sitemap                                           |
| ----------------------------------------------------------------- | -------------------------- | ------------------------------------------------- |
| objavljena informativna/public service/therapist/support stranica | `index` ako gate prolazi   | da                                                |
| objavljen program bez aktivne prijave                             | po eksplicitnoj policy     | samo ako canonical i javni sadržaj imaju vrednost |
| `/zakazi` i interaktivni koraci                                   | `noindex`                  | ne                                                |
| auth, nalog, radni prostor, superadmin                            | `noindex` + auth gde treba | ne                                                |
| draft/review/approved/archived sadržaj                            | `noindex`/nedostupan       | ne                                                |
| preview, qa i staging                                             | blokirano od indeksiranja  | ne                                                |
| URL sa query parametrima i filteri                                | canonical ka osnovnoj ruti | ne                                                |

Sitemap ne sme sadržati redirect, 404/410, noindex ili nekanonski URL. Jedan sadržaj daje najviše jedan sitemap URL.

## 5. Robots politika

Produkcija koristi `robots.ts` kao deo istog contract-a. Neprodukcijska okruženja ne smeju biti indeksirana i moraju imati konzervativnu robots politiku plus `noindex` response/metapodatke gde je moguće.

Robots nije bezbednosna kontrola. Interni sadržaj, paneli, preview i lični podaci moraju ostati iza odgovarajuće autentifikacije/autorizacije čak i kada su izostavljeni iz robots-a.

### Crawler policy koja zahteva posebnu odluku

OAI-SearchBot/GPTBot pravila nisu deo ovog zaključanog content contract-a. Konfiguracija mora imati eksplicitan, testabilan policy (`allow`/`disallow`) pre produkcije; ne sme nastati slučajno iz generičkog `robots.txt`. Do zasebne business odluke ne obećavamo ni Search indeksiranje ni korišćenje sadržaja za trening.

## 6. JSON-LD registry

Structured data se generiše iz istog public modela. Ne ubacuje se JSON-LD koji nema vidljiv ekvivalent na strani.

| Kind                       | Kada je dozvoljen                                                     | Zabranjeno bez dodatnog inputa                  |
| -------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- |
| `Organization` / `WebSite` | potvrđeno ime, domen i javni opis                                     | neprovereni telefon, adresa, pravni status      |
| `BreadcrumbList`           | hijerarhijska public ruta i vidljiv breadcrumb                        | auth/internal breadcrumb                        |
| `Person`                   | published profil terapeuta sa validnim javnim podacima                | neodobrene credentials/biografija               |
| `Service`                  | published usluga sa vidljivim nazivom/opisom/formatom                 | izmišljena cena, availability ili medical claim |
| `FAQPage`                  | FAQ je stvarno vidljiv na istoj strani                                | skriveni FAQ samo za markup                     |
| `Article`                  | R3 objavljen članak sa autorom/reviewerom i datumom                   | draft, AI-only ili bez review-a stručni tekst   |
| `Event`                    | stvaran program sa datumom, voditeljem, kapacitetom i javnim statusom | „uskoro“ najava bez datuma                      |
| `LocalBusiness`            | potvrđena javna adresa i odgovarajući poslovni podaci                 | Niš/Leskovac samo kao grad bez adrese           |

Svaki generator ima unit test koji proverava required fields i podudarnost sa renderovanim modelom. JSON-LD tehnička validnost nije obećanje rich-result prikaza.

## 7. Redirect registry

```ts
type RedirectRecord = {
  sourcePath: string;
  targetPath?: string;
  status: 301 | 308 | 404 | 410;
  reason: string;
};
```

Pravila:

- public slug promena čuva stari URL i šalje trajni redirect samo ka stvarnoj zameni;
- kada nema zamene, koristi se eksplicitna 404/410 odluka;
- source i target su interne normalizovane putanje;
- nema lanaca, petlji, targeta u redirectu niti podrazumevanog slanja na home;
- canonical i sitemap nikada ne koriste source redirect URL.

## 8. GEO i sadržaj za ljude

Za ovaj projekat GEO znači stabilne činjenice i jasne odnose: terapeut - usluga - oblast - format - potvrđena lokacija, uz stručni review tamo gde je potreban. Ne znači masovno pravljenje skoro istih stranica ili optimizovanje za nepostojeći score.

Objavljeni stručni sadržaj treba da ima jasan odgovor na pitanje korisnika, vidljivu strukturu, relevantan FAQ gde pomaže, autora/reviewera i datum pregleda kad se iznose stručne tvrdnje. Content Health može prijaviti nedostatak ovih signala, ali ne sme automatski menjati tekst.

## 9. Verifikacija i release gate

R1.4.i testovi moraju proveriti:

1. canonical stabilnost za statične i slug rute;
2. sitemap filter za svaki publication/indexing slučaj;
3. robots ponašanje po environment-u;
4. JSON-LD uslove i nedozvoljene kombinacije;
5. redirect validnost, petlje i chain-ove;
6. metadata/CTA targete koji vode na postojeće public rute;
7. da staging/preview i privatne rute ne postanu indexabilne.

Search Console, Rich Results Test i URL inspection su production-operativne provere nakon R1.5, ne zamena za lokalni CI gate.
