# CMS TODO — detaljni zadaci za CMS Core + Content Governance

**Autoritet:** `CMS_CORE_CONTENT_GOVERNANCE_PLAN_v0.1.md` (odluke, ugovori A.1–A.6, DoD) · D-043/D-044/D-045 · ADR-016
**Odnos prema `TODO.md` §5D:** `TODO.md` prati samo krupne milestone-e (CG-A1…CG-D4, jedan red po zadatku). Ovaj fajl razbija svaki od njih na konkretne pod-zadatke sa fajlovima, funkcijama i test slučajevima. Kad ceo CG-X milestone ovde ima sve kućice ✅, prebaci status na ⬜→✅ u `TODO.md` — ne pre toga.
**Pravilo:** ne raditi Fazu B/C/D pre nego što CG-A1–A3 ovde budu 100% zatvoreni (Faza A zaključava ugovore koje sve kasnije faze pretpostavljaju).

---

## Guardrails (važi kroz sve faze, ne samo jednom)

- [ ] Nijedan status van D-029 pet stanja se ne uvodi nigde (`validation_failed`, `review_required` kao status su zabranjeni — D-044).
- [ ] Nijedna severity vrednost van `info | warning | error` se ne uvodi (D-032).
- [ ] Redosled provere je uvek sadržaj → tranzicija → odobrenja, isti u UI-ju i backendu (A.4).
- [ ] Backend je jedini autoritet objave; frontend pravila su uvek samo trenutni prikaz, nikad jedina provera.
- [ ] Objavljena i arhivirana revizija se nikad fizički ne brišu (A.1).
- [ ] Ne pisati pravni/klinički tekst umesto Anje/tima — CMS nosi strukturu i pravila, ne sadržaj.
- [ ] Fallback sadržaj (`content/*.ts`) se nikad ne briše niti prepravlja da bi CMS "radio" — samo se nadjačava po polju (D-038).

---

## Faza A — Zaštite (mora biti gotovo pre bilo kog `modules/content` koda)

### CG-A1 — Archive-only za objavljene dokumente

**Backend (`backend/src/psihointegritet/modules/privacy/publication.py`)**
- [x] Nova greška `CannotDeleteRevisionError(ValueError)`.
- [x] Nova funkcija `require_deletable(status: RevisionStatus) -> None` — prolazi samo za `DRAFT`, inače baca `CannotDeleteRevisionError` sa porukom koja imenuje trenutni status.
- [x] Test: `draft` prolazi; `in_review`/`approved`/`published`/`archived` bacaju grešku (5 test case-ova, jedan po statusu).

