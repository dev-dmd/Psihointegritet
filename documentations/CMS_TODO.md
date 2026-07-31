# CMS TODO — detaljni zadaci za CMS Core + Content Governance

**Autoritet:** `CMS_CORE_CONTENT_GOVERNANCE_PLAN_v0.1.md` (odluke, ugovori A.1–A.6, DoD) · D-043/D-044/D-045 · ADR-016 · **autorski sloj: D-046 / ADR-017** (RichDoc v1, uvoz `.docx`, registar šema slotova, Tiptap)
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
- [ ] **Nigde `dangerouslySetInnerHTML` u renderu sadržaja** (ADR-017 §1). Tekst se čuva kao `RichDoc` JSON i renderuje iscrpnim `switch`-om — XSS je nemoguć po konstrukciji, ne filtriran.
- [x] Uvoz i paste dele **jedan** backend HTML→RichDoc normalizator (ADR-017 §7); Tiptap paste koristi `/content/rich-doc/normalize-html`, a `.docx` ide kroz isti `normalize_html_to_rich_doc`.
- [ ] Limiti sekcija (koliko teksta/pasusa/slika) žive **samo** u registru šema slotova — nikad duplirani u UI komponenti.

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

> **Nalaz 1 — odobrenja imaju dve ose, ne jednu.** `CONTENT_GOVERNANCE_CONTRACT` §6 daje matricu po _vrsti sadržaja_, ali `CONTENT_PUBLISH_GATES` §4 pokazuje da `LegalPage` traži `legal` + `business` — a legal stranica je `static_page` tip na `legal_page` template-u. Zato je matrica razdvojena na `BASE_REQUIRED_APPROVALS` (po `ContentType`) + `TEMPLATE_REQUIRED_APPROVALS` (additivno po template-u). Isti tip na drugom template-u traži drugačije potpise.
>
> **Nalaz 2 — `business` je pod (floor) za sve tipove.** Nijedan izvorni dokument ne navodi javni tip koji se objavljuje bez ijednog odobrenja, a Engines §9.3 stavlja „brend, CTA, cenu i objavu" na org admina. Traženje jednog potpisa je konzervativno čitanje, ne izmišljeno pravilo. **Ako tim želi da obične informativne stranice idu bez odobrenja, to je proizvodna odluka — ne izmena u kodu usput.**
>
> **Nalaz 3 — `LIMIT-002` se namerno NE sprovodi ovde.** `maxOptionalSections` broji ponovljive iteme _unutar_ slota, ne različite ključeve slotova; nijedan template u registriju nema više opcionih slotova od sopstvenog maksimuma, pa provera po ključu nikad ne bi mogla da se aktivira. Sprovođenje traži oblik slot payload-a koji definiše **CG-C1**. Test `test_no_template_has_more_optional_slots_than_its_maximum` čuva tu pretpostavku.
>
> **Bezbednosna granica (upisana u docstring modula):** `extra_findings` moraju biti izračunati na serveru. Klijent ne sme da pošalje „nema nalaza" i objavi nepregledan sadržaj — `health.py` (CG-D4) računa CMS-autorske nalaze, ruter ih nikada ne prima kroz request body.

### CG-B3 — Konkurentnost · **spojen sa CG-B4 (D-047)** — ✅ backend + browser 409 UX

> ⚠️ **Ne isporučuje se sam.** Ovo je poštovano — oba zadatka su implementirana i isporučena zajedno.

