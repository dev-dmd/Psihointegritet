# CMS Core + Content Governance — Plan faze v0.1

**Status:** aktivan plan sledeće izrade
**Datum:** 2026-07-26 · **Vlasnik:** Milan Dražić (CTO)
**Odluke:** D-043 (redosled i obim) · D-044 (rečnik i pravila) · D-045 (nepromenljivost objavljenog) · ADR-016 (otvaranje `modules/content`)
**Gde se uklapa:** pre-R3 slice unutar MVP-a, pre R2 Booking Engine-a. Pun Content Engine (članci, biblioteka, zakazana objava, AI) ostaje R3.

---

## 0. Zašto

D-038 je pretvorio CMS u preduslov launcha: postojeći tekst je fallback, tim ga nadjačava kroz panel. Bez editora tim ne može da unese kontakt, pravne tekstove, ispravke profila ni tekstove saglasnosti koji otvaraju Intake gate (D-039). Booking izgrađen pre stabilnog sadržaja zavisio bi od ručno menjanih TypeScript fajlova i promenljivih slugova.

**Cilj:** kontrolisani sistem objavljivanja stručnog sadržaja — ne običan editor teksta. Svaka objava prolazi automatsku proveru (ista pravila kao CI), stručni pregled po capability-ju i backend autoritet, sa trajnim auditom.

## 1. Zaključan rečnik (D-044 — ne otvarati ponovo)

- **Statusi (D-029):** `draft → in_review → approved → published → archived`; povraci `in_review→draft`, `approved→draft`, `archived→draft`. Izmena posle odobrenja = nova draft revizija bez odobrenja.
- **Severity (D-032):** `info | warning | error`. Izvedene klase: BLOCK=`error` · REVIEW_REQUIRED=nalaz sa `requiresApproval` capability · WARNING=`warning` · PASSED=bez nalaza.
- **Redosled provere:** sadržaj → tranzicija → odobrenja, identičan u UI-ju i backendu.
- **Nepromenljivost (D-045):** objavljena revizija se ne briše — samo arhivira; draft se briše slobodno.
- **Autoritet:** backend odlučuje o objavi; frontend ista pravila samo kao trenutni prikaz.
- **Obim:** 6 tipova iz R1.4.i (`static_page`, `service`, `therapist`, `program`, `company_plan`, `package_offer`). `article` i resursi = R3.

## 2. Šta se ponovo koristi (ne pisati iznova)

| Postoji | Gde | Uloga u CMS-u |
| --- | --- | --- |
| `ContentProvider` interface + `ContentEntity` modeli | `frontend/src/lib/content-governance/types.ts` | CMS provider implementira ISTI interface; tipovi se ne menjaju (matrix §8) |
| `validateEntity`, `evaluatePublishGate`, `isValidPublicationTransition` | `lib/content-governance/validation.ts` | Čiste funkcije — rade i u browseru: editor prikazuje ISTA pravila kao CI |
| `staticContentProvider` | `lib/content-governance/static-provider.ts` | Postaje fallback sloj ispod CMS providera (D-038) |
| `templateRegistry`, `contentCharacterLimits` | `lib/content-governance/limits.ts` | Ograničenja editora po template-u/slotu |
| Registar dokumenata: modeli + pravila | `backend/modules/privacy/{models,publication}.py` | Šablon za `modules/content` (identitet + revizija + event; parcijalni unique za jednu objavljenu) |
| Editor obrazac | `features/workspace/components/screen-dokumenti.tsx` + `legal-documents.ts` | UI obrazac za CMS ekrane (checkPublishable→PublishBlock→describePublishBlock) |
| Panel greške | `features/workspace/panel-errors.tsx` + `components/panel/error-banner.tsx` | Proširuje se strukturisanim ključem (D-044) |
| Auth | `lib/auth/guards.ts` (requireOrgAdmin) · backend Clerk JWT + membership (`modules/guidance/authorization.py`) | Isti pristup za content router |

## 3. Faze

### Faza 0 — Dokumentacija ✅ (2026-07-26)

D-043/D-044/D-045 u `PRODUCT_DECISIONS.md` · ADR-016 · O-21 (Kompas) · ovaj plan · TODO ažuriran.