**Frontend model — VAŽAN NALAZ, popraviti pre ostatka CG-A1**
- [x] Trenutni `LegalDocument` u `legal-documents.ts` je **ravan objekat** — nema odvojenog `documentId` i `revisionId`. `advance(document, "draft")` u `screen-dokumenti.tsx` samo menja `versionLabel` na istom `id`-ju. Ovo krši A.2 („svaka nova draft revizija dobija novi `revisionId`") i blokira A.6 (`PanelErrorResource.revisionId` nema šta stvarno da identifikuje).
- [x] Razdvojiti tip: `LegalDocument` dobija `documentId` (stabilan identitet: kind+slug) i `revisionId` (menja se pri svakom `approved→draft`/`archived→draft`; ostaje isti pri `in_review→draft`).
- [x] `advance()`: kad cilj nije `draft`, isti `revisionId`; kad je cilj `draft` iz `approved` ili `archived`, generiše se **nov** `revisionId` (npr. `crypto.randomUUID()` ili inkrementalni test-friendly generator), `approvals` se prazne, `versionLabel` raste.
- [x] `seedLegalDocuments` u `data.ts`: dodati `documentId`/`revisionId` polja (za seed mogu biti isti kao `id` na startu).
- [x] `legal-documents.ts`: `canDelete(status: RevisionStatus): boolean` — mirror backend pravila (`status === "draft"`).

**UI (`screen-dokumenti.tsx`)**
- [x] Dugme „Obriši" prikazuje se **samo** za `draft` reviziju.
- [x] Za `published` reviziju, akcija je „Arhiviraj" (poziva postojeći `advance(document, "archived")`), ne brisanje.
- [x] Za `in_review`/`approved`/`archived` nema dugmeta za brisanje (moraju prvo na `draft` kroz postojeći tok).
- [x] Potvrda-modal za brisanje (`pendingDeleteId`) se ne prikazuje van `draft` statusa — ukloniti granu koja danas dozvoljava brisanje `published` uz upozorenje.

**Testovi**
- [x] `legal-documents.test.ts`: `canDelete` — true samo za draft; nov test da `advance` iz `approved→draft` menja `revisionId`, a `in_review→draft` ga **ne** menja.
- [x] `test_legal_document_publication.py`: `require_deletable` testovi (5 statusa).

**Intake gate efekat (deo A.1)**
- [x] Test: arhiviranje objavljene revizije jednog od dva Intake teksta → `intakeGateOpen()` vraća `false` (frontend) i odgovarajuća backend provera (kad LD-6 poveže `intake_submission_ready` na bazu — za sada test na nivou čistih funkcija sa listom dokumenata koja simulira arhiviranje).

---

### CG-A2 — Parity fixtures TS ↔ Python

- [x] Kreirati `contracts/fixtures/legal-publication.v1.json` u korenu repozitorijuma (van `frontend/` i `backend/`).
- [x] Šema po slučaju (A.5): `fixtureSchemaVersion`, `caseId`, `description`, `input`, `expectedStage`, `expectedFindings[]` (`ruleId`, `ruleVersion`, `severity`, `requiresApproval`, `remediation`, `fieldPath`), `expectedRequiredCapabilities[]`, `expectedTransitionAllowed`, `expectedPublishAllowed`.
- [x] Popuniti obavezne slučajeve iz A.5:
  - [x] cela D-029 transition matrica — svih 5×5 = 25 parova (5 dozvoljenih napred, 3 povratka, ostalo zabranjeno).
  - [x] prazan sadržaj (naslov prazan / slug nevalidan / body prekratak — 3 pod-slučaja).
  - [x] sadržaj koji prolazi content proveru ali status nije `approved` (transition block).
  - [x] statička odobrenja — potpuna i nepotpuna kombinacija za `intake_data_processing_notice` (traži sva tri) i `booking_rules` (traži samo legal+business).
  - [x] dinamičko `requiresApproval` odobrenje (rezervisano za CG-B2 kad postoji dinamički nalaz; za registar dokumenata ovaj slučaj može biti označen `n/a` dok CMS ne postoji — ne izmišljati dinamički nalaz koji backend još ne generiše).
  - [x] odobrenje vezano za pogrešan `revisionId` (posle CG-A1 fix-a) — ne sme se priznati kao važeće za trenutnu reviziju.
  - [x] kombinacija: prazan sadržaj + nedozvoljena tranzicija + nedostajuća odobrenja u istom pozivu → `expectedStage` mora biti `"content"` (prvi blok pobeđuje, A.4).
  - [x] pokušaj brisanja `draft` (dozvoljeno), `published` (odbijeno), `archived` (odbijeno).
  - [x] arhiviranje dokumenta potrebnog za Intake gate → gate se zatvara.
- [x] Backend loader: `backend/tests/unit/test_legal_publication_fixtures.py` — čita JSON sa `Path(__file__).resolve().parents[3] / "contracts/fixtures/legal-publication.v1.json"` (proveriti tačan broj `parents` do repo korena), parametrizovan `pytest.mark.parametrize` po `caseId`.
- [x] Frontend loader: `frontend/src/features/workspace/legal-documents.fixtures.test.ts` — čita isti fajl preko `node:fs` + `node:path` (repo-root relative), `describe.each`/`it.each` po `caseId`.
- [x] Ispraviti drift u `publication.py` docstring-u: „Legal, Clinical and Product" → „Legal, Clinical and Business".
- [x] Gate: svako neslaganje TS/Python rezultata za isti `caseId` obara test (ne samo upozorenje).

---

### CG-A3 — Strukturisani panel-error ključ

- [x] `panel-errors.tsx`: novi tip `PanelErrorResource = { organizationId: string; resourceType: string; resourceId: string; revisionId?: string; ruleId?: string; fieldPath?: string }`.
- [x] `PanelError`/`PanelErrorInput`: dodati opciono `resource?: PanelErrorResource`.
- [x] `upsertError`: kad `resource` postoji, ključ za dedup/upsert je tuple `organizationId+resourceType+resourceId+revisionId+ruleId+fieldPath`; kad `resource` izostaje, ostaje stari `href+title` fallback (A.6 — samo za greške bez strukturisanog resursa, npr. transition-error poruke).
- [x] Nova funkcija `clearErrorsForResource(resource: PanelErrorResource)` — čisti samo greške čiji `resource` odgovara istom `organizationId+resourceType+resourceId+revisionId`, ne ceo tab (razlika od postojećeg `clearErrorsFor(href)` koji čisti sve na tabu).
- [x] `selectErrorsFor`/`hasErrorFor` po `href` ostaju nepromenjeni (sidebar/banner logika se ne dira — A.6 poslednja stavka).
- [x] `screen-dokumenti.tsx`: `publish()`/`advance()` pozivi `reportError` prosleđuju `resource` sa `revisionId` iz CG-A1 fix-a i `ruleId` kad postoji (za sada `checkPublishable` ne vraća `ruleId` po nalazu — proveriti da li `describePublishBlock` treba proširiti da vrati listu `{ruleId, fieldPath}` umesto samo `details: string[]`, ili ostaviti `ruleId` prazan dok CG-B2 ne uvede pravi rule-per-finding oblik. Ne izmišljati `ruleId` vrednosti koje ne postoje u `legal-documents.ts` danas — zabeležiti kao poznato ograničenje ako se ostavi prazno).
- [x] Uspešna ponovna provera (uspešan `publish()`) poziva `clearErrorsForResource` za taj resurs umesto `clearErrorsFor(href)` (užа briše, ne ceo tab).

**Testovi**
- [x] `panel-errors.test.ts`: isti resource-ključ radi upsert; različit `revisionId` ne pregazi drugi nalaz; različit `fieldPath` ne pregazi drugi nalaz istog `ruleId`; `clearErrorsForResource` briše samo taj resurs, ne ceo tab; greške bez `resource` i dalje rade na `href+title` ključu (regresioni test za postojeće ponašanje).

---

## Faza B — Backend CMS Core (`modules/content`) — ne počinjati pre CG-A1–A3 ✅

### CG-B1 — Modeli ✅ (2026-07-26)

> **Dve odluke donete pri implementaciji, obe dokumentovane u docstring-u modula:**
>
> 1. **Locale je na `ContentEntry`, ne na reviziji.** Srpska i buduća engleska stranica su zasebni javni zapisi sa zasebnim slugovima i zasebnim lancem pregleda, pa je locale deo identiteta unosa. Time „jedna objavljena revizija po unosu" ostaje jedan parcijalni index umesto jednog po lokalu. Lokalizacija ostaje R3 — nema `translation_group` kolone pre nego što taj ugovor postoji (§25 zabrana praznih apstrakcija).
> 2. **Odobrenja su redovi, ne JSON.** Za razliku od `LegalDocumentRevision.approvals`, `ContentReviewDecision` je prava tabela sa `decided_by_user_id`/`decided_at` — dokaz koji D-033 kaže da R3 vezuje za naloge i audit.
>
> **Bonus refaktor koji je CG-B2 predviđao kao otvorenu odluku, rešen ovde:** D-029 lifecycle, `ApprovalCapability`, `can_transition`/`can_delete` i `reissues_revision` premešteni su u `shared/domain/publication.py`. `modules/privacy` ih re-eksportuje, pa nijedan postojeći poziv nije menjan (98 testova prošlo bez izmene). Time backend ima **jednu** definiciju umesto treće kopije — rizik 4 iz plana §4. Nema promene šeme: kolone i dalje serijalizuju iste string vrednosti.

- [x] `ContentEntry` (`backend/src/psihointegritet/modules/content/models.py`): `id`, `organization_id`, `content_type` (enum: `static_page|service|therapist|program|company_plan|package_offer`), `slug`, `created_at`. Unique `(organization_id, content_type, slug, locale)` — proveriti da li slug treba biti jedinstven i po lokalu ili samo po org+tip (odlučiti pri implementaciji, dokumentovati u kodu zašto).
- [x] `ContentRevision`: `id` (`revisionId`), `entry_id`, `version_label`, `locale`, `template` (iz `ContentTemplate` enum), `slot_data` (JSON — sadržaj po template slotovima), `status` (`RevisionStatus`, isti enum kao privacy), `approvals` (JSON lista, isti oblik kao `LegalDocumentRevision.approvals`), `validation_snapshot` (JSON — koja `ruleVersion` po pravilu je važila pri poslednjoj proveri), `created_by_user_id`, `created_at`, `published_at`, `archived_at`. Parcijalni unique index: jedna `published` po `entry_id` (isti obrazac kao `uq_legal_revision_published`).
- [x] `ContentReviewDecision`: `id`, `revision_id`, `capability` (`clinical|legal|business`), `decision` (`approved|rejected`), `decided_by_user_id`, `decided_at`, `note`. Vezano za tačan `revision_id` (A.2 — odobrenja se ne prenose automatski).
- [x] `ContentPublicationEvent`: append-only audit, isti oblik kao `LegalDocumentEvent` (`from_status`, `to_status`, `actor_user_id`, `reason`, `created_at`).
- [x] Imena polja usklađena sa rezervacijom iz `CONTENT_MODEL_MATRIX_v0.1.md` §8: `revisionId`, `createdBy`, `updatedBy`, `publishedAt`.
- [x] Ne dirati `types.ts`/`ContentEntity` javne field-name-ove niti CTA/template registry (matrix §8 zabrana).

### CG-B2 — Pravila objave za content ✅ (2026-07-26)

- [x] ~~`ALLOWED_TRANSITIONS` identičan D-029 mapi (razmotriti deljenje…)~~ — **rešeno u CG-B1**: lifecycle živi u `shared/domain/publication.py`, oba modula ga uvoze. Nema treće kopije.
- [x] Matrica odobrenja iz `CONTENT_GOVERNANCE_CONTRACT` §6 **i** `CONTENT_PUBLISH_GATES` §4 — vidi nalaz o template osi ispod.
- [x] `require_deletable` — re-eksportovan iz `shared/domain`, isti guard kao CG-A1.
- [x] Dinamička odobrenja: `dynamic_approvals()` izvlači `requires_approval` iz nalaza **bilo koje** severity vrednosti i **dodaje** ih osnovnoj matrici.
- [x] `check_publishable()` sa etapama sadržaj → tranzicija → odobrenja i `ContentPublishCheck` rezultatom; `require_publishable()` za servisni sloj.
- [x] `structural_findings()` — nezavisna serverska provera obaveznih slotova po template-u (`MODEL-004` novo pod postojećim prefiksom, `MODEL-003` za nedozvoljen slot).

> **Nalaz 1 — odobrenja imaju dve ose, ne jednu.** `CONTENT_GOVERNANCE_CONTRACT` §6 daje matricu po *vrsti sadržaja*, ali `CONTENT_PUBLISH_GATES` §4 pokazuje da `LegalPage` traži `legal` + `business` — a legal stranica je `static_page` tip na `legal_page` template-u. Zato je matrica razdvojena na `BASE_REQUIRED_APPROVALS` (po `ContentType`) + `TEMPLATE_REQUIRED_APPROVALS` (additivno po template-u). Isti tip na drugom template-u traži drugačije potpise.
>
> **Nalaz 2 — `business` je pod (floor) za sve tipove.** Nijedan izvorni dokument ne navodi javni tip koji se objavljuje bez ijednog odobrenja, a Engines §9.3 stavlja „brend, CTA, cenu i objavu" na org admina. Traženje jednog potpisa je konzervativno čitanje, ne izmišljeno pravilo. **Ako tim želi da obične informativne stranice idu bez odobrenja, to je proizvodna odluka — ne izmena u kodu usput.**
>
> **Nalaz 3 — `LIMIT-002` se namerno NE sprovodi ovde.** `maxOptionalSections` broji ponovljive iteme *unutar* slota, ne različite ključeve slotova; nijedan template u registriju nema više opcionih slotova od sopstvenog maksimuma, pa provera po ključu nikad ne bi mogla da se aktivira. Sprovođenje traži oblik slot payload-a koji definiše **CG-C1**. Test `test_no_template_has_more_optional_slots_than_its_maximum` čuva tu pretpostavku.
>
> **Bezbednosna granica (upisana u docstring modula):** `extra_findings` moraju biti izračunati na serveru. Klijent ne sme da pošalje „nema nalaza" i objavi nepregledan sadržaj — ruter (CG-B4) ih računa, nikad request body. Port punog rule engine-a (SEO, CTA, limiti) je **CG-D4**; do tada backend ima samo strukturnu proveru kao sopstveni pod.

### CG-B3 — Konkurentnost

- [ ] `ContentRevision.lock_version: int` (optimistic locking kolona).
- [ ] Servisni sloj: `UPDATE ... WHERE id = :id AND lock_version = :expected` — 0 redova pogođeno → 409 conflict.
- [ ] Objava (status→published) + `ContentPublicationEvent` + eventualni outbox zapis u jednoj transakciji (isti obrazac kao Booking zahtev iz master plana §6.2 M2.3, ovde primenjen na content).

### CG-B4 — Router

- [ ] `backend/src/psihointegritet/modules/content/router.py` — obrazac `modules/guidance/router.py` team_router: Clerk JWT + `OrganizationMembership` provera, `org_admin` rola.
- [ ] Endpoints: `POST /content/entries`, `GET /content/entries`, `GET /content/entries/{id}`, `POST /content/entries/{id}/revisions`, `POST /content/revisions/{id}/transition`, `POST /content/revisions/{id}/review`, `POST /content/revisions/{id}/publish`, `POST /content/revisions/{id}/archive`, `DELETE /content/revisions/{id}` (samo draft — 409/403 inače).
- [ ] `schemas.py` — Pydantic modeli za request/response, generisani OpenAPI ulazi u `export_openapi.py`.

### CG-B5 — Migracija (napisana, primena čeka Clerk)

- [x] Alembic revizija — **jedna** revizija `20260726_0004` nosi svih 7 tabela (LD-5 + CG-B5). Odluka za jednu umesto dve: obe grupe dele `revisionstatus` tip i `internal_users` FK, pa je jedan atomski upgrade/downgrade jednostavniji za rollback od dve povezane revizije.
- [x] `env.py` dopunjen — **nije uvozio ni `privacy` ni `content` modele**, pa bi autogenerate tiho napravio praznu migraciju. Dodat komentar da modul koji nedostaje u `MODEL_MODULES` nije greška nego nevidljiv.
- [x] Verifikovano lokalno (compose Postgres, `localhost:5434`): `upgrade head` → `downgrade` → `upgrade head`, ORM round-trip, `alembic check` bez drifta za novih 7 tabela.

> **Nalaz 1 — kritičan bag koji su testovi bez baze propustili (D20).** Prvi round-trip je pokazao da parcijalni unique index **ne radi**: druga objavljena revizija istog unosa je prošla. Uzrok: SQLAlchemy `Enum(StrEnum)` po default-u persistira **ime** člana, pa je u koloni stajalo `PUBLISHED`, dok predikat indeksa testira `status = 'published'` — index nikad nije pogađao nijedan red i garancija iz D-045 **nije postojala**. Isti obrazac je bio i u `legal_document_revisions`. Rešeno kroz `shared/types/sa_enum.py::value_enum` (`values_callable`); 10 regresionih testova bez baze čuva da svaka enum kolona persistira male vrednosti, i dokazano je da ti testovi padaju na starom obrascu.
>
> **Nalaz 2 — postojeći drift NIJE uključen (D19).** Autogenerate je pored mojih tabela prijavio razlike između migracija 0001–0003 i trenutnih Intake/identity modela, uključujući `DROP COLUMN intake_cases.age_group`. Da sam prihvatio generisani fajl kakav jeste, deploy na staging bi **obrisao kolonu sa Intake podacima** kao usputni efekat dodavanja CMS tabela. Migracija je ručno svedena na svojih 7 tabela; drift traži zasebnu, pregledanu migraciju i odluku šta sa `age_group`.
>
> **Primena na staging/features:** `railway.json` ima `preDeployCommand: "alembic upgrade head"`, pa se migracija primenjuje **automatski pri deploy-u** na svaki Railway servis. Ručno pokretanje protiv udaljenih baza nije potrebno.

### CG-B6 — Testovi bez DB

- [ ] Unit testovi za `publication.py` (content): lifecycle, matrice odobrenja po tipu, redosled provere, `require_deletable`, dinamička odobrenja — isti stil kao `test_legal_document_publication.py`.
- [ ] Proširiti `contracts/fixtures/` parity pristup i za content pravila (novi fixture fajl `content-publication.v1.json` ili deljena šema — odluka pri implementaciji; ne mešati sa legal fixture-om jer su različite matrice odobrenja po tipu).

---

## Faza C — Frontend CMS editor — ne počinjati pre Faze B (bar CG-B1/B2/B4)

### CG-C1 — Tab „Sadržaj"

- [ ] Nova ruta `/radni-prostor/sadrzaj` (`requireOrgAdmin`), nav stavka u `nav.tsx` (ikona, `DocumentIcon`-stil novi `ContentIcon` ili reuse).
- [ ] `npx next typegen` posle dodavanja rute (typedRoutes).
- [ ] Lista po `ContentType` (6 tabova/filtera) → editor revizije po `templateRegistry` slotovima iz `limits.ts` (limit je error pri validaciji, ne promena layouta — isto pravilo kao postojeći Content Health `LIMIT-*`).

### CG-C2 — Živa validacija

- [ ] Editor poziva **isti** `validateEntity`/`evaluatePublishGate` iz `lib/content-governance/validation.ts` — bez novog rule engine-a u workspace kodu.
- [ ] Prikaz nalaza po polju/sekciji sa `message`/`recommendation`; izvedene klase (A.3): `error`→BLOCK crveno, nalaz sa `requiresApproval`→REVIEW_REQUIRED žuto sa imenom capability-ja, `warning`→žuto bez blokiranja, bez nalaza→PASSED (zeleno/bez oznake).

### CG-C3 — Field-level override

- [ ] Prazno polje u CMS revizji prikazuje fallback vrednost iz `content/*.ts` sa vizuelnom oznakom „(fallback iz koda)" — isti princip kao registar dokumenata gde prazan tekst drži gate zatvorenim, ovde prazno polje = fallback se koristi.
- [ ] `content/*.ts` fajlovi se ne menjaju niti brišu.

### CG-C4 — Review/approve/publish tok

- [ ] Isti obrazac kao `screen-dokumenti.tsx`: dugmad po tranziciji, `usePanelErrors` sa strukturisanim `resource` (CG-A3 tip, sada sa pravim `resourceType`/`fieldPath` po CMS nalazu).
- [ ] **In-memory seed prvo** (isti put kao registar dokumenata pre LD-5/7) — API wiring dolazi kad CG-B4 postoji i kad je testiran.

---

## Faza D — Javni renderer — ne počinjati pre Faze C

### CG-D1 — Provider resolver

- [ ] Nova funkcija `getContentProvider(): ContentProvider` u `lib/content-governance/` (npr. `provider-resolver.ts`) — vraća CMS-backed provider ako postoji objavljen sadržaj, inače `staticContentProvider`.
- [ ] Zameniti direktan import `staticContentProvider` na svih ~18 mesta (15 `(public)` stranica + `robots.ts` + `sitemap.ts` + `zakazivanje/page.tsx` + `json-ld.tsx`) pozivom `getContentProvider()`.
- [ ] `discoverability.ts`: `metadataForRoute`/`jsonLdForRoute` prestaju da hard-wire-uju singleton direktno; primaju provider kroz `getContentProvider()`. `metadataForRoute` prestaje da baca na promašaj — pada na statički fallback umesto `throw`.
- [ ] Raditi u izolovanom PR-u zbog broja dodirnutih fajlova (najrizičniji korak plana).

### CG-D2 — CMS provider implementacija

- [ ] `CmsContentProvider implements ContentProvider` — `getEntity`/`getPageByRoute`/`listPublished`/itd. čitaju objavljenu `ContentRevision` i **nadjačavaju statički entitet polje-po-polje** (D-038); nedostajuće polje → vrednost iz `staticContentProvider`.
- [ ] Test koji eksplicitno tvrdi: prva objava menja `listPublished()` iz praznog niza u neprazan → sitemap/robots izlaz se menja (ne slučajna regresija — nameravana promena, dokumentovana u testu).

### CG-D3 — Cache i preview

- [ ] `revalidatePath`/`revalidateTag` posle uspešne objave/arhiviranja.
- [ ] Staff preview rute za draft reviziju (van `listPublished`, samo za ulogovan org_admin).

### CG-D4 — Content Health v0.2

- [ ] `ContentHealthFinding` dobija opciona polja `ruleVersion`, `requiresApproval`.
- [ ] `npm run content:check` obuhvata CMS izvor pored statičkog (kad CG-D1/D2 postoje).
- [ ] `CONTENT_HEALTH_RULES_v0.1.md` → v0.2 dokumentovan additivno (najava već upisana 2026-07-26 u header fajla).

---

## Faza E — Odloženo (van CMS koda, redosled iz D-043/plan §3)

- [ ] Clerk nalozi za Anju/Mariju/Marjana na produkciji (O-17/O-18).
- [ ] Primena migracija: LD-5 (privacy) + CG-B5 (content), po mogućstvu isti dan.
- [ ] LD-6 — `intake_submission_ready` čita objavljenu reviziju iz baze.
- [ ] LD-7 — FastAPI ruter za registar dokumenata + generisani TS klijent; CG-B4 API wiring u editoru (deo CG-C4).
- [ ] ADR-015 (B2B coffee widget granice, D-041).
- [ ] R2 Booking Engine.
- [ ] Kompas — tek posle O-21 definicije obima; bez placeholder koda pre toga.

---

## Verifikacija (pokrenuti posle svake faze, ne samo na kraju)

**Frontend:** `npx tsc --noEmit` · `npx eslint src --max-warnings=0` · `npx vitest run` · `npx next build` · `npm run content:check`
**Backend:** `uv run ruff check` · `uv run ruff format --check` · `uv run pyright` · `uv run pytest`
**Novi workspace tab (CG-C1):** e2e auth test (redirect za neulogovane) po obrascu postojećih `workspace-auth` testova.
**Parity (CG-A2/B6):** i vitest i pytest moraju proći nad istim fixture fajlom pre nego što se bilo koji CG-A/B zadatak označi ✅.