- [x] `ContentRevision.lock_version: int` — postojao od `20260726_0004`; sada mu je dodat pisac.
- [x] **Optimistic locking — odluka: SQLAlchemy `version_id_col`, ne ručni `UPDATE...WHERE`.** `ContentRevision.__mapper_args__ = {"version_id_col": lock_version}` (`models.py`) — SQLAlchemy sam dodaje `WHERE lock_version=:trenutno` na svaki UPDATE i uvećava ga, bacajući `StaleDataError` (uhvaćeno u `service.py::update_revision` → 409) kad 0 redova pogodi. Isti ishod kao ručna `UPDATE...WHERE` provera, manje koda, standardan SQLAlchemy 2.0 obrazac dokumentovan tačno za ovu namenu. **Dodatno**, servis eksplicitno proverava `request.lockVersion == revision.lockVersion` PRE mutacije (jasna poruka „izmenjeno u međuvremenu" bez čekanja na flush) — ORM mehanizam ostaje odbrana za usku trku između SELECT-a i UPDATE-a unutar iste transakcije.
- [x] Objava (status→published) + `ContentPublicationEvent` u istoj transakciji, uz arhiviranje prethodne objavljene revizije istog unosa (`_archive_other_published`, isti obrazac kao pravni registar).
- [x] **Editor na 409 prikazuje čistu poruku „Revizija je izmenjena u međuvremenu…"** kroz RFC7807 parser i `usePanelErrors`; stvarni browser smoke je namerno poslao dva PATCH-a sa istim `lockVersion` i dobio 200/409.

### CG-B4 — Router · **nosi i CG-B3** — ✅ backend, frontend klijent i OpenAPI

- [x] `backend/src/psihointegritet/modules/content/router.py` — obrazac `modules/guidance/router.py` team_router: Clerk JWT + `resolve_staff_actor` + eksplicitna `org_admin` provera (isti `_org_admin_actor` obrazac kao `modules/privacy/router.py`).
- [x] Endpoints — **stvarne putanje se razlikuju od originalnog nacrta ispod** (usklađene sa LD-7 obrascem umesto sa ranije zamišljenim `/content/revisions/{id}/...`, jer revizija bez svog `entry_id`-a u putanji ne može tenant-scope-ovati lookup bez dodatnog upita): `GET/POST /content/entries`, `GET /content/entries/{id}`, `PATCH /content/entries/{id}/revisions/{id}`, `GET .../revisions/{id}/publish-check`, `POST .../revisions/{id}/transition` (nosi i „objavi" i „arhiviraj" — cilj je u `target`, nema zasebnog `/publish`/`/archive`), `POST .../revisions/{id}/reviews` (ne `/review`), `DELETE .../revisions/{id}`. Nema zasebnog `POST /content/entries/{id}/revisions` — nova draft revizija nastaje samo kroz A.2 reissue (`update`/`transition` na `approved`/`archived` reviziju), nikad eksplicitnim pozivom.
- [x] `schemas.py` — Pydantic modeli (`ApiSchema` sa `to_camel` alias generatorom, isti obrazac kao `modules/privacy/schemas.py`). `slot_data` je namerno sirov `dict[str, object]` na wire-u, ne tipizovana unija devet template oblika — ista odluka i isto obrazloženje kao RichDoc na LD-7 API-ju (CG-C1 registar šema slotova još ne postoji).
- [x] `backend/openapi.json` ponovo izvezen i `npm run api:generate` pokrenut posle content lifecycle/SEO/public API izmena; generisani tipovi prolaze typecheck.
- [x] **`ContentReviewDecision` je prava tabela**; `record_review_decision` upisuje/ažurira red po `(revision_id, capability)`, sa actor prikazom u panelu.
- [x] `check_publish` poziva `check_publishable()` sa serverski izračunatim `authored_content_findings` iz CG-D4; browser ne može da pošalje ili ukloni nalaze. Struktura, mode/shape, RichDoc, CTA, asset i limit pravila proveravaju se pre tranzicije i odobrenja.

### CG-B5 — Migracija (napisana, primena čeka Clerk)

- [x] Alembic revizija — **jedna** revizija `20260726_0004` nosi svih 7 tabela (LD-5 + CG-B5). Odluka za jednu umesto dve: obe grupe dele `revisionstatus` tip i `internal_users` FK, pa je jedan atomski upgrade/downgrade jednostavniji za rollback od dve povezane revizije.
- [x] `env.py` dopunjen — **nije uvozio ni `privacy` ni `content` modele**, pa bi autogenerate tiho napravio praznu migraciju. Dodat komentar da modul koji nedostaje u `MODEL_MODULES` nije greška nego nevidljiv.
- [x] Verifikovano lokalno (compose Postgres, `localhost:5434`): `upgrade head` → `downgrade` → `upgrade head`, ORM round-trip, `alembic check` bez drifta za novih 7 tabela.

> **Nalaz 1 — kritičan bag koji su testovi bez baze propustili (D20).** Prvi round-trip je pokazao da parcijalni unique index **ne radi**: druga objavljena revizija istog unosa je prošla. Uzrok: SQLAlchemy `Enum(StrEnum)` po default-u persistira **ime** člana, pa je u koloni stajalo `PUBLISHED`, dok predikat indeksa testira `status = 'published'` — index nikad nije pogađao nijedan red i garancija iz D-045 **nije postojala**. Isti obrazac je bio i u `legal_document_revisions`. Rešeno kroz `shared/types/sa_enum.py::value_enum` (`values_callable`); 10 regresionih testova bez baze čuva da svaka enum kolona persistira male vrednosti, i dokazano je da ti testovi padaju na starom obrascu.
>
> **Nalaz 2 — postojeći drift NIJE uključen (D19).** Autogenerate je pored mojih tabela prijavio razlike između migracija 0001–0003 i trenutnih Intake/identity modela, uključujući `DROP COLUMN intake_cases.age_group`. Da sam prihvatio generisani fajl kakav jeste, deploy na staging bi **obrisao kolonu sa Intake podacima** kao usputni efekat dodavanja CMS tabela. Migracija je ručno svedena na svojih 7 tabela; drift traži zasebnu, pregledanu migraciju i odluku šta sa `age_group`.
>
> **Primena na staging/features:** `railway.json` ima `preDeployCommand: "alembic upgrade head"`, pa se migracija primenjuje **automatski pri deploy-u** na svaki Railway servis. Ručno pokretanje protiv udaljenih baza nije potrebno.

### CG-B6 — Testovi bez DB — ✅ **zatvoreno 2026-07-30**

> `test_content_publication.py` je zatečen već napisan i zelen (commit `485b415`, pre ovog prolaza) — pokrivao je matricu odobrenja, dinamička odobrenja, strukturne nalaze i redosled provere, ali NE `can_delete`/`require_deletable` niti parity fixture. Dodato u ovom prolazu: `TestDeletability` klasa (mirror `test_legal_document_publication.py`) + `contracts/fixtures/content-publication.v1.json` (18 slučajeva: 5 required-approvals, 3 dynamic-approvals, 5 structural-findings, 8 publish-check, uklj. `PUBLISH-001..008`) + `test_content_publication_fixtures.py` loader. **Python-only fixture** — `modules/content/publication.py` nema još TS mirror (za razliku od pravnog registra) jer CG-C1b/C4 još ne postoje; TS loader se dodaje istom fajlu kad taj mirror bude napisan, bez diranja fixture slučajeva.

- [x] Unit testovi za `publication.py` (content): lifecycle, matrice odobrenja po tipu, redosled provere, `require_deletable`, dinamička odobrenja — isti stil kao `test_legal_document_publication.py`. 34 testa u `test_content_publication.py`.
- [x] Proširiti `contracts/fixtures/` parity pristup i za content pravila — `content-publication.v1.json` (Python-only za sada, vidi napomena iznad), 22 testa u `test_content_publication_fixtures.py`.

### CG-B7 — `RichDoc` v1 (autorski format teksta) — **ADR-017 / D-046** — ✅ **zatvoreno 2026-07-30**

> **2026-07-29 (D-047 nalog „radi bez testiranja"):** kontrakt, validator i renderer su napisani i ručno pregledani (sintaksa/importi provereni, kompajler nije pokretan). Fixtures i testovi su svesno preskočeni.
>
> **2026-07-30 — zatvoreno.** `contracts/fixtures/richdoc.v1.json` — 27 slučajeva (11 `href-check` za `isAllowedHref`/`is_allowed_href`, 5 `text-extract` za `richDocText(Length)`/`rich_doc_text(_length)`, 11 `validate-check` za `validateRichDoc`/`validate_rich_doc` pokrivajući svih šest RICH-0xx pravila + LIMIT-001). TS loader `rich-doc.fixtures.test.ts` i Python loader `test_rich_doc_fixtures.py` — oba zelena na prvom pravom pokretanju posle dva ručna arifmetička ispravljena greška u fixture-u (dužina teksta, join-separator između spans unutar istog bloka — spans se spajaju istim single-space pravilom kao blokovi, ne konkatenacijom).

**Ugovor (deljen, obe strane)**

- [x] `frontend/src/lib/content-governance/rich-doc.ts` — tipovi `RichDoc`, `RichBlock`, `Span`, `Mark` tačno po ADR-017 §1. `schemaVersion: 1`.
- [x] Blokovi u v1: `heading` (level 2–4), `paragraph`, `list` (`ordered: boolean`), `quote`. **Bez `table`, bez `image`, bez embed-a** (ADR-017 §5, §6).
- [x] Marks u v1: `bold`, `italic`, `underline`, `link` (`{ type: "link"; href: string }`).
- [x] **Stabilan `id` na svakom bloku i svakoj stavci liste** — `createBlockId()` (`crypto.randomUUID()`, isti obrazac kao `legal-documents.ts`'s `generateRevisionId`).
- [x] Python ogledalo: `backend/src/psihointegritet/shared/domain/rich_doc.py` — **odluka: dataclasses + ručan `parse_rich_doc(raw: object)` parser**, ne Pydantic. Razlog upisan u modul docstring: `RichDoc` se tretira kao runtime JSON oblik kakav i jeste u koloni (isti pristup kao `structural_findings` nad `Mapping[str, object]` slot podacima), a ne nešto što poziva prethodno konstruiše.

**Validacija**

- [x] `href` allowlist: `https://`, `mailto:` i interne rute (regex isti kao `validateRedirectRegistry`). `javascript:`/`data:` odbijeni kao **error** (`RICH-003`). _(Napomena: ne ide kroz `cta.ts` registry kao što je prvobitno pisalo — to bi vezalo RichDoc validaciju za CTA akcije, koje su nešto drugačije od slobodnih editorskih linkova u telu teksta; umesto toga koristi se isti path-regex kao redirect registry.)_
- [x] Brojanje znakova ide po **tekstu** (`richDocText`/`rich_doc_text`), marks se ne broje.
- [x] `RICH-0xx` prefiks, aditivno: `RICH-001` nedozvoljen/neparsibilan/nepoznat blok · `RICH-002` nedozvoljen/neparsibilan mark · `RICH-003` nevalidan `href` · `RICH-004` warning (underline+URL) · `RICH-005` prekoračen `maxBlocks` · **`RICH-006` dodat van originalne liste** (dupliran/nedostajući `blockId`) — dokumentovano u `CONTENT_HEALTH_RULES_v0.2.md` §4 kao aditivno proširenje istim obrascem kao `MODEL-004` u CG-B2.
- [x] `H1` se ne prihvata u telu (`level: 2 | 3 | 4` tipski, `Literal[2,3,4]` na Python strani).

**Renderer**

- [x] `frontend/src/components/content/rich-text.tsx`. **Nigde `dangerouslySetInnerHTML`.**
- [x] Nepoznat tip bloka se preskače bez bacanja (implementirano kroz `if`/type-guard lanac sa `return null` na kraju, ne `switch` — namerno, da TS ne tretira taj ogranak kao „unreachable" za deklarisanu uniju, a runtime ipak ostane tolerantan na budući tip).
- [x] `underline` stilizovan odvojeno od linka (`decoration-1` bez boje nasuprot `text-forest underline decoration-sage/60`).

**Parity fixtures — ⬜ namerno odloženo**

- [ ] `contracts/fixtures/richdoc.v1.json` — **nije napravljen u ovom prolazu.**
- [ ] Slučajevi iz liste — **nisu napisani.** Ovo je blokirajuće pre nego što se CG-B7 označi ✅ u `TODO.md` §5D (pravilo sa vrha ovog fajla: „Kad ceo CG-X milestone ovde ima sve kućice ✅, prebaci status").

### CG-B8 — Uvoz `.docx` — **ADR-017 §7** — 🟡 kernel + bezbednosni testovi gotovi (2026-07-30); rate limit ostaje otvoren pre produkcije

> ⚠️ **Odstupanje od plana ispod:** fajlovi NISU u `modules/content/` nego u `shared/parsing/` (`docx_import.py`, `html_normalize.py`). Razlog: D-047 je pravni registar (`modules/privacy`) učinio prvim potrošačem uvoza, pre nego što `modules/content` uopšte ima router (CG-B4 dolazi posle ovoga u redosledu). Postavljanje parsera u bilo koji od ta dva modula napravilo bi zavisnost unakrsno; `shared/parsing/` nema sopstvena pravila životnog ciklusa — čista je transformacija bajtova u `RichDoc`, isto obrazloženje koje je `rich_doc.py` već stavilo u `shared/`. Puno obrazloženje u docstring-u oba fajla.

- [x] Zavisnost `mammoth` u `backend/pyproject.toml` (Python port, ne JS biblioteka) — dodato preko `uv add mammoth --no-sync`. ⚠️ **Nije `uv sync`-ovano u `.venv`** — potrebno pre pokretanja backend-a ili testova.
- [x] `shared/parsing/docx_import.py`: `.docx` → mammoth → HTML → **isti normalizator** kao paste → `RichDoc`.
- [x] `shared/parsing/html_normalize.py` — **jedan** allowlist normalizator, `html.parser.HTMLParser`-zasnovan stablo-builder + allowlist mapiranje. Nepoznat tag se odmotava; `<script>` ne preživljava jer ga nema u mapi. **Bag otkriven i ispravljen tokom pisanja:** inline formatting tagovi (`b/em/u/a/br/img`) koji se pojave BEZ omotača `<p>` (čest slučaj kod paste fragmenata) su se prvobitno tretirali kao „nepoznat kontejner" i odmotavali, gubeći bold/italic/underline. Ispravljeno uvođenjem `_LOOSE_INLINE_TAGS` skupa koji ih vodi u isti tekstualni tok umesto rekurzivnog odmotavanja.
- [x] Mapiranje: Word `Heading 1` → `H2`, `Heading 2` → `H3`, `Heading 3+` → `H4` (`min(raw_level + 1, 4)`). `mammoth`-ov `style_map="u => u"` dodat jer mammoth po default-u ignoriše `<u>`.
- [x] Plain-text ulaz: `normalize_plain_text_to_rich_doc` (backend) + `richDocFromPlainText` (frontend, koristi ga Phase-0 stopgap textarea u `screen-dokumenti.tsx`) — prazan red deli pasuse.
- [x] **Limiti pri prijemu:** `DocxImportLimits` (veličina fajla, uncompressed cap, decompression ratio po zip entry-ju PRE mammoth-a, `maxBlocks` sa truncate+nalaz umesto tihog odbacivanja), MIME provera na ekstenziji u routeru + veličina bajtova pre parsiranja. Konverzija ide kroz `asyncio.to_thread` + `asyncio.wait_for(20s)` (rules §18 — nikad blokirajući poziv na event loop-u).
- [ ] **Rate limit na endpoint — NIJE urađeno.** U backendu ne postoji nijedna postojeća rate-limit infrastruktura (provereno gerpom); graditi je od nule bez mogućnosti da se testira protiv prave baze nije rađeno u ovom prolazu. Otvorena stavka pre produkcije.
- [x] `.doc` se odbija (provera ekstenzije u `router.py`, poruka upućuje na `.docx`). **Bez LibreOffice.**
- [x] PDF se ne prihvata kao strukturisan uvoz (nije uveden nijedan PDF put).

**Izveštaj o uvozu (`IMPORT-0xx`)**

- [x] `IMPORT-001` info — sažetak (pasusi/naslovi/liste/linkovi).
- [x] `IMPORT-002` info — broj H1→H2 democija.
- [x] `IMPORT-003` warning — tabela izbačena.
- [x] `IMPORT-004` warning — slika nije preneta. **Slika se nikad ne čita** — `convert_image` prosleđen mammoth-u vraća `{}` bez poziva `image.open()`, pa se čak ni memorija ne troši na base64 enkodovanje slike koja se ionako baca.
- [x] `IMPORT-005` warning — nepoznato formatiranje odbačeno.
- [ ] Nalazi sa `requiresApproval` kroz `dynamic_approvals()` — **NIJE povezano** za pravni registar u ovom prolazu, jer `modules/privacy` ne koristi CG-B2-ov dinamički mehanizam (ima fiksnu `REQUIRED_APPROVALS` mapu po vrsti dokumenta, ne `dynamic_approvals()`). Uvoz danas vraća `requiresApproval: boolean` kao **informativno** polje (bilo koji warning/error nalaz), ne kao stvaran gate. Otvorena stavka.
- [x] Uvoz nikad ne piše direktno — `import-docx` endpoint je **preview-only**, ništa se ne upisuje dok autor eksplicitno ne pošalje `PATCH .../revisions/{id}`.

**Testovi — ✅ bezbednosni deo zatvoren 2026-07-30**

- [x] Bezbednosni testovi `<script>`/`onerror=`/`javascript:` — `test_html_normalize_security.py` (12 testova, pokriva sva tri ulazna puta jer sva tri dele isti normalizator): `javascript:`/`data:` href nikad ne postaje `LinkMark` (RICH-003), `onclick`/`onerror` atributi se nikad ne čitaju niti procure u tekst, `<iframe>`/`<svg onload>` se odmotavaju bez efekta, malformisan/nezatvoren markup ne baca izuzetak.
  - **Bag nađen i ispravljen u istom prolazu:** `<script>`/`<style>` su se tretirali kao bilo koji nepoznat kontejner („odmotaj tag, zadrži decu") — sadržaj skripte/CSS-a je preživljavao kao **vidljiv običan tekst** u pasusu (ne izvršava se, renderer nikad ne koristi `dangerouslySetInnerHTML`, ali source kod bi bio vidljiv na javnoj stranici). Dodat `_DROP_ENTIRELY = {"script", "style"}` u `html_normalize.py` — ova dva taga se sada odbacuju **zajedno sa sadržajem**, brojana kroz isti `unknown_dropped`/`IMPORT-005` mehanizam kao i drugi odbačeni elementi.
- [x] Zip-bomb odbijen pre dekompresije — `test_docx_import_security.py` (7 testova): prazan upload, upload preko `max_file_bytes`, nevažeći zip, zip bez `[Content_Types].xml`, **pravi** zip bomb (par MB nula, DEFLATE odnos kompresije >100:1, odbijen PRE nego što mammoth i takne bajt), `max_uncompressed_bytes` nezavisno od ratio provere, pozitivna kontrola (mali validan zip prolazi bounds proveru, mammoth posle toga zasebno pada na nevalidnom `document.xml`-u — očekivano, van obima ovog testa).
- [ ] Fixture `.docx` fajlovi (pravi binarni fajlovi za round-trip test mammoth-a) i paritetni test paste↔docx ostaju otvoreni — manje kritični od bezbednosnog dela, nisu blokirali CG-C1a.

**`ContentPatch` — jedini interfejs koji se piše (ADR-017 A1.2)**

- [x] Realizovano kao `ImportDocxResponse` u `modules/privacy/schemas.py`: `{ body: dict, findings: ImportDocxFinding[], requiresApproval: bool }` — nema `target: {revisionId, slotPath}` polje jer je za pravni registar target uvek implicitan (poziva se na `/documents/{document_id}/import-docx`, primenjuje se preko posebnog `PATCH` poziva). Kad CG-B4 (generički CMS) dobije sopstveni import endpoint, taj `target` postaje potreban i vratiće se u oblik bliži originalnom predlogu.
- [x] `ApprovalDecision`, `AIReviewFinding`, `LayoutProposal`, `AssetPlacementSuggestion` se **ne pišu**.

### CG-B9 — Migracija `LegalDocumentRevision.body` → RichDoc JSON — ✅ napisana, ⬜ verifikacija odložena

> ⚠️ **Nova revizija, NIKAD izmena `20260726_0004`.** Poštovano — `20260729_0005_legal_document_body_rich_doc.py`.

- [x] Nova Alembic revizija: `body` `Text` → `JSON`.
- [x] Konverzija postojećeg teksta u dokument sa **jednim pasusom koji nosi ceo tekst** (ADR-017 Consequences: „single-paragraph documents" — **ispravljena netačna formulacija** koja je ranije stajala ovde, „jedan pasus po praznom redu"; blank-line splitting je logika `normalize_plain_text_to_rich_doc`-a za NOVI unos, ne migracije). Rađeno kroz Python petlju (`connection.execute` + `sa.text`), ne raw SQL `USING` izraz — tabela je prazna u svim proverenim okruženjima, pa je petlja i jednostavnija za proveru i dovoljno brza.
- [x] Objavljene revizije se ne prepisuju u mestu — migracija je re-enkodovanje formata skladištenja (isti vidljiv tekst), ne izmena sadržaja, pa ne krši D-045 (koje govori o korisničkim izmenama).
- [ ] **Verifikacija NIJE pokrenuta** (`upgrade`→`downgrade`→`upgrade`, ORM round-trip, `alembic check`) — CTO nalog, bez baze u ovom prolazu. **Ovo je pre svega drugog sledeći korak** kad testiranje počne — migracija protiv prazne baze je niskorizična ali neprovjerena.
- [x] `legal-documents.ts` (`richDocTextLength`) i `publication.py::content_problems` (`rich_doc_text_length`) prešli sa dužine stringa na brojanje RichDoc teksta.

---

## Faza C — Frontend CMS editor — ne počinjati pre Faze B (bar CG-B1/B2/B4)

### CG-C1 — Tab „Sadržaj" — **ADR-017 §9 + Amandman 2 (D-050)** — ✅ C1a+C1b zatvoreni 2026-07-30

> **Prvi nacrt ovog odeljka (§9 originalnog ADR-017) je bio placeholder — ime i grubo obeležje, nikad proveren protiv stvarnog sadržaja stranica.** Review implementacionog plana je proverio ga protiv `static-provider.ts`, stvarno renderovanih stranica i postojećih registry-ja (`cta.ts`, `AssetReference`) i našao sedam problema koji bi, da su izgrađeni kako je prvobitno pisalo, tražili migraciju `slot_data` oblika posle prve iteracije. **Amandman 2 na ADR-017 (D-050) je ispravio ugovor pre koda** — ovaj odeljak sada odražava ispravljen dizajn. Puno obrazloženje svake ispravke: ADR-017 Amandman 2.
>
> **Podela na C1a (ugovor) i C1b (draft editor)** — smoke test za draft editor ne sme zavisiti od objave/pregleda/javnog renderera (CG-C4/D2/D4, zaseban korak). Redosled i preduslov (zatvoriti CG-B6/B7/B8 pre C1a): `TODO.md` §5D Faza 1.

**Slot dobija stanje iznad svojih polja — `SlotSpec`, ne samo `SlotFieldSpec`**

- [x] `SlotSpec = editable{required, visibility: fixed|toggleable, fields} | computed{reason} | unmodeled{reason}` — prazan `fields: {}` više ne znači i „izvedeno, odbij payload" i „nedokazano, ne izmišljaj" istovremeno (Amandman 2 §A2.1). Backend odbija payload upućen na `computed` slot (izuzet iz `MODEL-004` provere, nikad ga ne očekuje u `slot_data`).
- [x] Popunjen `editability` za svaki slot svakog od 9 template-a po dokazu iz koda (`static-provider.ts` + stranice), ne po pretpostavci. `computed` primeri: `service_detail.related`, `pricing_page.service_prices`/`program_references`, `audience_page.related`/`program_cards`. `unmodeled` primeri: ceo `support_area` (nema stranice ni podatka nigde u repou), `static_information.intro`/`prose`, `program_detail.format`/`status`/`facilitators`/`faq`/`registration`, `audience_page.audience`/`first_step`, `therapist_profile.media`, `legal_page.links`.

**`SlotFieldSpec` — devet vrsta polja (Amandman 2)**

- [x] `frontend/src/lib/content-governance/slot-schema.ts` — `text` · `rich` (`maxBlocks`, `maxChars` opcion — bez gornje granice za npr. pun pravni tekst) · `integer` · `money` · `image` · `imageList` · `cta` · `ctaList` · `repeater` (`item: Record<string, NonRepeaterFieldSpec>` — isključuje `repeater`/`imageList`/`ctaList` iz stavke). **Napomena o `image`:** spec je `{kind:"image", required?}` (kao u originalnom §9 nacrtu) — `{assetId, alt, decorative?}` je oblik **vrednosti** polja (kao postojeći `AssetReference`), ne dodatna svojstva na samom spec-u; spec ne treba da zna vrednost, samo da li je obavezno.
- [x] **Nalaz tokom C1b (2026-07-30), ispravljen u C1a pre nego što je editor izgrađen na tome:** `ctaList` nije imao `allowedActions` — za razliku od pojedinačnog `cta` polja (koje Amandman 2 §A2.6 namerno vezuje za CTA registry), `ctaList` je ostao bez iste zaštite. Generički editor koji bi renderovao `ctaList` bez ograničenja pustio bi administratora da izabere bilo koju CTA akciju, poništavajući tačno onu zaštitu koju je §A2.6 uveo za pojedinačni `cta`. Dodat `allowedActions`/`targetType` na `ctaList` (TS i Python `CtaListFieldSpec`), popunjen za jedinu stvarnu upotrebu (`static_information.cta`) sa pet „generičkih" akcija (bez `BOOK_THERAPIST`/`VIEW_PROGRAM` i sličnih koje ciljaju konkretan entitet). Fixture regenerisan, parity ponovo zelen.
- [x] `frontend/src/lib/content-governance/limits.ts` — uklonjen `maxOptionalSections` iz `TemplateDefinition` na obe strane (TS `templateRegistry` i Python `TEMPLATE_REGISTRY` u `publication.py`). Dodat `shortFact` (140 znakova) limit ključ za kratke činjenice (trajanje, format, broj seansi, bedž…); reused `cardDescription`/`richParagraph`/`heroLead`/`cardTitle` gde je već postojao odgovarajući ključ.
- [x] **Uklonjena i mrtva `LIMIT-002` provera u `validation.ts`** (frontend content-health validator) — brojala je isto pogrešno (`entity.slots` samo drži prisustvo, nema podataka o broju stavki unutar slota); `ContentEntity` model nema tu granularnost uopšte, pa provera ostaje samo u backend-u gde `slot_data` stvarno postoji.
- [x] `inherit`/`override`/`hidden` payload ugovor (Amandman 2 §A2.3) — `SlotOverride = { mode: inherit|override|hidden, fields? }` (TS interface + Python `SlotOverrideMode` Literal). **Nalaz tokom implementacije:** prvi prolaz `LIMIT-002` provere je greškom čitao polja direktno sa vrednosti slota (`slot_data[slot][fieldName]`) umesto iz `slot_data[slot].fields[fieldName]` — ispravljeno pre nego što je ijedan test ili fixture zaključan. CG-D4 je zatim zatvorio dublja pravila: fiksni slot ne može biti `hidden`, computed/unmodeled slot ne može biti override, a `inherit` ostaje validan jer koristi zaštićeni sistemski fallback.
- [x] Python ogledalo — **deviacija od plana**: `backend/.../modules/content/slot_schema.py`, ne `shared/domain/`. `SLOT_SPEC_REGISTRY` je indeksiran po `ContentTemplate` i `cta` polja referenciraju `ContentType` — oba žive u `modules/content/models.py`, ne u `shared/`; uvoz `modules/content` tipova u `shared/` bi obrnuo smer zavisnosti koji svaki drugi modul prati. Razlog upisan u docstring fajla.
- [x] `contracts/fixtures/slot-schema.v1.json` parity — generisan iz Python registra (izbegnuta treća ručna kopija), TS i Python loaderi oba zelena **na prvom pravom pokretanju** — dve nezavisno pisane registre (TS i Python) su se poklopile bez ijedne razlike.
- [x] **Pravi `LIMIT-002`** (Amandman 2 §A2.2) — za svako `imageList`/`ctaList`/`repeater` polje u `slot_data[slot].fields`, broj stavki mora biti u `[min, max]` iz registra. **Ne** broji ključeve opcionih slotova (odbačena interpretacija, CG-B2 Nalaz 3). `test_no_template_has_more_optional_slots_than_its_maximum` obrisan, zamenjen sa 8 novih testova (`TestStructuralFindings` u `test_content_publication.py`) nad stvarnim `slot_data` primerima — min/max granice, `computed`-izuzetak, `unmodeled`-i-dalje-proveren, `inherit`-nema-šta-da-proveri, ne-mapping vrednost se ignoriše.
- [x] **Editor se crta generički iz registra** (`SlotEditor`/`SlotFieldEditor`).
- [x] Brojači uz tekst, RichDoc blokove/znakove i kolekcije.

**Verifikacija (2026-07-30):** backend `ruff`/`ruff format`/`pyright`/`pytest` (255 passed, 1 skipped, +10 novih testova) · frontend `tsc`/`eslint`/`prettier`/`vitest` (214 passed, 1 skipped, +2 nova) /`next build` — sve zeleno.

**CG-C1b — draft editor (bez lifecycle dugmadi) — ✅ zatvoreno 2026-07-30 (uz jedno poznato ograničenje verifikacije, vidi ispod)**

- [x] Nova ruta `/radni-prostor/sadrzaj` (`requireOrgAdmin`), nav stavka u `nav.tsx` (nova `LayersIcon`).
- [x] `npx next typegen` posle dodavanja rute (typedRoutes).
- [x] `content-api.ts` + proxy rute (`app/api/content/entries/**`, obrazac `legal-documents-api.ts`/`app/api/privacy/documents/**`) — **pravi CG-B4 API od prvog dana, nema in-memory seed faze.** Namerno **bez** publish-check/transition/reviews klijenta — to je CG-C4, isti razlog kao dole.
- [x] `useQuery`/`useMutation` od prvog dana (ne go `useEffect`).
- [x] Lista po `ContentType` (`content-entry-list.tsx`, 6 tabova preko `TabPills`) → create/edit/save/delete DRAFT revizije (`content-revision-editor.tsx`), 409 optimistic-lock UX sa razumljivom porukom.
- [x] Fallback prikaz — `inherit`/`override`/`hidden` prekidač vidljiv u UI-ju (`slot-editor.tsx`) — CG-C3 se praktično zaključava ovde.
- [x] **Bez** pošalji-na-pregled/odobri/objavi/arhiviraj dugmadi — to je CG-C4.
- [x] Generički editor podeljen tačno kako je plan tražio: `screen-sadrzaj.tsx` (orkestracija) / `content-entry-list.tsx` / `content-revision-editor.tsx` / `slot-editor.tsx` / `slot-field-editor.tsx` / `repeater-field-editor.tsx`.

**Nalaz tokom C1b, ispravljen pre nego što je sklopljen ijedan field editor:** `ctaList` (jedina stvarna upotreba, `static_information.cta`) nije imao `allowedActions` — isti propust kao pojedinačni `cta` pre Amandmana 2 §A2.6. Generički editor koji bi renderovao listu CTA-ova bez ograničenja dozvolio bi bilo koju akciju. Dodato u C1a registar (`CtaListFieldSpec`), fixture regenerisan, parity ponovo proveren zelen — beleženo i u C1a odeljku iznad.

**Drugi nalaz, stvaran i pre-postojeći bag van C1b obima:** `content-api.ts` je isprva verno kopirao `legal-documents-api.ts`'s `parseOrThrow` (čita `response.text()` direktno kao poruku greške). Provera protiv živog backend-a (curl na `/api/v1/content/entries` bez tokena) je pokazala da backend **ne** vraća FastAPI-jev default `{"detail": "..."}` oblik, nego sopstveni RFC 7807 `ApiProblem` omotač (`api/errors.py::_handle_http_exception`) — `HTTPException(detail=X)` postaje `title: X`, ne `detail`. Postojao je već izgrađen i **testiran, ali nikad iskorišćen** `frontend/src/lib/errors/api-problem.ts` (`isApiProblem`) baš za ovaj slučaj. **`content-api.ts` je ispravljen** da koristi `isApiProblem`/`problem.detail ?? problem.title` — 409 poruka „Revizija je izmenjena u međuvremenu — osvežite i pokušajte ponovo." sada stvarno stiže čista, ne kao sirov JSON blob.

> `legal-documents-api.ts` je zatim prebačen na isti `isApiProblem` parser; content i legal panel sada prikazuju čistu backend poruku umesto JSON omotača.

**Browser verifikacija:** `scripts/smoke-cms-authenticated.mjs` koristi jednokratni development Clerk ticket i pravi UI. Prošao je kao Anja i kao superadmin Milan: create → override H1 → save → dva stale PATCH-a (200/409) → delete. Tok je otkrio i zatvorio tri realna baga: `MissingGreenlet` pri serializaciji `updated_at`, nedozvoljen body na 204 proxy odgovoru i nedostajući pristupačan label za H1.

### CG-C2 — Živa validacija

- [x] Editor projektuje API reviziju u postojeći `ContentEntity` i poziva **isti** `evaluatePublishGate` iz `lib/content-governance/validation.ts`.
- [x] Prikaz nalaza po polju/sekciji sa `message`/`recommendation` i klasama BLOCK/REVIEW_REQUIRED/WARNING/PASSED.

### CG-C3 — Field-level override

- [ ] Prazno polje u CMS revizji prikazuje fallback vrednost iz `content/*.ts` sa vizuelnom oznakom „(fallback iz koda)" — isti princip kao registar dokumenata gde prazan tekst drži gate zatvorenim, ovde prazno polje = fallback se koristi.
- [x] `inherit`/`override`/`hidden` je vidljiv, a public provider radi fallback po pojedinačnom polju.
- [x] `content/*.ts` fajlovi se ne menjaju niti brišu.

### CG-C4 — Review/approve/publish tok

> **2026-07-30 — nadovezuje se direktno na CG-C1b, ne na in-memory seed.** CG-B4 već postoji i testiran je, i CG-C1b (draft editor) već koristi pravi API od prvog dana (Amandman 2) — ova stavka samo dodaje lifecycle dugmad (pošalji na pregled/odobri/objavi/arhiviraj) na već postojeći draft editor. „In-memory seed prvo" ispod je zastarela napomena iz vremena pre nego što je CG-B4 završen — zadržana precrtano radi istorije, ne kao uputstvo.

- [x] Isti obrazac kao `screen-dokumenti.tsx`: dugmad po tranziciji, pravi review endpoint i `usePanelErrors` sa strukturisanim `resource`/`ruleId`/`fieldPath`.
- [x] Backend ne dozvoljava `approved` bez svih efektivnih odluka; review odluke su dozvoljene samo u `in_review`.
- [x] Status se ne menja dok editor ima nesačuvane izmene.
- [x] ~~In-memory seed prvo (isti put kao registar dokumenata pre LD-5/7) — API wiring dolazi kad CG-B4 postoji i kad je testiran.~~ Zastarelo — CG-B4 već postoji, CG-C1b već koristi pravi API.

### CG-C5 — Tiptap editor — **ADR-017 §10** — ✅ zatvoreno 2026-07-30

- [x] **Zavisnosti — deviacija od plana**: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-unique-id`, `@tiptap/extension-blockquote`, `@tiptap/extension-list`. Plan je predviđao zasebne `@tiptap/extension-underline`/`@tiptap/extension-link` pakete (Tiptap v2-era pretpostavka) — u Tiptap v3.29.2, `StarterKit` već uključuje `underline`/`link` kao podesive pod-ekstenzije, pa ta dva paketa nisu ni potrebna kao zasebne zavisnosti. Svih pet paketa potvrđeno **MIT** pre instalacije (ADR-017 A1.4 — nijedan `@tiptap-pro`).
- [x] **Šema ograničena tačno na `RichDoc` čvorove i marks** — `codeBlock`/`code`/`horizontalRule`/`strike`/`hardBreak` isključeni u `StarterKit.configure()`; `heading` ograničen na `levels: [2,3,4]`; `blockquote`/`listItem` zamenjeni sopstvenim `.extend({content: "paragraph"})` varijantama (StarterKit default dozvoljava `block+`, RichDoc-ov `QuoteBlock`/`ListItem` drže spans direktno — ograničenje na tačno jedan pasus čini `rich-doc-adapter.ts`-ovo mapiranje uvek 1:1, nikad dvosmisleno).
- [x] `rich-doc-adapter.ts` — dvosmerno `Tiptap JSON ↔ RichDoc`, 9 round-trip testova (svaki tip bloka, svaka vrsta mark-a, kombinovan dokument, nepoznat tip čvora se preskače bez bacanja, blok bez id-ja dobija svež id).
- [x] **Stabilni blok id-jevi (ADR-017 §2) čuvani preko `@tiptap/extension-unique-id`** — zvaničan Tiptap paket tačno za ovu semantiku (dodeli pri kreiranju, sačuvaj kroz izmene, dodeli nov pri deljenju/dupliranju čvora) umesto ručno pisanog ProseMirror plugin-a.
- [x] **U bazu ide `RichDoc`, ne Tiptap JSON** — `onChange` uvek prolazi kroz `tiptapDocToRichDoc()` pre nego što stigne roditeljskoj komponenti.
- [x] Toolbar: H2/H3/H4, ul/ol, citat, bold/italic/underline, link (inline dijalog sa `isAllowedHref` validacijom — isti RICH-003 allowlist kao renderer i backend normalizator, `isAllowedUri` hook na Tiptap `Link` ekstenziji), poništi/ponovi.
- [x] `readOnly` za `published`/`archived`/`in_review` revizije — u `screen-dokumenti.tsx`, gde je ovo jedino mesto danas gde se ne-draft stanje stvarno dostiže: umesto Tiptap instance u read-only modu, prikazuje se laganiji `<RichText>` renderer (bez ProseMirror overhead-a za čisto prikazivanje), ograničen na 500 px sa internim scrollom kao editor.
- [x] Autosave — commit na blur (isti obrazac kao textarea stopgap koji zamenjuje), objava ostaje eksplicitna. 409 iz CG-B3 već ide kroz postojeći `reportApiError`/`usePanelErrors` mehanizam.
- [x] Ožičeno na oba mesta koja su koristila textarea stopgap: `slot-field-editor.tsx` (CG-C1b, `rich` kind) i `screen-dokumenti.tsx` (LD-7).

- [x] **Paste handler → isti backend normalizator.** HTML clipboard se šalje na `/content/rich-doc/normalize-html`; normalizovani RichDoc se ubacuje na kursor. Ako servis nije dostupan, fallback je isključivo plain text.
- [x] **Dugme „Uvezi `.docx`" u panelu.** Prikazuje preview i nalaze; ništa ne piše dok autor ne klikne „Primeni uvezeni sadržaj".

### CG-C6 — SEO panel sa živim pregledom — **ADR-017 §11**

- [x] Sekcija „SEO i deljenje": `title`, `description`, `ogImageAssetId`, verzionisani uz reviziju kroz migraciju `20260730_0008`.
- [x] **Živi pregled Google rezultata** i **OG kartica**, uz postojeće limite.
- [x] Upozorenje kad je `description` prazan ili identičan naslovu.
- [x] Panel ne uvodi novi discoverability model; koristi postojeći `SeoFields`.

---

## Faza D — Javni renderer — ne počinjati pre Faze C

### CG-D1 — Provider resolver

- [x] `getContentProvider(): Promise<ContentProvider>` vraća CMS-backed provider kad javni read-model ima objavu, inače `staticContentProvider`.
- [x] Javni call-site-ovi, metadata/JSON-LD, sitemap i legacy booking redirect koriste resolver; raw singleton ostaje samo u statičkoj implementaciji i browser editor validaciji.
- [x] `metadataForRoute`/`jsonLdForRoute` primaju provider i padaju na statički fallback umesto `throw`.

### CG-D2 — CMS provider implementacija

- [x] `CmsContentProvider implements ContentProvider`; backend javni endpoint vraća samo objavljene payload-e bez actor/lock/review podataka, a provider nadjačava postojeći statički entitet polje-po-polje.
- [x] Test eksplicitno tvrdi da prva objava menja `listPublished()` i produkcijski sitemap.
- [x] **Odluka za net-new stranice (2026-07-30):** sistemske rute se ne kreiraju ponovo; biraju se iz registra i menjaju isključivo kroz unapred definisanu strukturu sekcija/polja/limita/slika. Slobodne stranice su samo „Dokumenti i saglasnosti", sa minimalnim javnim layoutom (header + hero + strukturirani RichDoc/Wiki sadržaj + footer).
- [x] **Sistemski katalog učitan (2026-07-30):** svih 31 postojećih identiteta iz javnog fallback registra prikazuje se svakom tenantu u tabovima Stranice/Usluge/Terapeuti/Programi/Kompanije/Paketi; bez revizije ostaju označeni kao fallback iz koda, a prvim izborom nastaje prazna tenant revizija. Backend dozvoljava kreiranje samo tačnog registrovanog `contentType + slug + template + sr-Latn` spoja. Pravne rute nisu duplirane (ostaju u registru dokumenata), `/booking-widget` nije sadržaj već razvojni UI preview, a sistemski editor nema `.docx` uvoz. Blog/article i eventualne Kompas edukativne stranice ostaju odložena zasebna odluka.
- [x] **Delete/orphan korekcija:** kada se obriše poslednja dozvoljena draft revizija briše se i prazan entry, pa sledeće otvaranje ponovo može da napravi tenant override; raniji orphan entry bez revizija create tok oporavlja ponovnim korišćenjem identiteta umesto trajnog 409.
- [x] **Eksplicitni management discriminator + custom dokumenti (2026-07-30):** `management = system|document|article|internal` više ne izvodi vlasništvo iz template-a. Sistemski katalog učitava samo `system`; pravne i slobodne stranice pripadaju `document` toku. Dodat je ponovljiv `custom_document` sa stabilnim tenant-unique slugom, Tiptap i `.docx` preview-em u create formi i javnim `/{slug}` rendererom. Postojeće javne sistemske slugove backend i panel odbijaju za custom dokument. Šest posebnih pravnih/consent vrsta ostaje po jedna po tenantu.
- [x] **Custom editor UX posle živog testa:** Tiptap `EditorContent` više nije samo niski unutrašnji contenteditable red; cela površina fokusira editor, blokovi imaju vidljivu hijerarhiju i liste markere, a `useEditorState` reaktivno osvežava aktivna toolbar stanja. Create DOCX preview koristi postojeći `/api/privacy/documents` Route Handler sa `action=import-docx`, čime je uklonjen stvarni Next 405 uzrok. Greške uvoza su status-specifične i findings prikazuju severity/rule/remediation; approval zahtevi su jasno odvojeni od unosa i draft čuvanja.
- [x] **Save + velika dokumenta (drugi/treći živi test):** `UndefinedColumnError` za `legal_documents.slug` pokazao je da lokalna development baza nije dobila migraciju `20260730_0009`; migracija je primenjena. Rich editor i pregled su ograničeni na 500 px uz interni panel scrollbar. `ErrorBanner` stranica skroluje na vrh samo kada nastane nova greška, nikad pri promeni odobrenja. Prikaz odobrenja razlikuje obavezna/evidentirana; potvrde mogu da se ponište u `draft`/`in_review`, dok su posle odobrenja/objave neizmenjive.
- [x] **Lifecycle jasnoća + trajni podsetnik (četvrti živi test):** „Objavi” postoji samo u statusu `approved`; objavljena verzija eksplicitno vodi na „Arhiviraj” pa „Nova radna verzija”, a „Zatvori uređivanje” samo skuplja formular. Greške dokumenata ne mogu ručno da se uklone, pa crveni indikator u navigaciji ostaje dok uspešna radnja na istom dokumentu ne ukloni stvarni uzrok. Generička 5xx poruka je prevedena na srpski i zadržava correlation ID za podršku.

### CG-D3 — Cache i preview

- [x] `revalidatePath`/`revalidateTag` posle uspešne objave/arhiviranja. Javni read-model je tagovan i ima 5-minutni bounded fallback; uspešna lifecycle mutacija odmah invalidira tag, konkretnu rutu, pripadajuću listing rutu i sitemap.
- [x] Staff preview ruta za tačnu sačuvanu draft/review reviziju (van `listPublished`, `no-store`, samo `org_admin`/superadmin). Editor ne dozvoljava preview nesačuvanih izmena.

### CG-D4 — Content Health v0.2

- [x] `ContentHealthFinding` ima additivni `ruleVersion`; `requiresApproval` ostaje opcion i ulazi u dinamičku approval matricu.
- [x] Backend proverava sačuvanu CMS reviziju (mode/shape, RichDoc, tekst/count/range limiti, slike, CTA, slug), panel prikazuje serverske nalaze i upozorenja, a approve/publish ponovo računaju iste nalaze bez poverenja u browser.
- [x] `npm run content:check` obuhvata CMS published izvor pored statičkog, validira wire oblik i ne pada tiho na fallback kada je namenski CMS check aktivan.
- [x] `CONTENT_HEALTH_RULES_v0.1.md` prebačen u `CONTENT_HEALTH_RULES_v0.2.md` i dokumentovan additivno.

---

## Faza E — Odloženo (van CMS koda, redosled iz D-043/plan §3)

> **Redosled ažuriran 2026-07-31:** produkcijska priprema je odložena dok features/staging tok ne bude prihvaćen. O-24a je zatvoren D-052, a O-24b D-053/ADR-022. Slede backend registar → panel „Kompas” → CMS selektori. `article`/blog i dalje čeka zasebnu Layout Engine odluku i ADR-019, ali ne blokira registar/panel.

- [ ] Clerk nalozi za Anju/Mariju/Marjana na produkciji (O-17/O-18).
- [ ] Primena migracija: LD-5 (privacy) + CG-B5 (content), po mogućstvu isti dan.
- [x] LD-6 — `intake_submission_ready` čita objavljenu reviziju iz baze.
- [x] LD-7 — FastAPI ruter za registar dokumenata + regenerisan OpenAPI TS klijent; pravi API wiring, actor evidence, custom dokumenti, Tiptap/`.docx` create tok i javni renderer.
- [ ] ADR-015 (B2B coffee widget granice, D-041).
- [ ] R2 Booking Engine.
- [ ] **Kompas — K1 foundation + K2.0–K2.2 panel foundation završeni 2026-07-31:** kanonski registar, migracija D-052 oblasti, lifecycle/audit, staff/public API, locale-aware kanonske putanje, sačuvani 308 aliasi, šest DB-backed tabova i generički create/edit editor postoje. D-054 razdvaja kanonske stranice oblasti/tema od dinamičkog prikaza; slede K2.3 kompletna polja i governance akcije → kontrolisana CMS polja → K3B javni renderer/`CompassGuide` → recommendation/public Kompas. Basic/advanced granica i release mapa ostaju O-21.

### Preduslovi pre bilo kog kataloga sadržaja (D-047)

- [x] **O-24a — Intake & Matching taksonomija (D-052):** pet stabilnih `areas` ID-jeva + display labele, zajednički `contracts/fixtures/taxonomy.v1.json`, frontend/backend parity čitači i migracija postojećih DB profila `20260730_0010`. „Zavisnost" je Anjina potvrđena capability oznaka i opcija upitnika, uz timski handoff.
- [x] **O-24b — CMS/Kompas ugovor (D-053/ADR-022):** managed grupe/teme/publike/ciljevi, zaključane system journey/format/access vrednosti, revision-bound CMS reference i eksplicitni most ka D-052 Intake oblastima. Arhitektura je zatvorena; implementacija je `KOMPAS_TODO.md` K1–K3, a Anjina tabela je registry unos.
- [ ] `ADR-019` (tip `article`) pre bilo kog koda za članke — `ContentType` ih danas namerno izostavlja (`models.py:64`).

### AI sloj nad sadržajem — **posle CMS-a, ADR-017 §12 + A1.1**

> **Šav se pravi u CG-B7 (stabilan `blockId`) i CG-C1 (`fieldPath`); ovde se ne piše nikakav kod unapred.** Stavke stoje da bi se znalo šta šav mora da izdrži.

- [ ] Tabela `ai_suggestions` (`revision_id`, `block_id`, `kind`, `original`, `proposed`, `rationale`, `model`, `status`, `created_at`) — **nikad upis u `slot_data`**.
- [ ] Prihvatanje predloga je **obična ljudska izmena**, pripisana čoveku, diže `lock_version`. Audit ostaje istinit o tome ko je šta napisao.
- [ ] Predlog se poništava kad se hash teksta bloka promeni.
- [ ] Radi **samo nad draft revizijama**, nikad nad objavljenim; **AI nikad ne objavljuje sam** (R6 invarijanta).
- [ ] ⚠️ **`dialect` je po polju/slotu, ne po unosu** (ADR-017 **A1.1**, ispravka §12). Anjin zapis u `content/therapists.ts` ima `quote`/`bio`/`cardExcerpt` na ijekavici, a `areas`/`formats`/`badge` na ekavici — **u istom redu**, jer terminologija nije lični govor (D-017). Entry-level polje to ne može da izrazi; entry vrednost je samo default. Vrednosti: `ekavica | ijekavica | preserve-source`; `preserveVoice` je zaseban flag.
- [ ] AI **nikad ne menja sadržaj u citatu** — `quote` je tip bloka u RichDoc-u, pa je to strukturno pravilo koje validator sprovodi, ne instrukcija koju model može da ignoriše.
- [ ] Pravne revizije i tekstovi saglasnosti su **isključeni iz AI-ja pravilom**, ne promptom.
- [ ] Predlog SEO metadata na osnovu sadržaja — isti mehanizam (predlog, ne upis).

---

## Verifikacija (pokrenuti posle svake faze, ne samo na kraju)

**Frontend:** `npx tsc --noEmit` · `npx eslint src --max-warnings=0` · `npx vitest run` · `npx next build` · `npm run content:check`
**Backend:** `uv run ruff check` · `uv run ruff format --check` · `uv run pyright` · `uv run pytest`
**Novi workspace tab (CG-C1):** e2e auth test (redirect za neulogovane) po obrascu postojećih `workspace-auth` testova.
**Parity (CG-A2/B6/B7/C1):** i vitest i pytest moraju proći nad **istim** fixture fajlom pre nego što se bilo koji CG-A/B zadatak označi ✅ — `legal-publication.v1.json`, `content-publication.v1.json`, `richdoc.v1.json`, `slot-schema.v1.json`.
**Bezbednost uvoza (CG-B8):** `<script>`, `onerror=` i `javascript:` href ne smeju preživeti nijedan ulazni put (docx, rich paste, plain paste) — ovo je blokirajući test, ne upozorenje.