### Faza A — Zaštite na registru dokumenata (pre CMS koda)

| ID | Zadatak | Fajlovi |
| --- | --- | --- |
| CG-A1 | **Archive-only za objavljeno** (D-045): ukloniti brisanje objavljenog iz UI-ja (dugme postaje „Arhiviraj"), guard `require_deletable` u `publication.py`, testovi na obe strane | `screen-dokumenti.tsx`, `legal-documents.ts`, `publication.py` + oba test fajla |
| CG-A2 | **Parity fixtures TS ↔ Python** (tranzicije, matrice odobrenja, publish scenariji sa redosledom provere); ispraviti drift „Product"→„Business" u docstring-u `publication.py` | `contracts/fixtures/legal-publication.v1.json` — jedini fizički fajl, bez kopije/symlink-a (vidi A.5) |
| CG-A3 | **Strukturisani panel-error ključ** (D-044): `PanelError` dobija opciono `resource { organizationId, resourceType, resourceId, revisionId, ruleId, fieldPath }`; upsert po tom ključu kad postoji (href+title ostaje fallback); uspešna ponovna provera čisti greške tog resursa/revizije, ne celog taba | `panel-errors.tsx` + test |

> **2026-07-26 dopuna:** Faza A zaključava samo zaštitne ugovore koji moraju važiti pre `modules/content` implementacije. Ne zaključava modele, API, editor ni renderer iz Faza B–D — to ostaje njihov posao. Šest ugovora ispod rešavaju nejasnoće koje bi inače ostale otvorene usred koda: šta se tačno briše, šta rade povratne D-029 tranzicije nad nepromenljivom revizijom, kako se severity/approval/gate ose sabiraju, redosled i prekid provere, gde živi jedini parity fixture, i ispravku `versionId`→`revisionId` u CG-A3 (rezervisano ime iz `CONTENT_MODEL_MATRIX_v0.1.md` §8).

#### Zaključani ugovori Faze A

##### A.1 Brisanje, arhiviranje i istorija

Hard delete nije lifecycle status niti zamena za D-029 tranziciju.

- Hard delete je dozvoljen samo nad `draft` revizijom.
- Hard delete uklanja samo konkretnu draft reviziju.
- `ContentEntry` (odn. `LegalDocument` u registru dokumenata) se uklanja samo ako nema drugih revizija, review odluka, publication događaja ni istorije objavljivanja.
- `in_review` i `approved` revizije ne mogu se direktno obrisati — prvo moraju proći dozvoljeni D-029 povratak u `draft`.
- Postojeće review odluke i audit događaji se ne brišu kaskadno.
- `published` i `archived` revizije se nikada fizički ne brišu.
- Akcija „Obriši" za objavljenu reviziju postaje „Arhiviraj" — i u UI-ju i kao jedina dozvoljena backend tranzicija.
- Backend `require_deletable` je autoritet; skrivanje dugmeta u UI-ju nije zaštita.
- Arhiviranje uklanja reviziju iz aktivnog javnog prikaza.
- Ako se arhivira dokument potreban za Intake, `intake_submission_ready` postaje `false` čim više ne postoji odgovarajuća aktivna objavljena verzija te vrste dokumenta.
- Slug koji je pripadao objavljenom ili arhiviranom pravnom dokumentu ostaje rezervisan u okviru organizacije.
- Slug obrisanog drafta koji nikada nije bio objavljen može ponovo da se koristi.

##### A.2 Značenje povratnih D-029 tranzicija

D-029 statusi se ne menjaju; ovde se zaključava samo njihova **revizijska semantika**, da bi se rešio prividni sukob između `archived → draft` i D-045 nepromenljivosti:

- `in_review → draft` vraća radnu reviziju na doradu i uklanja njenu spremnost za review; ista revizija, isti `revisionId`.
- `approved → draft` ne menja odobrenu reviziju — kreira **novu** draft reviziju bez prenetih odobrenja.
- `published → archived` menja dostupnost, ali ne sadržaj objavljene revizije.
- `archived → draft` **ne otvara arhiviranu reviziju za izmenu** — kreira novu draft reviziju kopiranjem dozvoljenih sadržajnih polja iz arhivirane.
- Svaka nova draft revizija (od `approved→draft` ili `archived→draft`) dobija **novi** `revisionId`.
- Odobrenja (`approvals`/`ContentReviewDecision`) su uvek vezana za tačan `revisionId` i nikada se automatski ne prenose na novu reviziju.

##### A.3 Severity, approval i gate rezultat

Severity i potreba za odobrenjem su dve nezavisne ose:

```text
blocking = severity == "error"
approvalRequired = requiresApproval != null
approvalMissing =
  approvalRequired &&
  nema važeće odluke traženog capability-ja za revisionId

publishAllowed =
  nema blocking nalaza &&
  tranzicija je dozvoljena &&
  nema approvalMissing
```

- `error` uvek blokira objavu.
- Odobrenje ne može da nadjača `error`.
- `warning` i `info` sami po sebi ne blokiraju.
- `warning` ili `info` sa `requiresApproval` čekaju odgovarajuće odobrenje pre objave.
- PASSED znači odsustvo nalaza i **ne čuva se** kao severity vrednost ni kao DB zapis.
- REVIEW_REQUIRED je izvedeni UI prikaz nalaza sa `requiresApproval`, ne lifecycle status.

##### A.4 Redosled i prekid provere

Evaluator radi po etapama: **sadržaj → tranzicija → odobrenja** (već zaključano u D-044; ovde se formalizuje prekid):

1. validacija sadržaja;
2. validacija tražene tranzicije;
3. provera obaveznih odobrenja.

- Ako etapa sadržaja vrati `error`, tranzicija i odobrenja se ne proveravaju.
- `warning` i `info` ne prekidaju prelazak na sledeću etapu.
- Ako tranzicija nije dozvoljena, odobrenja se ne proveravaju.
- Dinamički `requiresApproval` nalazi prikupljeni tokom validacije sadržaja **dodaju se** osnovnoj matrici obaveznih odobrenja (ne je zamenjuju).
- Rezultat svake etape ima deterministički redosled.
- UI i backend moraju vratiti **istu prvu blokirajuću etapu** za isti ulaz.

Ovim je formalizovana odluka da admin prvo vidi „sadržaj je prazan", umesto liste potpisa koji još nedostaju.

##### A.5 Jedan parity fixture ugovor

Ne koristiti kopiju ili symlink između frontend i backend foldera. Jedini izvor je u korenu repozitorijuma:

```text
contracts/fixtures/legal-publication.v1.json
```

Vitest i pytest čitaju isti fizički fajl (ne kopiju). Fixture sadrži niz slučajeva sa poljima:

```text
fixtureSchemaVersion
caseId
description
input
expectedStage
expectedFindings[]            (ruleId, ruleVersion, severity, requiresApproval, remediation, fieldPath)
expectedRequiredCapabilities[]
expectedTransitionAllowed
expectedPublishAllowed
```

Fixture-i moraju obuhvatiti najmanje:

- celu D-029 transition matricu, uključujući sve dozvoljene i zabranjene parove;
- prazan sadržaj;
- sadržaj sa `info`, `warning` i `error` nalazima;
- statička odobrenja;
- dinamička `requiresApproval` odobrenja;
- odobrenje za pogrešan `revisionId`;
- kombinaciju praznog sadržaja, pogrešne tranzicije i nedostajućih odobrenja;
- pokušaj brisanja `draft`, `published` i `archived` revizije;
- arhiviranje dokumenta potrebnog za Intake gate.

Svako odstupanje TS i Python rezultata za isti `caseId` obara CI.

##### A.6 Strukturisani PanelError identitet

CG-A3 se ispravlja: `versionId` → `revisionId` (rezervisano ime iz `CONTENT_MODEL_MATRIX_v0.1.md` §8, isto ime kao u A.2/A.5).

```ts
type PanelErrorResource = {
  organizationId: string;
  resourceType: string;
  resourceId: string;
  revisionId?: string;
  ruleId?: string;
  fieldPath?: string;
};
```

`fieldPath` je potreban jer isto pravilo kasnije može proizvesti nalaz u više CMS slotova.

Identitet greške se računa iz strukturisanog tuple-a: `organizationId + resourceType + resourceId + revisionId + ruleId + fieldPath`.

- Isti ključ radi upsert.
- Različit `revisionId` ne pregazi nalaz druge revizije.
- Različit `fieldPath` ne pregazi drugi nalaz istog pravila.
- Uspešna ponovna provera uklanja aktivne validacione greške samo za isti resource/revision — ne čisti sve greške taba.
- `href + title` ostaje fallback ključ samo za greške bez strukturisanog resursa (npr. transition-error poruke koje ne nose `ruleId`).
- `PanelError` je privremeno UI stanje, ne audit evidencija niti izvor istine — backend validation rezultat ostaje autoritativan.
- Postojeća sidebar i screen-reader pravila (tanki `border-danger/80`, `sr-only` „(ima grešku)") se ne menjaju.

##### Šta Faza A ne zaključava

- SQL kolone i indekse modela — Faza B.
- FastAPI rute i payload-e — Faza B.
- Strukturu template-slot JSON-a — Faza B/C.
- Izgled CMS editora — Faza C.
- Način resolver cache-a i svih ~18 renderer call-site-ova — Faza D.
- Sitemap implementaciju — Faza D.
- Kompas — O-21.
- Članke, biblioteku, medije ili AI — R3.

Kada su ovih šest ugovora upisani, Faza A je dokumentaciono zatvorena i CG-A1–A3 mogu da se implementiraju bez donošenja novih poslovnih ili arhitektonskih odluka usred koda.

### Faza B — Backend CMS Core (`modules/content`)

| ID | Zadatak | Napomena |
| --- | --- | --- |
| CG-B1 | Modeli: `ContentEntry` (org+type+slug identitet; slug jedinstven po org+locale) · `ContentRevision` (polja sadržaja po template slotovima kao JSON, approvals, validation snapshot sa `ruleVersion`-ima, `version_label`; parcijalni unique = jedna objavljena po entry-ju) · `ContentReviewDecision` (capability odluka vezana za reviziju) · `ContentPublicationEvent` (append-only audit) | Šablon: `privacy/models.py`. Rezervisana imena polja iz matrix §8 |
| CG-B2 | `publication.py` za content: D-029 mapa + matrica odobrenja po tipu iz `CONTENT_GOVERNANCE_CONTRACT` §6 + **dinamički dodata odobrenja iz nalaza** (`requiresApproval`) + redosled provere + `require_deletable` | Čist modul bez DB, kao privacy |
| CG-B3 | Optimistic locking: `ContentRevision.lock_version`; konkurentna izmena → 409 conflict | Objava + event transakciono |
| CG-B4 | Router (org_admin preko Clerk JWT + membership) + schemas: CRUD entry/revision, transition, review, publish, archive | Obrazac: `guidance/router.py` team_router |
| CG-B5 | Alembic migracija **napisana ali se primenjuje uz LD-5** kad stignu Clerk nalozi (jedna kombinovana privacy+content) | Do tada dev-instanca (marija nalog) ili in-memory |
| CG-B6 | Unit testovi bez DB (životni ciklus, matrice, redosled, archive-only, dinamička odobrenja) + parity fixtures iz CG-A2 prošireni za content | — |

### Faza C — Frontend CMS editor (Control Center)

| ID | Zadatak | Napomena |
| --- | --- | --- |
| CG-C1 | Tab „Sadržaj" u radnom prostoru: lista po tipu → editor revizije po template slotovima (limiti iz `limits.ts` — limit je error, ne promena layouta) | Obrazac: `screen-dokumenti.tsx`; nav + typedRoutes (`npx next typegen`) |
| CG-C2 | **Živa validacija istim evaluatorima** (`validateEntity`/`evaluatePublishGate` u browseru): nalazi po polju/sekciji sa objašnjenjem i predlogom ispravke; klase BLOCK/REVIEW_REQUIRED/WARNING/PASSED kao prikaz | Nema drugog rule engine-a |
| CG-C3 | Field-level override sa vidljivim fallbackom (D-038): prazno polje prikazuje fallback vrednost iz koda, jasno označenu | `content/*.ts` ostaju netaknuti |
| CG-C4 | Review/approve tok po capability-ju + publish; neuspeh → `usePanelErrors` sa strukturisanim ključem; **prvo in-memory seed pa API** (isti put kao registar dokumenata) | describePublishBlock stil objašnjenja |

### Faza D — Javni renderer

| ID | Zadatak | Napomena |
| --- | --- | --- |
| CG-D1 | `getContentProvider()` resolver umesto direktnog singletona (~18 mesta + `discoverability.ts` hard-wire; `metadataForRoute` ne sme više da baca na promašaj — fallback na statički) | Najrizičniji korak — raditi izolovano |
| CG-D2 | `CmsContentProvider`: objavljena revizija nadjačava statički entitet polje-po-polje; bez objave → čist statički | `listPublished()` prestaje biti prazan → **sitemap/robots se menjaju namerno**; test koji to tvrdi |
| CG-D3 | Cache invalidacija posle objave/arhiviranja (`revalidatePath`/`revalidateTag`) + staff preview draft revizije | — |
| CG-D4 | `content:check` obuhvata i CMS izvor; `ContentHealthFinding` dobija `ruleVersion` (+ `requiresApproval`) — `CONTENT_HEALTH_RULES` → v0.2 additivno | CI gate ostaje isti |

### Faza E — Odloženo (posle CMS-a, redosled D-043)

Clerk nalozi (O-17/O-18) → primena migracija (LD-5 + CG-B5) → LD-6 (`intake_submission_ready` iz baze) → LD-7 (legal router + generated client) + CG API wiring → **ADR-015** → R2 Booking Engine → Kompas (tek posle O-21 definicije).

## 4. Rizici

1. **Provider swap (CG-D1):** 18 call-site-ova + hard-wire u discoverability — menjati kroz resolver u jednom PR-u, bez menjanja `ContentProvider` interfejsa.
2. **Sitemap flip:** prva objava menja javni SEO izlaz — namerno, ali mora imati eksplicitan test i D-038 approval evidence (privremeni CTO potpis dok nema pravih reviewer naloga).
3. **Migracija čeka Clerk:** modeli i testovi idu sada; primena kasnije — ne vezivati UI za bazu pre toga (in-memory kao registar dokumenata).
4. **Tri kopije lifecycle mape** (validation.ts, legal-documents.ts, publication.py) + četvrta u content — parity fixtures (CG-A2, ugovor A.5) su obavezni čuvar, ne opcija.
5. **Arhiviranje obaveznog Intake dokumenta** menja `intake_submission_ready` na `false` (ugovor A.1) — ako se ovo desi neopaženo u produkciji, Intake gate se tiho zatvara. Test za ovaj slučaj je obavezan deo CG-A1 i naveden u A.5 fixture listi.

## 5. Gates po fazi

Frontend: `npx tsc --noEmit` · `npx eslint src --max-warnings=0` · `npx vitest run` · `npx next build` · `npm run content:check`. Backend: `uv run ruff check` · `uv run ruff format --check` · `uv run pyright` · `uv run pytest`. Novi workspace tab: e2e auth test (redirect za neulogovane) po obrascu postojećih.

## 6. Definition of Done

1. Tim kroz panel menja sadržaj svih 6 tipova; prazno polje = fallback iz koda; fallback nikad obrisan.
2. Objava nemoguća bez: potpunog sadržaja → dozvoljene tranzicije → svih odobrenja (uklj. dinamička iz nalaza) — istim redosledom na obe strane, dokazano parity fixtures.
3. Objavljena revizija nepromenljiva i neizbrisiva; izmena = nova draft revizija bez odobrenja; audit event za svaku promenu statusa.
4. Neuspela objava nikad ne obara aplikaciju — objašnjena greška u panelu (Pregled + tab + sidebar signal) sa tačnim uzrokom.
5. Javni sajt renderuje objavljeno iz CMS-a, fallback inače; sitemap/robots odražavaju samo objavljeno; CI `content:check` zelen.
6. `validation_failed` i `review_required` ne postoje kao statusi nigde u kodu.
