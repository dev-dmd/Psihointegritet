# CONTENT HEALTH RULES v0.1

**Status:** implemented R1.4.i static gate  
**Datum:** 2026-07-21  
**Povezano:** D-032, `CONTENT_GOVERNANCE_CONTRACT_v0.1.md`, `DISCOVERABILITY_CONTRACT_v0.1.md`

## 1. Svrha i granica

Content Health je statička, read-only provera sadržaja i discoverability izlaza. Radi nad TypeScript providerom, testovima i build artefaktima. Ne čuva nalaze u bazi, ne šalje notifikacije, ne prikazuje Control Center tab i ne menja sadržaj.

```ts
type ContentHealthSeverity = "info" | "warning" | "error";

type ContentHealthFinding = {
  ruleId: string;
  severity: ContentHealthSeverity;
  entityType: string;
  entityId: string;
  field?: string;
  message: string;
  recommendation: string;
};
```

## 2. Izvršavanje

Target komanda:

```bash
npm run content:check
```

Komanda:

1. učitava static content provider;
2. validira modele, gate-ove, public rute i discoverability izlaze;
3. štampa kratak, human-readable rezultat;
4. upisuje `content-health-report.json` kao CI/build artefakt;
5. vraća exit code `1` samo kada postoji najmanje jedan `error`.

`warning` i `info` ne ruše build, ali moraju biti vidljivi. JSON report nije produkcijska baza niti audit dokaz.

## 3. Izlazni format

```json
{
  "schemaVersion": "1",
  "generatedAt": "2026-07-21T12:00:00.000Z",
  "summary": { "info": 0, "warning": 1, "error": 0 },
  "findings": [
    {
      "ruleId": "DISC-004",
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

| Rule           | Severity | Provera                                                          | Preporuka                                               |
| -------------- | -------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| `MODEL-001`    | error    | nepoznat content type ili nedostaje `id`                         | koristiti registrovan model i stabilan ID               |
| `MODEL-002`    | error    | dupliran ID ili canonical slug                                   | razdvojiti identitete pre objave                        |
| `MODEL-003`    | error    | nedozvoljen template/section slot                                | koristiti odobren template registry                     |
| `LIMIT-001`    | error    | tekst prelazi character limit                                    | skratiti sadržaj, ne menjati font/layout                |
| `LIMIT-002`    | error    | više cards/FAQ/sections od dozvoljenog maksimuma                 | podeliti ili ukloniti sadržaj                           |
| `ASSET-001`    | error    | obavezni asset nedostaje                                         | dodati asset ili template fallback                      |
| `ASSET-002`    | warning  | nema poseban OG asset, postoji fallback                          | potvrditi fallback ili dodati asset                     |
| `ASSET-003`    | error    | smisleni image nema alt tekst                                    | dodati opisni alt                                       |
| `LIFE-001`     | error    | nepoznat/zaključen publication transition                        | koristiti lifecycle contract                            |
| `LIFE-002`     | error    | `published` bez potrebnog `approved` evidence                    | vratiti u review/draft i pribaviti odobrenja            |
| `LIFE-003`     | error    | archived sadržaj je u sitemap-u ili aktivnom CTA-u               | ukloniti ga iz javnog flow-a                            |
| `APP-001`      | error    | nedostaje obavezna approval capability                           | dodati requirement/evidence                             |
| `APP-002`      | error    | required evidence je `pending` ili `rejected` pri objavi         | završiti odgovarajući review                            |
| `APP-003`      | warning  | stručni sadržaj nema datum poslednje provere                     | dodati/revidirati review metadata u R3-ready contract-u |
| `CTA-001`      | error    | CTA action nije u registry-ju                                    | koristiti odobrenu action vrednost                      |
| `CTA-002`      | error    | CTA target ne postoji, nije published ili nije kompatibilan      | popraviti target/status                                 |
| `CTA-003`      | error    | slobodan URL ili lični podaci u query-ju                         | generisati URL kroz registry                            |
| `WIDGET-001`   | error    | widget nije dozvoljen u template slotu                           | ukloniti ili koristiti odobren placement                |
| `WIDGET-002`   | error    | editor podatak pokušava menjati workflow/mode widgeta            | zadržati samo `enabled` kontrolu                        |
| `BOOK-001`     | error    | `BookingMode: live` ili nepoznat mode                            | koristiti `request`, `slot_request` ili `disabled`      |
| `BOOK-002`     | error    | booking CTA za `disabled`/neaktivni target                       | isključiti CTA ili promeniti gate                       |
| `BOOK-003`     | warning  | `slot_request` nema obavezni disclaimer ključ                    | prikazati da izbor slota nije rezervacija               |
| `PUB-001`      | error    | aktivna usluga nema cenu/trajanje/format/terapeuta               | dopuniti poslovne i operativne podatke                  |
| `PUB-002`      | error    | aktivna prijava programa nema datum/voditelja/kapacitet/politike | ostaviti interest/announced stanje                      |
| `PUB-003`      | error    | PackageOffer/CompanyPlan aktivira purchase ili billing pre R5    | vratiti na informativni CTA                             |
| `DISC-001`     | error    | indexabilna stranica nema title/description                      | popuniti SEO podatke                                    |
| `DISC-002`     | error    | canonical je nevalidan, ne-self ili ima query parametre          | generisati canonical iz route registry-ja               |
| `DISC-003`     | error    | noindex/draft/private URL je u sitemap-u                         | isključiti iz sitemap filtera                           |
| `DISC-004`     | warning  | nedostaje poseban OG asset uz validan fallback                   | potvrditi ili dodati asset                              |
| `DISC-005`     | error    | preview/staging je indexabilan                                   | ispraviti robots/noindex environment policy             |
| `JSONLD-001`   | error    | JSON-LD ne odgovara vidljivom modelu                             | uskladiti generator i UI                                |
| `JSONLD-002`   | error    | Event bez stvarnog datuma/voditelja/kapaciteta                   | ukloniti Event markup                                   |
| `JSONLD-003`   | error    | LocalBusiness bez potvrđene adrese/podataka                      | sačekati potvrđene činjenice                            |
| `REDIRECT-001` | error    | slug promena nema redirect/archival odluku                       | dodati registry zapis                                   |
| `REDIRECT-002` | error    | redirect petlja, lanac ili eksterni target                       | normalizovati na jedan interni target                   |
| `ROUTE-001`    | error    | metadata/CTA referencira rutu koja ne postoji                    | popraviti route registry                                |

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
