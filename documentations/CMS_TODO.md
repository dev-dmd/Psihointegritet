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
- [ ] Uvoz i paste dele **jedan** normalizator (ADR-017 §7). Dve implementacije znače da nalepljeno i uploadovano tiho daju različit rezultat.
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

> **Nalaz 1 — odobrenja imaju dve ose, ne jednu.** `CONTENT_GOVERNANCE_CONTRACT` §6 daje matricu po *vrsti sadržaja*, ali `CONTENT_PUBLISH_GATES` §4 pokazuje da `LegalPage` traži `legal` + `business` — a legal stranica je `static_page` tip na `legal_page` template-u. Zato je matrica razdvojena na `BASE_REQUIRED_APPROVALS` (po `ContentType`) + `TEMPLATE_REQUIRED_APPROVALS` (additivno po template-u). Isti tip na drugom template-u traži drugačije potpise.
>
> **Nalaz 2 — `business` je pod (floor) za sve tipove.** Nijedan izvorni dokument ne navodi javni tip koji se objavljuje bez ijednog odobrenja, a Engines §9.3 stavlja „brend, CTA, cenu i objavu" na org admina. Traženje jednog potpisa je konzervativno čitanje, ne izmišljeno pravilo. **Ako tim želi da obične informativne stranice idu bez odobrenja, to je proizvodna odluka — ne izmena u kodu usput.**
>
> **Nalaz 3 — `LIMIT-002` se namerno NE sprovodi ovde.** `maxOptionalSections` broji ponovljive iteme *unutar* slota, ne različite ključeve slotova; nijedan template u registriju nema više opcionih slotova od sopstvenog maksimuma, pa provera po ključu nikad ne bi mogla da se aktivira. Sprovođenje traži oblik slot payload-a koji definiše **CG-C1**. Test `test_no_template_has_more_optional_slots_than_its_maximum` čuva tu pretpostavku.
>
> **Bezbednosna granica (upisana u docstring modula):** `extra_findings` moraju biti izračunati na serveru. Klijent ne sme da pošalje „nema nalaza" i objavi nepregledan sadržaj — ruter (CG-B4) ih računa, nikad request body. Port punog rule engine-a (SEO, CTA, limiti) je **CG-D4**; do tada backend ima samo strukturnu proveru kao sopstveni pod.

### CG-B3 — Konkurentnost · **spojen sa CG-B4 (D-047)** — 🟡 backend gotov, editor UX bez potrošača

> ⚠️ **Ne isporučuje se sam.** Ovo je poštovano — oba zadatka su implementirana i isporučena zajedno.

