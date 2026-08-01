# CONTENT HEALTH RULES v0.2

**Status:** implemented static + CMS gate
**Datum:** 2026-07-30
**Povezano:** D-032, `CONTENT_GOVERNANCE_CONTRACT_v0.1.md`, `DISCOVERABILITY_CONTRACT_v0.1.md`

> **v0.2 (D-044/CG-D4):** CMS Core nalaz dobija **additivna** polja `ruleVersion` i opciono `requiresApproval: clinical|legal|business` (nalaz koji reviziji dodaje obaveznu approval capability). Severity rečnik `info | warning | error`, postojeći prefiksi i pravila ostaju netaknuti; `block`/`review_required`/`passed` NISU severity vrednosti nego izvedene klase prikaza (BLOCK=`error`, REVIEW_REQUIRED=nalaz sa `requiresApproval`, PASSED=bez nalaza).
>
> **Dopuna (D-046/ADR-017, 2026-07-29):** dva nova prefiksa, aditivno preko svega gore — `RICH-0xx` (RichDoc kontrakt, CG-B7) i `IMPORT-0xx` (uvoz `.docx`, CG-B8). Isti severity rečnik, isti oblik nalaza; `RICH-0xx` findings nemaju `entityType`/`entityId` dok ih poziv ne postavi (revizija/slot to zna, sam RichDoc ne).

## 1. Svrha i granica

Content Health je read-only provera sadržaja i discoverability izlaza. TypeScript prolaz proverava spojeni javni provider (statički fallback + objavljeni CMS override), dok backend proverava tačnu sačuvanu CMS reviziju i autoritativno blokira approve/publish kada CMS-autorski podaci imaju `error`. Ne šalje notifikacije i ne menja sadržaj.

```ts
type ContentHealthSeverity = "info" | "warning" | "error";

type ContentHealthFinding = {
  ruleId: string;
  ruleVersion?: string;
  severity: ContentHealthSeverity;
  entityType: string;
  entityId: string;
  field?: string;
  message: string;
  recommendation: string;
  requiresApproval?: "clinical" | "legal" | "business";
};
```

## 2. Izvršavanje

Target komanda:

```bash
npm run content:check
```

Komanda:

1. učitava static content provider i objavljeni CMS read-model;
2. spaja CMS override polje-po-polje preko istog `CmsContentProvider` koji koristi javni sajt;
3. validira modele, gate-ove, public rute i discoverability izlaze;
4. štampa kratak, human-readable rezultat;
5. upisuje `content-health-report.json` kao CI/build artefakt;
6. vraća exit code `1` samo kada postoji najmanje jedan `error`.

`warning` i `info` ne ruše build, ali moraju biti vidljivi. JSON report nije produkcijska baza niti audit dokaz.

Ako CMS API nije dostupan ili vrati payload koji ne odgovara javnom ugovoru, namenski `npm run content:check` ne pada tiho na statički izvor nego prijavljuje grešku. Običan frontend unit-test prolaz ostaje determinističan nad statičkim providerom; stvarni CMS izvor uključuje se namenskom `content:check` komandom.

Backend endpoint `GET /api/v1/content/entries/{entryId}/revisions/{revisionId}/content-health` dostupan je samo `org_admin`/platformskom superadminu. On vraća sve nalaze, uključujući warning-only rezultat, verziju ruleseta i nedostajuća odobrenja. `approve` i `publish` ponovo računaju iste serverske nalaze; browser rezultat nije ulaz u odluku. Snapshot primenjenih pravila čuva se na reviziji tek pri uspešnom approve/publish koraku.

## 3. Izlazni format

```json
{
  "schemaVersion": "1",
  "generatedAt": "2026-07-21T12:00:00.000Z",
  "summary": { "info": 0, "warning": 1, "error": 0 },
  "findings": [
    {
      "ruleId": "DISC-004",
      "ruleVersion": "1",
      "severity": "warning",
      "entityType": "Service",
      "entityId": "individualna-psihoterapija",
      "field": "seo.ogImageAssetId",
      "message": "Nije definisan poseban OG asset.",
      "recommendation": "Koristiti potvrđeni fallback ili dodati asset u biblioteku."
    }
  ]
}
```

