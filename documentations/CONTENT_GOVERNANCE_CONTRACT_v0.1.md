# CONTENT GOVERNANCE CONTRACT v0.1

**Status:** implemented static foundation; R3 CMS provider pending  
**Datum:** 2026-07-21  
**Odluke:** D-028, D-029, D-030, D-031, D-032, D-033  
**Milestone:** R1.4.i - Content Governance & Discoverability Foundation

## 1. Svrha

Ovaj ugovor određuje kako javni sadržaj može da se menja bez narušavanja UI/UX-a, sigurnosnih pravila, navigacije, booking toka ili discoverability-ja. Trenutni TypeScript sadržaj iz `frontend/src/content/*` je izvor statičkog R1.4.i providera; R3 ga kasnije menja CMS providerom bez promene javnog korisničkog flow-a.

Ovo nije specifikacija CMS aplikacije. Ne uvodi bazu, FastAPI CMS CRUD, editor, korisničke role, audit log, stvarne revizije ni zakazanu objavu.

## 2. Granica R1.4.i

| U R1.4.i                                                        | Nije u R1.4.i                                                    |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| TypeScript modeli i statički provider                           | CMS baza i FastAPI CMS CRUD                                      |
| template/section/CTA/widget contract                            | Control Center editor                                            |
| publish/approval gate evaluatori                                | reviewer nalozi, permission mapping i audit log                  |
| metadata, canonical, JSON-LD, sitemap/robots, redirect contract | zakazana objava i revision persistence                           |
| Content Health CLI, testovi i CI gate                           | Content Health dashboard, istorija, notifikacije i repair akcije |
| javni `PackageOffer` i `CompanyPlan` opis                       | purchase, credits, subscription, payment, invoice ili refund     |

R2 je Booking Engine. R3 je Content Engine / CMS. R5 je finansijski domen.

## 3. Provider granica

Javni content domen ima jedan provider interfejs. Implementacija u R1.4.i je statička i već pokriva validaciju, Content Health i discoverability izlaze. Postojeće vizuelne javne komponente zadržavaju svoje proverene statičke import-e u ovom malom milestone-u; R3 ih prebacuje na CMS provider istog ugovora, bez menjanja korisničkog flow-a.

```ts
interface ContentProvider {
  getPageByRoute(route: string): Promise<PublicPage | null>;
  getEntity<T extends ContentEntity>(
    type: T["type"],
    id: string,
  ): Promise<T | null>;
  listPublished(input: PublishedListQuery): Promise<ContentEntity[]>;
  getRedirect(sourcePath: string): Promise<RedirectRecord | null>;
}
```

R3 komponente ne smeju direktno zavisiti od statičkog fajla, CMS SDK-a ili neograničenog rich-text/blok formata. Provider vraća već validiran model ili jasan `null`/finding; nikad delimično nebezbedan sadržaj.

## 4. Četiri nezavisne osi stanja

```ts
type PublicationStatus =
  "draft" | "in_review" | "approved" | "published" | "archived";

type AvailabilityStatus =
  "active" | "coming_soon" | "temporarily_unavailable" | "retired";

type IndexingPolicy = "index" | "noindex";

type BookingMode = "request" | "slot_request" | "disabled";
```

- `PublicationStatus` određuje da li je verzija javna.
- `AvailabilityStatus` određuje da li se usluga ili program stvarno nudi.
- `BookingMode` određuje samo tok za uslugu; radionice i B2B koriste sopstveni registration/inquiry mode.
- `IndexingPolicy` određuje pojavljivanje u pretrazi i sitemap-u.

Objavljena stranica može biti `coming_soon + disabled + index`; ne sme sama promeniti stanje u `active`, uključiti widget ili otvoriti kupovinu.

## 5. Publication lifecycle

| Status      | Značenje                                                  | Javno                        | Sitemap                             |
| ----------- | --------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| `draft`     | sadržaj se uređuje                                        | ne                           | ne                                  |
| `in_review` | čeka kliničku, pravnu ili poslovnu proveru                | ne                           | ne                                  |
| `approved`  | sve potrebne provere postoje, ali verzija nije objavljena | ne                           | ne                                  |
| `published` | aktivna javna verzija                                     | da                           | samo uz `index` i validan canonical |
| `archived`  | povučen sadržaj                                           | samo prema archival politici | ne                                  |

Dozvoljeni prelazi:

```text
draft -> in_review
in_review -> draft | approved
approved -> draft | published
published -> archived
archived -> draft
```

Svaka sadržajna izmena nakon `approved` ili `published` mora da postane nova `draft` revizija. U R1.4.i to je ugovorna semantika nad statičkim podacima; R3 čuva stare/publicirane revizije, review istoriju i `approvedAt`/`scheduledPublishAt`.