- [x] `ContentRevision.lock_version: int` — postojao od `20260726_0004`; sada mu je dodat pisac.
- [x] **Optimistic locking — odluka: SQLAlchemy `version_id_col`, ne ručni `UPDATE...WHERE`.** `ContentRevision.__mapper_args__ = {"version_id_col": lock_version}` (`models.py`) — SQLAlchemy sam dodaje `WHERE lock_version=:trenutno` na svaki UPDATE i uvećava ga, bacajući `StaleDataError` (uhvaćeno u `service.py::update_revision` → 409) kad 0 redova pogodi. Isti ishod kao ručna `UPDATE...WHERE` provera, manje koda, standardan SQLAlchemy 2.0 obrazac dokumentovan tačno za ovu namenu. **Dodatno**, servis eksplicitno proverava `request.lockVersion == revision.lockVersion` PRE mutacije (jasna poruka „izmenjeno u međuvremenu" bez čekanja na flush) — ORM mehanizam ostaje odbrana za usku trku između SELECT-a i UPDATE-a unutar iste transakcije.
- [x] Objava (status→published) + `ContentPublicationEvent` u istoj transakciji, uz arhiviranje prethodne objavljene revizije istog unosa (`_archive_other_published`, isti obrazac kao pravni registar).
- [ ] **Editor na 409 prikazuje „neko drugi je izmenio"** — **nema frontend potrošača** ovog API-ja u ovom prolazu (nijedan UI ga ne poziva), pa ova UX stavka ostaje otvorena do Faze 1/CG-C4.

### CG-B4 — Router · **nosi i CG-B3** — 🟡 backend gotov, bez TS klijenta; putanje odstupaju od originalnog nacrta

- [x] `backend/src/psihointegritet/modules/content/router.py` — obrazac `modules/guidance/router.py` team_router: Clerk JWT + `resolve_staff_actor` + eksplicitna `org_admin` provera (isti `_org_admin_actor` obrazac kao `modules/privacy/router.py`).
- [x] Endpoints — **stvarne putanje se razlikuju od originalnog nacrta ispod** (usklađene sa LD-7 obrascem umesto sa ranije zamišljenim `/content/revisions/{id}/...`, jer revizija bez svog `entry_id`-a u putanji ne može tenant-scope-ovati lookup bez dodatnog upita): `GET/POST /content/entries`, `GET /content/entries/{id}`, `PATCH /content/entries/{id}/revisions/{id}`, `GET .../revisions/{id}/publish-check`, `POST .../revisions/{id}/transition` (nosi i „objavi" i „arhiviraj" — cilj je u `target`, nema zasebnog `/publish`/`/archive`), `POST .../revisions/{id}/reviews` (ne `/review`), `DELETE .../revisions/{id}`. Nema zasebnog `POST /content/entries/{id}/revisions` — nova draft revizija nastaje samo kroz A.2 reissue (`update`/`transition` na `approved`/`archived` reviziju), nikad eksplicitnim pozivom.
- [x] `schemas.py` — Pydantic modeli (`ApiSchema` sa `to_camel` alias generatorom, isti obrazac kao `modules/privacy/schemas.py`). `slot_data` je namerno sirov `dict[str, object]` na wire-u, ne tipizovana unija devet template oblika — ista odluka i isto obrazloženje kao RichDoc na LD-7 API-ju (CG-C1 registar šema slotova još ne postoji).
- [ ] **`npm run api:generate` nije pokretan** — nema ni ručno pisanog TS klijenta, jer CG-B3+B4 nema frontend potrošača (CG-C1/CG-C4 dolaze u Fazi 1). Registrovan u `api/v1/router.py` kao `content_router`.
- [ ] **`ContentReviewDecision` je prava tabela** (za razliku od pravnog registra koji odobrenja drži kao JSON listu) — `record_review_decision` upisuje/ažurira red po `(revision_id, capability)`, uz `decided_by_user_id`/`decided_at`/`note` (D-033 evidencija).
- [ ] `check_publish` poziva `check_publishable()` iz CG-B2 sa `extra_findings=()` — **puni rule engine (SEO/CTA/limiti) još ne postoji** (CG-C1/CG-D4); danas radi samo strukturna provera obaveznih/dozvoljenih slotova nasleđena iz `structural_findings`.

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

### CG-B7 — `RichDoc` v1 (autorski format teksta) — **ADR-017 / D-046** — 🟡 kontrakt gotov, testovi namerno odloženi

> **2026-07-29 (D-047 nalog „radi bez testiranja"):** kontrakt, validator i renderer su napisani i ručno pregledani (sintaksa/importi provereni, kompajler nije pokretan). Fixtures i testovi su svesno preskočeni — vraćaju se na kraju CMS + Booking prolaza, pre nego što se ovo označi kao produkcijski gotovo.

**Ugovor (deljen, obe strane)**

- [x] `frontend/src/lib/content-governance/rich-doc.ts` — tipovi `RichDoc`, `RichBlock`, `Span`, `Mark` tačno po ADR-017 §1. `schemaVersion: 1`.
- [x] Blokovi u v1: `heading` (level 2–4), `paragraph`, `list` (`ordered: boolean`), `quote`. **Bez `table`, bez `image`, bez embed-a** (ADR-017 §5, §6).
- [x] Marks u v1: `bold`, `italic`, `underline`, `link` (`{ type: "link"; href: string }`).
- [x] **Stabilan `id` na svakom bloku i svakoj stavci liste** — `createBlockId()` (`crypto.randomUUID()`, isti obrazac kao `legal-documents.ts`'s `generateRevisionId`).
- [x] Python ogledalo: `backend/src/psihointegritet/shared/domain/rich_doc.py` — **odluka: dataclasses + ručan `parse_rich_doc(raw: object)` parser**, ne Pydantic. Razlog upisan u modul docstring: `RichDoc` se tretira kao runtime JSON oblik kakav i jeste u koloni (isti pristup kao `structural_findings` nad `Mapping[str, object]` slot podacima), a ne nešto što poziva prethodno konstruiše.

**Validacija**

- [x] `href` allowlist: `https://`, `mailto:` i interne rute (regex isti kao `validateRedirectRegistry`). `javascript:`/`data:` odbijeni kao **error** (`RICH-003`). *(Napomena: ne ide kroz `cta.ts` registry kao što je prvobitno pisalo — to bi vezalo RichDoc validaciju za CTA akcije, koje su nešto drugačije od slobodnih editorskih linkova u telu teksta; umesto toga koristi se isti path-regex kao redirect registry.)*
- [x] Brojanje znakova ide po **tekstu** (`richDocText`/`rich_doc_text`), marks se ne broje.
- [x] `RICH-0xx` prefiks, aditivno: `RICH-001` nedozvoljen/neparsibilan/nepoznat blok · `RICH-002` nedozvoljen/neparsibilan mark · `RICH-003` nevalidan `href` · `RICH-004` warning (underline+URL) · `RICH-005` prekoračen `maxBlocks` · **`RICH-006` dodat van originalne liste** (dupliran/nedostajući `blockId`) — dokumentovano u `CONTENT_HEALTH_RULES_v0.1.md` §4 kao aditivno proširenje istim obrascem kao `MODEL-004` u CG-B2.
- [x] `H1` se ne prihvata u telu (`level: 2 | 3 | 4` tipski, `Literal[2,3,4]` na Python strani).

**Renderer**

- [x] `frontend/src/components/content/rich-text.tsx`. **Nigde `dangerouslySetInnerHTML`.**
- [x] Nepoznat tip bloka se preskače bez bacanja (implementirano kroz `if`/type-guard lanac sa `return null` na kraju, ne `switch` — namerno, da TS ne tretira taj ogranak kao „unreachable" za deklarisanu uniju, a runtime ipak ostane tolerantan na budući tip).
- [x] `underline` stilizovan odvojeno od linka (`decoration-1` bez boje nasuprot `text-forest underline decoration-sage/60`).

**Parity fixtures — ⬜ namerno odloženo**

- [ ] `contracts/fixtures/richdoc.v1.json` — **nije napravljen u ovom prolazu.**
- [ ] Slučajevi iz liste — **nisu napisani.** Ovo je blokirajuće pre nego što se CG-B7 označi ✅ u `TODO.md` §5D (pravilo sa vrha ovog fajla: „Kad ceo CG-X milestone ovde ima sve kućice ✅, prebaci status").

### CG-B8 — Uvoz `.docx` — **ADR-017 §7** — 🟡 kernel gotov, rate limit i testovi odloženi

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

**Testovi — ⬜ namerno odloženo (CTO nalog)**

- [ ] Fixture `.docx` fajlovi, paritetni test paste↔docx, bezbednosni test `<script>`/`onerror=`/`javascript:` — **ništa od ovoga nije napisano.** Ovo je eksplicitno navedeno kao blokirajuće u `TODO.md` §5D pre nego što se CG-B8 tretira kao produkcijski spreman — bezbednosni test posebno ne sme ostati preskočen dugoročno.

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

### CG-C1 — Tab „Sadržaj"

- [ ] Nova ruta `/radni-prostor/sadrzaj` (`requireOrgAdmin`), nav stavka u `nav.tsx` (ikona, `DocumentIcon`-stil novi `ContentIcon` ili reuse).
- [ ] `npx next typegen` posle dodavanja rute (typedRoutes).
- [ ] Lista po `ContentType` (6 tabova/filtera) → editor revizije po `templateRegistry` slotovima iz `limits.ts` (limit je error pri validaciji, ne promena layouta — isto pravilo kao postojeći Content Health `LIMIT-*`).

**Registar šema slotova (`SlotFieldSpec`) — ADR-017 §9, zatvara CG-B2 Nalaz 3**

- [ ] `frontend/src/lib/content-governance/slot-schema.ts` — `SlotFieldSpec` union: `text` (sa `limit` ključem iz `contentCharacterLimits`) · `rich` (`maxBlocks`, `allowedBlocks`, `maxChars`) · `image` · `imageList` (`min`/`max`) · `cta` · `repeater` (`min`/`max`, ugnežden `item`).
- [ ] Popuniti šemu za **svaki slot svakog od 9 template-a** iz `templateRegistry`. Primer `service_detail.hero`: `{ eyebrow: text(40), title: text(80), lead: text(300), image: image(required) }`.
- [ ] Python ogledalo + `contracts/fixtures/slot-schema.v1.json` (parity, isti obrazac kao CG-A2) — „koliko teksta, koliko pasusa, koliko slika" definisano **jednom**, ne posebno u UI-ju i posebno na serveru.
- [ ] **Sprovesti `LIMIT-002`** — sada kad slot payload ima deklarisan oblik, provera koju je CG-B2 Nalaz 3 morao da odloži postaje moguća. Ukloniti/zameniti `test_no_template_has_more_optional_slots_than_its_maximum` pravom proverom.
- [ ] **Editor se crta generički iz registra** — jedna komponenta čita šemu i renderuje polja. **Ne pisati 9 ručnih editora.** Dodavanje slota kasnije = jedan red u registru + fallback mapiranje, bez nove UI.
- [ ] Brojači uz svako polje: „Pasus 2 od najviše 4", „1.180/1.200 znakova", „Slike: 2 od 3".

### CG-C2 — Živa validacija

- [ ] Editor poziva **isti** `validateEntity`/`evaluatePublishGate` iz `lib/content-governance/validation.ts` — bez novog rule engine-a u workspace kodu.
- [ ] Prikaz nalaza po polju/sekciji sa `message`/`recommendation`; izvedene klase (A.3): `error`→BLOCK crveno, nalaz sa `requiresApproval`→REVIEW_REQUIRED žuto sa imenom capability-ja, `warning`→žuto bez blokiranja, bez nalaza→PASSED (zeleno/bez oznake).

### CG-C3 — Field-level override

- [ ] Prazno polje u CMS revizji prikazuje fallback vrednost iz `content/*.ts` sa vizuelnom oznakom „(fallback iz koda)" — isti princip kao registar dokumenata gde prazan tekst drži gate zatvorenim, ovde prazno polje = fallback se koristi.
- [ ] `content/*.ts` fajlovi se ne menjaju niti brišu.

### CG-C4 — Review/approve/publish tok

- [ ] Isti obrazac kao `screen-dokumenti.tsx`: dugmad po tranziciji, `usePanelErrors` sa strukturisanim `resource` (CG-A3 tip, sada sa pravim `resourceType`/`fieldPath` po CMS nalazu).
- [ ] **In-memory seed prvo** (isti put kao registar dokumenata pre LD-5/7) — API wiring dolazi kad CG-B4 postoji i kad je testiran.

### CG-C5 — Tiptap editor — **ADR-017 §10**

- [ ] Zavisnosti: `@tiptap/react`, `@tiptap/starter-kit` (ili pojedinačne ekstenzije), `@tiptap/extension-underline`, `@tiptap/extension-link`. ⚠️ **Samo MIT paketi — nijedan `@tiptap-pro`** (ADR-017 A1.4). Plaćeni sloj pokriva kolaboraciju, komentare i AI, ništa od toga nije u obimu.
- [ ] **Šema ograničena tačno na `RichDoc` čvorove i marks** — editor ne sme da proizvede sadržaj koji bi validator odbio. Isključiti sve iz StarterKit-a što nije u v1 (code block, horizontal rule, image, strike…).
- [ ] `rich-doc-adapter.ts` — dvosmerno `Tiptap JSON ↔ RichDoc`, sa testovima za round-trip u oba smera.
- [ ] **U bazu ide `RichDoc`, ne Tiptap JSON.** Format mora da preživi promenu editor biblioteke, a Python validator ne sme da mora da razume ProseMirror interne strukture.
- [ ] Toolbar: H2/H3/H4, ul/ol, bold/italic/underline, link (sa dijalogom i `href` validacijom), poništi/ponovi.
- [ ] Paste handler → isti backend normalizator (poziv, ne druga implementacija u browseru).
- [ ] Dugme „Uvezi `.docx`" → CG-B8 endpoint → prikaz izveštaja o uvozu **pre** primene na reviziju.
- [ ] `readOnly` za `published`/`archived` revizije — isto pravilo koje `screen-dokumenti.tsx` već ima (CG-A1).
- [ ] Autosave draft-a; **objava ostaje eksplicitna**. Na 409 iz CG-B3 prikazati „neko drugi je izmenio" sa opcijom da autor vidi razliku — nikad tiho pregaziti ili izgubiti tekst.

### CG-C6 — SEO panel sa živim pregledom — **ADR-017 §11**

- [ ] Sekcija „SEO i deljenje" u editoru: `title`, `description`, `ogImageAssetId` — **model se ne menja**, `SeoFields` i `seoTitle`/`seoDescription` limiti su već tu.
- [ ] **Živi pregled Google rezultata** (naslov/URL/opis kako se stvarno prikazuje, sa presecanjem na limitu) i **OG kartica**.
- [ ] Upozorenje kad je `description` prazan ili identičan naslovu.
- [ ] Bez izmena u `discoverability.ts` — panel samo prikazuje ono što taj generator ionako proizvodi.

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

### Preduslovi pre bilo kog kataloga sadržaja (D-047)

- [ ] **O-24 taksonomija** — unifikovati `areas` u kontrolisani rečnik sa stabilnim ID-jevima + display labelama, `contracts/fixtures/taxonomy.v1.json` čitan sa obe strane. ⚠️ **Danas postoje četiri kopije i drift je već nastupio** (`matching.py:160` ima `"zavisnost"`, frontend nema nijedan pogodak; seed migracija `20260722_0001:478` ju je upisala u bazu). Nove ose se **ne dodaju** dok unifikacija ne prođe — inače je svaka peta kopija.
- [ ] Re-keying menja rečenice razloga u vođenom izboru (D-025) → **traži Anjinu potvrdu, nije refaktor**.
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