Nema imena klijenta, forme, intake odgovora, booking note-a ili drugog osetljivog sadržaja u reportu.

## 4. Rule catalogue

| Rule           | Severity      | Provera                                                                                          | Preporuka                                                                           |
| -------------- | ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `MODEL-001`    | error         | nepoznat content type ili nedostaje `id`                                                         | koristiti registrovan model i stabilan ID                                           |
| `MODEL-002`    | error         | dupliran ID ili canonical slug                                                                   | razdvojiti identitete pre objave                                                    |
| `MODEL-003`    | error         | nedozvoljen template/section slot                                                                | koristiti odobren template registry                                                 |
| `LIMIT-001`    | error         | tekst prelazi character limit                                                                    | skratiti sadržaj, ne menjati font/layout                                            |
| `LIMIT-002`    | error         | više cards/FAQ/sections od dozvoljenog maksimuma                                                 | podeliti ili ukloniti sadržaj                                                       |
| `ASSET-001`    | error         | obavezni asset nedostaje                                                                         | dodati asset ili template fallback                                                  |
| `ASSET-002`    | warning       | nema poseban OG asset, postoji fallback                                                          | potvrditi fallback ili dodati asset                                                 |
| `ASSET-003`    | error         | smisleni image nema alt tekst                                                                    | dodati opisni alt                                                                   |
| `LIFE-001`     | error         | nepoznat/zaključen publication transition                                                        | koristiti lifecycle contract                                                        |
| `LIFE-002`     | error         | `published` bez potrebnog `approved` evidence                                                    | vratiti u review/draft i pribaviti odobrenja                                        |
| `LIFE-003`     | error         | archived sadržaj je u sitemap-u ili aktivnom CTA-u                                               | ukloniti ga iz javnog flow-a                                                        |
| `APP-001`      | error         | nedostaje obavezna approval capability                                                           | dodati requirement/evidence                                                         |
| `APP-002`      | error         | required evidence je `pending` ili `rejected` pri objavi                                         | završiti odgovarajući review                                                        |
| `APP-003`      | warning       | stručni sadržaj nema datum poslednje provere                                                     | dodati/revidirati review metadata u R3-ready contract-u                             |
| `CTA-001`      | error         | CTA action nije u registry-ju                                                                    | koristiti odobrenu action vrednost                                                  |
| `CTA-002`      | error         | CTA target ne postoji, nije published ili nije kompatibilan                                      | popraviti target/status                                                             |
| `CTA-003`      | error         | slobodan URL ili lični podaci u query-ju                                                         | generisati URL kroz registry                                                        |
| `WIDGET-001`   | error         | widget nije dozvoljen u template slotu                                                           | ukloniti ili koristiti odobren placement                                            |
| `WIDGET-002`   | error         | editor podatak pokušava menjati workflow/mode widgeta                                            | zadržati samo `enabled` kontrolu                                                    |
| `BOOK-001`     | error         | `BookingMode: live` ili nepoznat mode                                                            | koristiti `request`, `slot_request` ili `disabled`                                  |
| `BOOK-002`     | error         | booking CTA za `disabled`/neaktivni target                                                       | isključiti CTA ili promeniti gate                                                   |
| `BOOK-003`     | warning       | `slot_request` nema obavezni disclaimer ključ                                                    | prikazati da izbor slota nije rezervacija                                           |
| `PUB-001`      | error         | aktivna usluga nema cenu/trajanje/format/terapeuta                                               | dopuniti poslovne i operativne podatke                                              |
| `PUB-002`      | error         | aktivna prijava programa nema datum/voditelja/kapacitet/politike                                 | ostaviti interest/announced stanje                                                  |
| `PUB-003`      | error         | PackageOffer/CompanyPlan aktivira purchase ili billing pre R5                                    | vratiti na informativni CTA                                                         |
| `DISC-001`     | error         | indexabilna stranica nema title/description                                                      | popuniti SEO podatke                                                                |
| `DISC-002`     | error         | canonical je nevalidan, ne-self ili ima query parametre                                          | generisati canonical iz route registry-ja                                           |
| `DISC-003`     | error         | noindex/draft/private URL je u sitemap-u                                                         | isključiti iz sitemap filtera                                                       |
| `DISC-004`     | warning       | nedostaje poseban OG asset uz validan fallback                                                   | potvrditi ili dodati asset                                                          |
| `DISC-005`     | error         | preview/staging je indexabilan                                                                   | ispraviti robots/noindex environment policy                                         |
| `JSONLD-001`   | error         | JSON-LD ne odgovara vidljivom modelu                                                             | uskladiti generator i UI                                                            |
| `JSONLD-002`   | error         | Event bez stvarnog datuma/voditelja/kapaciteta                                                   | ukloniti Event markup                                                               |
| `JSONLD-003`   | error         | LocalBusiness bez potvrđene adrese/podataka                                                      | sačekati potvrđene činjenice                                                        |
| `REDIRECT-001` | error         | slug promena nema redirect/archival odluku                                                       | dodati registry zapis                                                               |
| `REDIRECT-002` | error         | redirect petlja, lanac ili eksterni target                                                       | normalizovati na jedan interni target                                               |
| `ROUTE-001`    | error         | metadata/CTA referencira rutu koja ne postoji                                                    | popraviti route registry                                                            |
| `RICH-001`     | error/warning | nedozvoljen tip bloka za slot, ili neparsibilan blok, ili nepoznat tip (warning, forward-compat) | koristiti dozvoljene blokove; ažurirati validator ako je proširenje formata namerno |
| `RICH-002`     | error         | nedozvoljen/neparsibilan mark ili link bez `href`                                                | koristiti bold, italic, underline ili link                                          |
| `RICH-003`     | error         | link nije `https://`, `mailto:` ili interna ruta                                                 | ispraviti href                                                                      |
| `RICH-004`     | warning       | podvučen tekst izgleda kao URL                                                                   | pretvoriti u pravi link                                                             |
| `RICH-005`     | error         | broj blokova prelazi `maxBlocks` za slot                                                         | skratiti ili podeliti sekciju                                                       |
| `RICH-006`     | error         | dupliran `blockId`/`itemId`, ili blok bez id-ja                                                  | generisati nov, jedinstven id                                                       |
| `IMPORT-001`   | info          | sažetak uvoza (broj pasusa/naslova/listi/linkova)                                                | —                                                                                   |
| `IMPORT-002`   | info          | Word H1 spušten na H2 pri uvozu                                                                  | —                                                                                   |
| `IMPORT-003`   | warning       | tabela izbačena (RichDoc v1 ih ne podržava)                                                      | uneti podatke ručno kroz dozvoljene blokove                                         |
| `IMPORT-004`   | warning       | slika iz dokumenta nije preneta (nema alt tekst)                                                 | dodati sliku kroz galeriju sa alt tekstom                                           |
| `IMPORT-005`   | warning       | nepoznato formatiranje odbačeno pri uvozu                                                        | proveriti rezultat uvoza pre objave                                                 |