## 6. Approval capabilities

```ts
type ApprovalCapability = "clinical" | "legal" | "business";

type ApprovalRequirement = {
  capability: ApprovalCapability;
  required: boolean;
};

type ApprovalEvidence = {
  capability: ApprovalCapability;
  status: "pending" | "approved" | "rejected";
  approvedByLabel?: string;
  approvedAt?: string;
  note?: string;
};
```

Capability nije Clerk niti FastAPI role. R1.4.i može da čuva samo statički dokaz potreban publish validatoru. R3 kasnije povezuje capability sa stvarnim nalogom, dozvolom, workflow-om i audit zapisom.

Standardna pravila:

| Sadržaj                           | Obavezne capability-je          |
| --------------------------------- | ------------------------------- |
| profil terapeuta                  | `clinical`, `business`          |
| cena, trajanje, package offer     | `business`                      |
| pravila za maloletnike            | `clinical`, `legal`, `business` |
| privacy, uslovi i booking pravila | `legal`, `business`             |
| stručni članak                    | `clinical`                      |
| CompanyPlan opis                  | `business`                      |

## 7. CTA, widget i navigacioni integritet

CTA nije slobodan URL. Sadržaj bira labelu i dozvoljeni action/target, a sistem generiše putanju.

```ts
type CtaAction =
  | "START_MATCHING"
  | "BOOK_SERVICE"
  | "BOOK_THERAPIST"
  | "VIEW_SERVICE"
  | "VIEW_THERAPIST"
  | "VIEW_PROGRAM"
  | "JOIN_PROGRAM_WAITLIST"
  | "OPEN_COMPANY_CONFIGURATOR"
  | "VIEW_PRICING"
  | "GENERAL_CONTACT";

type CtaReference = {
  label: string;
  action: CtaAction;
  targetId?: string;
};
```

Primer: `{ label: "Zakaži termin", action: "BOOK_SERVICE", targetId: "individualna-psihoterapija" }` generiše validan `/zakazi?service=...` tok. Ne dozvoljava se proizvoljan eksterni URL, query sa ličnim podacima, aktivan CTA za `disabled` uslugu niti CTA koji vodi na nepostojeću rutu.

Widgeti imaju samo `enabled: boolean` u registrovanom placement-u. Nema podešavanja algoritma, polja, koraka, bezbednosnog copy-ja, booking mode-a, cilja CTA-a niti internog state machine-a kroz CMS. Kada je widget isključen, template prikazuje unapred definisan alternativni raspored.

## 8. Slugovi i redirecti

`canonicalSlug` je sistemsko polje. Promena objavljenog sluga zahteva validan jedinstven target, redirect registry zapis, novi canonical, ažuriran sitemap i proveru internih CTA/linkova.

- stvarna zamena sadržaja: trajni 301 ka zameni;
- povučen sadržaj bez zamene: eksplicitna 404 ili 410 politika;
- nikad automatski redirect na početnu;
- redirect ne sme imati petlju, lanac ili eksterni/open-redirect target.

## 9. Booking i finansijske granice

`BookingMode` nikada nema vrednost `live`. Za `request` i `slot_request` važi:

```text
Korisnički izbor -> AppointmentRequest -> pregled terapeuta
                 -> Confirmed Appointment ili AlternativeProposal
```

`slot_request` ne sme obećati rezervaciju. BDS-007A je odobren kratki interni, atomski contention hold samo za slanje zahteva; nije Appointment, potvrda ni korisniku vidljiva rezervacija. BDS-007B - da li `under_review` nakon uspešnog slanja privremeno uklanja slot iz javne ponude - ostaje Pre-R2 poslovno-operativna odluka i nije editor konfiguracija.

`PackageOffer` i `CompanyPlan` su opis javne ponude. R1.4.i/R3 ne uvode `PackagePurchase`, `CreditLedger`, `Payment`, `Refund`, `Subscription` ni `Invoice`; ti operativni modeli pripadaju R5.

## 10. Implementacioni kriterijumi

R1.4.i je završen kada:

1. postoje tipovi i static provider koji predstavljaju postojeći javni sadržaj;
2. template, limit, CTA, approval i status pravila imaju čiste validatore;
3. metadata/canonical/JSON-LD/sitemap/robots/redirect izlaz koristi isti contract;
4. `npm run content:check` daje machine-readable report i ruši CI za `error`;
5. budući CMS provider može zameniti static provider u validaciji i discoverability izlazima bez promene javnog UI toka; R3 zatim prebacuje i vizuelne komponente na isti ugovor.

Detalji po modelu su u `CONTENT_MODEL_MATRIX_v0.1.md`, a pravila objave u `CONTENT_PUBLISH_GATES_v0.1.md`.