## 5. Pravila severity-ja

- **error:** javni sadržaj može biti netačan, nebezbedan, nefunkcionalan, neindeksabilan ili suprotan zaključanoj odluci. Blokira CI.
- **warning:** sadržaj je i dalje validan, ali ima kvalitetni rizik ili nedostaje preporučeni signal. Ne blokira CI.
- **info:** preporuka bez trenutnog rizika, na primer mogućnost da se doda bolji OG asset.

Severity se ne sme menjati samo da bi build postao zelen. Izuzetak zahteva product odluku ili promenu ugovora.

## 6. Testovi

Minimalni unit testovi moraju pokriti:

1. svih pet publication statusa i dozvoljene/nedozvoljene prelaze;
2. svaki `BookingMode`, uključujući zabranu `live`;
3. approval matrix za therapist, service price, minors i legal page;
4. character/count limite i template slots;
5. CTA action/target kombinacije;
6. sitemap i robots filtriranje;
7. canonical/redirect petlje i JSON-LD uslove;
8. izlaz CLI-ja i exit code ponašanje za info/warning/error.

## 7. Kasniji razvoj

R2 može prikazati poslednji CI/runtime nalaz kao read-only informaciju. Full Diagnostic Engine kasnije može dodati persistence, istoriju, incident workflow, notifikacije i eksplicitne repair akcije. Nijedna od tih funkcija ne pripada R1.4.i.
