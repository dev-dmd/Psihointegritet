# ADR-023 — Multi-tenant izolacija: `organization_id` granica i PostgreSQL RLS

**Status:** Accepted (dokumentaciona odluka; implementacija ide kroz tri odvojena PR-a)
**Datum:** 2026-08-01
**Vlasnik tehničke odluke:** Milan Dražić (CTO)
**Povezano:** D-051 · D-052 · D-053 · **D-055** · ADR-016 · ADR-018 · ADR-022 · `ARCHITECTURAL_RULES_NEXTJS_REACT_QUERY_v1.1.md` §11, §17, §20 · `CLEAN_PROJECT_ARCHITECTURE_PYTHON_POSTGRES_PSIHOINTEGRITET.md` §4.3, §9, §15, §16 · O-25

> **Ovaj ADR ne sme da se implementira usput u CMS, Kompas, Intake ili Booking PR-u.** Menja bezbednosnu granicu sistema i traži zasebne migracije, odvojene DB uloge i kontrolisan staging rollout.

**Amandman 1 — 2026-08-01 (isti dan, pre ijednog reda koda).** Šest dopuna posle CTO review-a; sve su zaključane u tekstu ispod:

1. **Globalno čitljivo nije globalno upisivo** — mešane tabele dobijaju **politike po komandi** (§7.3), ne jednu `FOR ALL`.
2. **Deca mešanih roditelja** dobijaju četiri zaključana pravila i **stvarni enforcement** (trigger/funkcija), jer komentar u migraciji nije zaštita (§5.5).
3. **`taxonomy_publication_events`** dobija „tačno jedan roditelj" ograničenje i pravilo za **buduće insert-e**, ne samo backfill (§5.6).
4. **Startup guard mora imenovati tačan objekat** (`… owns table content_entries`), ne generičku poruku (§4.3).
5. **Cross-org migracije** — mehanizam ispravljen: `SET ROLE` na vlasnika **sam po sebi ne pomaže pod `FORCE`** (§7.5).
6. **Ponašanje globalnih redova** (update/delete/arhiviranje/override javne labele) je otvoreno kao **O-26**; do odluke važi samo zabrana runtime upisa (§7.3.1).

---

## 1. Kontekst

Izolacija podataka danas počiva **isključivo** na aplikacionom sloju: svaki repository upit mora eksplicitno da nosi `organization_id`. Provereno na živoj bazi 2026-08-01:

| Nalaz | Vrednost |
|---|---|
| Tabela u `public` šemi | 31 |
| Tabela sa `organization_id` | 11 |
| Tabela sa uključenim RLS-om | **0** |
| Polisa | **0** |
| Runtime DB nalog | `psihointegritet` — `rolsuper=t`, `rolbypassrls=t`, **vlasnik svih tabela** |
| Eksplicitnih `organization_id ==` filtera u `modules/` | 42 |

Jedan zaboravljen filter u bilo kom od tih 42 mesta — ili u bilo kom novom upitu — vraća podatke druge organizacije. Aplikaciona provera je neophodna, ali nije dovoljna kao jedina linija odbrane za sistem koji drži intake slučajeve, saglasnosti i podatke o terapijskom radu.

Uz to, tri nezavisna razloga trenutno čine RLS **potpuno inertnim** i da ga danas uključimo: runtime nalog je superuser, ima `BYPASSRLS`, i vlasnik je tabela. Uključivanje polisa bez izmene uloga proizvelo bi **izgled zaštite bez zaštite** — što je gore od nepostojanja RLS-a, jer bi neko posle toga opravdano preskočio eksplicitan filter.

---

## 2. Odluka

### 2.1 Granica izolacije

**`organization_id` ostaje kanonska granica izolacije. `tenant_id` se ne uvodi i `organization_id` se ne preimenuje.**

Razlozi:

- postojećih 14 migracija (`20260722_0001` … `20260801_0014`) je primenjeno na staging i features preko `railway.json` `preDeployCommand: alembic upgrade head` — ne smeju se menjati;
- PostgreSQL polisa referiše kolonu po imenu, bilo kom imenu; `USING (organization_id = …)` radi identično kao `USING (tenant_id = …)`;
- preimenovanje bi povećalo obim i rizik bez ijednog grama dodatne zaštite;
- komercijalna hijerarhija se dodaje **iznad** postojećeg modela, additivno (D-055).

Automatska RLS detekcija iz generičkog `CLEAN_PROJECT_ARCHITECTURE_PYTHON_POSTGRES.md` (`if "tenant_id" in table_object.columns` u `env.py`) **se ne preuzima**. Polise se pišu eksplicitno, u imenovanim migracijama, jedna po tabeli. Implicitna DDL magija u `env.py` nad bezbednosnom granicom je suprotna Rules §17 („production schema changes occur only through Alembic migrations") i nemoguća je za code review.

### 2.2 Hibridna izolacija — dva nivoa, ne jedan

1. **Aplikaciona autorizacija i eksplicitno skopirani upiti** — ostaju obavezni. RLS ih ne zamenjuje.
2. **PostgreSQL RLS** — fail-closed poslednja linija odbrane.

RLS **ne** zamenjuje Clerk autentifikaciju, membership proveru, role/capability autorizaciju, niti eksplicitan `organization_id` u repository upitima. RLS štiti od jedne konkretne klase greške: zaboravljenog filtera.

### 2.3 Granica odgovornosti RLS-a

RLS nosi **isključivo** organization izolaciju. U polise se ne stavlja publication status, capability autorizacija, poslovna ni klinička pravila. `published` filtriranje ostaje u public provider sloju (ADR-016/CG-D2); RLS garantuje samo da taj provider ni greškom ne može da vidi tuđu organizaciju.

---

## 3. Klasifikacija tabela — pet kategorija

Svaka tabela mora biti klasifikovana pre nego što dobije (ili ne dobije) polisu.

| Klasa | Značenje | RLS |
|---|---|---|
| `GLOBAL` | platformski registar bez vlasnika | ne |
| `BOOTSTRAP` | čita se **pre** nego što organization kontekst postoji | posebno pravilo, §6 |
| `ORGANIZATION_SCOPED` | `organization_id NOT NULL`, svaki red pripada tačno jednoj organizaciji | da, standardna polisa §7.2 |
| `ORGANIZATION_SCOPED_WITH_GLOBAL` | mešano: globalni sistemski redovi (`organization_id IS NULL`) + redovi organizacije | da, polisa §7.3 |
| `DERIVED_CHILD` | nasleđuje organizaciju kroz FK; dobija denormalizovan `organization_id` (§5) | da, posle denormalizacije |

### 3.1 Peta kategorija je otkrivena u kodu, nije teorijska

`taxonomy_terms` i `taxonomy_term_revisions` imaju **nullable** `organization_id`, a merenje na živoj bazi daje:

```text
taxonomy_terms            17 od 19 redova  organization_id IS NULL
taxonomy_term_revisions   17 od 17 redova  organization_id IS NULL
```

To su globalne **system ose** iz D-053/ADR-022 (`journey_intent`, `content_format`, izvršive `access` vrednosti) i seedovanih pet D-052 `support_area` oblasti iz migracije `20260731_0011`.

Standardna polisa sa prostom jednakošću sakrila bi svih 17 redova, čime bi **pao Kompas panel i Intake matching**. Ovo je jedina najopasnija zamka u celom poslu: greška ne bi bila curenje podataka nego tiho nestajanje sistemskog registra, i to tek u okruženju gde RLS stvarno radi.

---

## 4. DB uloge

### 4.1 Četiri uloge

| Uloga | Namena | Atributi |
|---|---|---|
| bootstrap (postojeći provisioned nalog) | kreiranje uloga, promena vlasništva, hitne intervencije | superuser — **nikad u `DATABASE_URL` ni `MIGRATION_DATABASE_URL`** |
| `psihointegritet_owner` | vlasnik šeme, tabela, funkcija i polisa | **NOLOGIN**, NOSUPERUSER, NOBYPASSRLS |
| `psihointegritet_migrator` | Alembic | LOGIN, NOSUPERUSER, NOBYPASSRLS, `SET ROLE psihointegritet_owner` |
| `psihointegritet_app` | runtime aplikacija | LOGIN, NOSUPERUSER, NOBYPASSRLS, **nije vlasnik**, samo `SELECT/INSERT/UPDATE/DELETE` na potrebnim tabelama |

`NOLOGIN` na vlasniku je namerno: vlasnički credential ne postoji kao lozinka koja može da procuri.

### 4.2 Environment

```text
DATABASE_URL            → psihointegritet_app
MIGRATION_DATABASE_URL  → psihointegritet_migrator
```

`compose.yaml` i Railway **ne smeju** koristiti isti URL za oba. Danas koriste — to je stavka 1 u rollout planu.

### 4.3 Startup bezbednosna provera

U `lifespan` (`main.py`), samo za `staging` i `production`, boot se prekida ako je bilo šta tačno:

1. runtime uloga ima `rolsuper = true`;
2. runtime uloga ima `rolbypassrls = true`;
3. runtime uloga je vlasnik neke organization-scoped tabele;
4. `DATABASE_URL` i `MIGRATION_DATABASE_URL` koriste isti DB principal;
5. **postoji tabela sa `relrowsecurity = true` a bez ijedne polise** (znači „zabrani sve" — tiho obara funkcionalnost);
6. **postoji zaštićena tabela sa `relrowsecurity = true` a `relforcerowsecurity = false`** (znači „vlasnik prolazi").

Provere 5 i 6 nisu u originalnom predlogu, a hvataju dva stanja u kojima sistem izgleda konfigurisan a nije.

**Poruka mora imenovati tačan razlog i tačan objekat**, ne generičku konstataciju:

```text
Unsafe database role: psihointegritet_app owns table content_entries
Unsafe database role: psihointegritet_app has BYPASSRLS
Unsafe configuration: taxonomy_terms has RLS enabled but no policy
Unsafe configuration: content_revisions has RLS enabled without FORCE
Unsafe configuration: DATABASE_URL and MIGRATION_DATABASE_URL share principal psihointegritet
```

Generično „RLS configuration invalid" bi bilo beskorisno tačno tamo gde je najpotrebnije — na Railway-u, gde se vlasništvo objekata razlikuje od lokalnog okruženja i gde nema pristupa istoj bazi za ručnu proveru.

Development ostaje dozvoljen bez ovih provera, da lokalni rad ne zahteva pun role setup.

---

## 5. Denormalizacija `DERIVED_CHILD` tabela

Od 20 tabela bez `organization_id`, tri nisu izvedene (`alembic_version`, `internal_users`, `organizations` — §3, §6.4), pa **17** poslovnih tabela nasleđuje organizaciju kroz FK. Za svaku:

1. dodati **nullable** `organization_id`;
2. backfill preko roditeljske relacije;
3. potvrditi da nijedan red nije ostao bez organizacije;
4. dodati indeks;
5. dodati zaštitu da dete i roditelj pripadaju istoj organizaciji (§5.2);
6. `SET NOT NULL`;
7. **tek zatim** uključiti RLS.

`EXISTS (SELECT 1 FROM roditelj …)` polisa se **ne koristi** kao standardno rešenje: izvršava se pri svakom pristupu redu, ne koristi prost indeks, teža je za reviziju i ne garantuje da dete pripada istom organization-u kao roditelj.

### 5.2 Composite FK — tranzitivno, ne samo jedan nivo

Roditelj dobija `UNIQUE (id, organization_id)`, dete referencira `FOREIGN KEY (parent_id, organization_id) REFERENCES parent (id, organization_id)`.

**Kod nas lanac ima tri nivoa, ne dva:**

```text
content_entries → content_revisions → content_review_decisions
                                    → content_publication_events

legal_documents → legal_document_revisions → legal_document_events

taxonomy_terms  → taxonomy_term_revisions  → taxonomy_review_decisions
                                           → taxonomy_term_search_terms
                                           → taxonomy_term_relations
```

Znači `content_revisions`, `legal_document_revisions` i `taxonomy_term_revisions` moraju **i sami** dobiti `UNIQUE (id, organization_id)`, ne samo korenske tabele.

### 5.3 Izuzeci — FK koji pokazuje u mešanu tabelu

Composite FK **ne može** da se primeni na referencu ka `ORGANIZATION_SCOPED_WITH_GLOBAL` tabeli, jer bi red organizacije A koji pokazuje na globalni termin (`organization_id IS NULL`) pao na composite ograničenju.

Pogođene reference, sve ka `taxonomy_terms`:

```text
taxonomy_intake_links.topic_term_id
taxonomy_intake_links.support_area_term_id        ← D-052 seed je globalan
therapist_matching_profile_support_areas.support_area_term_id
taxonomy_term_revisions.primary_parent_term_id
taxonomy_term_revisions.journey_intent_term_id    ← system osa, globalna
taxonomy_term_relations.target_term_id / source_term_id
```

Za njih **ostaje prost jednokolonski FK**, a pravilo „ista organizacija ili globalno" sprovodi se kako je opisano u §5.5. Razlog izostavljanja composite FK-a mora biti upisan u migraciju, inače će sledeći čitalac pomisliti da je propušteno greškom.

### 5.5 Deca mešanih roditelja — četiri zaključana pravila

Dete nasleđuje mešani karakter roditelja. Četiri pravila su obavezujuća:

1. **Roditelj je globalan → dete mora biti globalno** (`organization_id IS NULL`).
2. **Roditelj je organizacijski → dete mora imati isti `organization_id`.**
3. **Runtime nikad ne sme da napravi globalno dete** — globalna deca nastaju samo migracijom, kao i globalni roditelji.
4. **Organizacija A ne sme da napravi dete za roditelja organizacije B.**

⚠️ **Komentar u migraciji nije enforcement.** Pošto composite FK ne pokriva globalnog roditelja (§5.3), zaštita je **slojevita i sva četiri sloja su obavezna**:

| Sloj | Šta hvata |
|---|---|
| Prost FK | nepostojeći roditelj |
| **Trigger ili `SECURITY DEFINER` funkcija** koja poredi `organization_id` deteta sa roditeljevim | pravila 1, 2 i 4 na nivou baze — jedini sloj koji radi i kad aplikacija pogreši |
| Polise po komandi (§7.3) | pravilo 3 — `INSERT`/`UPDATE WITH CHECK` ne dozvoljava `NULL` scope iz runtime-a |
| Servisna validacija | jasna srpska poruka umesto sirove DB greške |
| Integracioni test | dokaz da sloj stvarno radi, ne pretpostavka |

Bez trigger sloja pravila 1, 2 i 4 postoje samo kao dogovor, a ovaj ADR postoji upravo zato što se izolacija ne oslanja na dogovor.

### 5.6 `taxonomy_publication_events` — tačno jedan roditelj

Ima dva međusobno isključiva roditelja — `intake_link_id` (organization-scoped) i `term_revision_id` (mešano). Traži tri stvari, ne samo backfill:

1. **`CHECK` ograničenje „tačno jedan roditelj"** — zabranjeno je i da su oba `NULL` i da su oba popunjena (`num_nonnulls(intake_link_id, term_revision_id) = 1`).
2. **Backfill preko `COALESCE`** oba puta, sa sopstvenim testom; ne rešava se generičkim skriptom kao ostalih 16.
3. **Pravilo za buduće insert-e.** Jednokratni backfill ne važi za redove koji tek dolaze — `organization_id` se mora izvesti iz **jedinog aktivnog roditelja** kroz kontrolisan insert tok ili trigger. Ako se ovo izostavi, tabela će posle prve nove objave imati redove sa pogrešnim ili praznim scope-om, a to je tiha greška koju polisa neće prijaviti.

---

## 6. Organization kontekst i bootstrap

### 6.1 Transaction-local, fail-closed

```sql
SELECT set_config('app.organization_id', :organization_id, true);
```

`true` znači transaction-local. **Session-level `SET` je zabranjen** — pooled konekcija se kasnije dodeljuje drugom zahtevu i kontekst bi procurio.

Bez postavljenog konteksta runtime vidi **nula** organization-scoped redova i ne može da kreira niti menja nijedan. Ne postoji podrazumevana organizacija na nivou baze.

### 6.2 Jedna aktivna organizacija po transakciji

Ne postavlja se lista dozvoljenih ID-jeva. Normalan zahtev radi u tačno jednom scope-u. Cross-organization izveštaji i platformska administracija idu kroz zaseban, auditovan tok — svakodnevne polise se **ne** šire na `organization_id IN (...)`.

### 6.3 Stvarni bootstrap problem — kako danas izgleda

**Korekcija originalnog plana:** predloženi „javni custom domen → domain resolver" opisuje mehanizam koji **nema potrošača**. Nema custom domena, postoji jedna organizacija, a **svako** razrešavanje organizacije u kodu ide kroz konstantu:

```text
settings.default_organization_slug = "psihointegritet"
```

12 poziva, i javni i staff put — `modules/privacy/router.py:50,74,99,143`, `modules/content/router.py:63,74`, `modules/content/taxonomy_router.py:62,465,491`, `modules/guidance/router.py:172`, `modules/privacy/service.py:698`.

Praviti domain routing tabelu sada bilo bi kršenje Rules §25 („empty placeholder abstractions added 'for future use' without a current contract"). Domain resolver ostaje **opisan budući korak**, van prvog PR-a; ulazi kad postoji druga organizacija sa sopstvenim domenom.

Stvarni šavovi danas:

```text
_default_organization()      → čita organizations po slug-u, PRE konteksta
resolve_staff_actor()        → čita internal_users + organization_memberships, PRE konteksta
get_database_session()       → api/dependencies.py:44, jedina tačka otvaranja sesije
```

### 6.4 Bootstrap tabele

`organizations` **nema** `organization_id` — njen sopstveni `id` je diskriminator, pa bi polisa glasila `USING (id = app_private.current_organization_id())`. Ali se čita pre konteksta, pa je klasifikovana kao `BOOTSTRAP`: bez RLS-a, sa `GRANT SELECT` na uzak skup kolona i bez ijednog osetljivog podatka u tabeli (danas: `id`, `slug`, `display_name`, `created_at` — zadovoljava).

`internal_users` je `GLOBAL` — Clerk identitet → interni korisnik, bez organizacije; pripadnost ide isključivo kroz `organization_memberships`.

`organization_memberships` je organization-scoped, ali se **čita pre konteksta** da bi se utvrdilo kojim organizacijama korisnik pripada. Rešenje: uz organization kontekst postavlja se i

```sql
SELECT set_config('app.principal_id', :internal_user_id, true);
```

a polisa membership tabele glasi:

```sql
USING (
  user_id = app_private.current_principal_id()
  OR organization_id = app_private.current_organization_id()
)
```

Korisnik vidi svoja članstva pre izbora organizacije; posle postavljanja konteksta vidi članstva te organizacije po svojoj capability granici. Backend redosled ostaje: potvrdi membership → postavi `app.organization_id` → otvori organization-scoped rad.

### 6.5 Izvori konteksta

| Tok | Izvor |
|---|---|
| Staff/admin | Clerk principal → server-side membership → aktivna organizacija → role/capability |
| Javni | danas `default_organization_slug`; kasnije verifikovan domen (§6.3) |
| Background job | **obavezan eksplicitan `organization_id` u payload-u**, validacija prava, zaseban session wrapper, bez podrazumevane organizacije |
| Platform admin | poseban auditovan tok, ne obična request sesija sa neograničenim pravima |

Host vrednost se nikad ne koristi direktno kao SQL ni kao organization ID.

---

## 7. Polise

### 7.1 Helper funkcije

```text
app_private.current_organization_id()  → uuid, NULL kad kontekst nije postavljen, bez fallbacka
app_private.current_principal_id()     → uuid, isto pravilo
```

Šema `app_private` nije dostupna runtime ulozi za izmenu; funkcije su `STABLE`.

### 7.2 Standardna polisa — `ORGANIZATION_SCOPED` i `DERIVED_CHILD`

```sql
USING      (organization_id = app_private.current_organization_id())
WITH CHECK (organization_id = app_private.current_organization_id())
```

`USING` štiti čitanje, izmenu i brisanje; `WITH CHECK` sprečava kreiranje reda u tuđoj organizaciji i „prebacivanje" postojećeg reda.

### 7.3 Polise za `ORGANIZATION_SCOPED_WITH_GLOBAL` — po komandi, ne `FOR ALL`

**Globalno čitljivo nije globalno upisivo.** Jedna `FOR ALL` polisa ne može da izrazi tu razliku, pa mešane tabele dobijaju četiri odvojene polise:

```sql
-- Čitanje: globalni sistemski termini + termini tekuće organizacije
CREATE POLICY read_global_or_own ON <table> FOR SELECT
  USING (organization_id IS NULL
         OR organization_id = app_private.current_organization_id());

-- Kreiranje: isključivo u tekućoj organizaciji
CREATE POLICY insert_own ON <table> FOR INSERT
  WITH CHECK (organization_id = app_private.current_organization_id());

-- Izmena: samo svoji redovi, i posle izmene red mora ostati svoj
CREATE POLICY update_own ON <table> FOR UPDATE
  USING      (organization_id = app_private.current_organization_id())
  WITH CHECK (organization_id = app_private.current_organization_id());

-- Brisanje: samo svoji redovi
CREATE POLICY delete_own ON <table> FOR DELETE
  USING (organization_id = app_private.current_organization_id());
```

Posledice koje ovo zaključava:

- runtime **ne može** da napravi globalan red slanjem `organization_id = NULL`;
- runtime **ne može** da izmeni ni obriše globalan red — `USING` na `UPDATE`/`DELETE` ga ne obuhvata;
- runtime **ne može** da svoj red „promoviše" u globalan, niti da ga prebaci u drugu organizaciju;
- globalni redovi nastaju, menjaju se i arhiviraju **isključivo kroz kontrolisan platformski/migracioni tok** (§7.5).

Isti obrazac po komandi koristi se i za `DERIVED_CHILD` tabele čiji je roditelj mešan (§5.5).

### 7.3.1 Šta ovo namerno ne rešava

Ponašanje globalnog termina pri izmeni javne labele, arhiviranju termina koji koristi više organizacija, kopiranju globalnog u organizacijski termin i organizacijskom override-u **nije odlučeno** — vodi se kao **O-26**. Do te odluke važi samo gornja zabrana: organizacija ne dira globalan red. Očekivani smer (nije obavezujući dok O-26 ne bude zatvoren): globalni sistemski termin + **zaseban** organization-specific prezentacioni override, tako da promena Anjine javne labele ne menja termin svim budućim klijentima platforme.

### 7.4 `ENABLE` i `FORCE`

```sql
ALTER TABLE … ENABLE ROW LEVEL SECURITY;
ALTER TABLE … FORCE  ROW LEVEL SECURITY;
```

`FORCE` se uključuje tek posle uspešnog backfill-a, postojanja polisa, prebacivanja aplikacije na runtime ulogu i provere migracionog procesa.

### 7.5 Cross-organization migracije uz `FORCE`

Sa `FORCE` i vlasnik podleže polisama, pa bi buduća data-migracija koja mora da dotakne sve organizacije **tiho pogodila 0 redova**. Nijedna migracija ne sme da se osloni na slučajno bypass ponašanje naloga, i **`BYPASSRLS` se ne dodeljuje nikome — ni trajno ni privremeno.**

> ⚠️ **Tehnička ispravka (Amandman 1).** Predlog „migrator privremeno preuzme `owner` rolu" je **nedovoljan sam po sebi**: `FORCE ROW LEVEL SECURITY` po definiciji podvrgava i vlasnika polisama, pa `SET ROLE psihointegritet_owner` ne otvara cross-org vidljivost. Isto važi za `SET row_security = off` — za ulogu bez `BYPASSRLS` to ne zaobilazi polisu nego **podiže grešku**. Mehanizam mora biti eksplicitan.

**Prvi izbor — iteracija po organizacijama, bez ikakve eskalacije prava:**

```sql
-- za svaku organizaciju: postavi kontekst pa izvrši isti posao
SELECT set_config('app.organization_id', :organization_id, true);
-- … izmena u okviru te organizacije …
```

Ovo je poželjan put jer ne dira ni uloge ni `FORCE`, radi pod istim pravilima kao aplikacija i trivijalno je za review. Sa jednom organizacijom je i najjednostavniji.

**Drugi izbor — kad posao stvarno mora da preseče sve organizacije odjednom** (npr. popravka koja poredi redove između organizacija):

```sql
SET LOCAL ROLE psihointegritet_owner;      -- 1. preuzmi vlasnika
ALTER TABLE x NO FORCE ROW LEVEL SECURITY; -- 2. skini FORCE tačno za ovaj posao
-- … tačno definisan cross-org posao …
ALTER TABLE x FORCE ROW LEVEL SECURITY;    -- 3. odmah vrati
RESET ROLE;                                -- 4. vrati migrator rolu
```

Obavezno: sve u **istoj transakciji**, sa komentarom zašto iteracija nije bila dovoljna, i sa audit zapisom šta je izmenjeno. Posle migracije startup guard (§4.3) ponovo potvrđuje da runtime nema bypass i da je `FORCE` vraćen — ako je korak 3 propušten, boot pada sa imenovanom tabelom.

---

## 8. Aplikaciona integracija

Kontekst se **ne sme** postaviti pre nego što je organizacija pouzdano razrešena. Postojeći `get_database_session` se razdvaja:

```text
resolve_request_scope
  → verifikuj principal (Clerk) ili javni izvor
  → utvrdi organizaciju
  → otvori transakciju
  → SET LOCAL app.organization_id (+ app.principal_id)
  → yield scoped session
```

---

## 9. Slojevi koje RLS ne štiti

RLS štiti samo PostgreSQL redove. Organization scope moraju nositi i: Redis/cache ključevi, object storage putanje, background queue poruke, search indeks, analytics događaji, rate-limit ključevi, export fajlovi, signed download tokeni, audit logovi.

```text
organization:{organization_id}:content:{entry_id}     ispravno
content:{entry_id}                                    nedovoljno
```

**Stanje danas:** Redis je deklarisan u `core/config.py:33` i **nigde se ne koristi** (1 pogodak u celom backendu). `infrastructure/{storage,queue,email,payments}` su prazni `__init__.py`. Nema keša, reda, storage-a ni search indeksa. Pravilo je zato **unapred obavezujuće za svaki budući ključ**, ali nema šta da se migrira u ovom poslu. Ne pišemo scoping za sistem koji ne postoji (Rules §25).

---

## 10. Obavezni integracioni testovi

Testovi se izvršavaju nad pravim PostgreSQL-om i **kao `psihointegritet_app`**, nikad kao vlasnik.

> ⚠️ `tests/integration/conftest.py:22` se danas povezuje kao `psihointegritet` (superuser + owner + BYPASSRLS). Svih sedam testova ispod bi prošlo **lažno**. Potreban je drugi engine vezan za runtime ulogu. `tests/security/` postoji i prazan je — tu im je mesto.

| # | Test | Očekivanje |
|---|---|---|
| 1 | kontekst A čita poznat red organizacije B | 0 redova |
| 2 | kontekst A radi `INSERT` sa `organization_id = B` | DB odbija |
| 3 | kontekst A menja/briše poznat red B | red nedostupan, 0 promena |
| 4 | runtime uloga bez konteksta čita organization-scoped tabelu | 0 redova |
| 5 | upit nad child tabelom **bez** aplikacionog filtera | samo redovi tekuće organizacije |
| 6 | ista pooled konekcija: zahtev A → commit → zahtev B | B ne nasleđuje kontekst A |
| 7 | javni tok organizacije A ne vraća objavljen sadržaj organizacije B | 0 redova |
| 8 | kontekst A čita globalni system termin (`organization_id IS NULL`) | **vidi ga** — čuva §3.1 od regresije |
| 9 | kontekst A pokušava `INSERT` termina sa `organization_id IS NULL` | DB odbija (§7.3 `insert_own`) |
| 10 | kontekst A pokušava `UPDATE` globalnog termina | 0 pogođenih redova (§7.3 `update_own`) |
| 11 | kontekst A pokušava `DELETE` globalnog termina | 0 pogođenih redova (§7.3 `delete_own`) |
| 12 | kontekst A pokušava da svoj termin prebaci na `organization_id = NULL` ili na B | DB odbija (`update_own WITH CHECK`) |
| 13 | kontekst A pravi dete za roditelja organizacije B | DB odbija (§5.5 trigger) |
| 14 | kontekst A pravi **globalno** dete (`organization_id IS NULL`) | DB odbija (§5.5 pravilo 3) |
| 15 | `INSERT` u `taxonomy_publication_events` sa oba roditelja, pa sa nijednim | DB odbija oba puta (§5.6) |

Testovi 8–15 nisu bili u originalnom planu. 8 i 9 čuvaju sistemski registar od tihog gašenja; 10–12 su jedini dokaz da „globalno čitljivo nije globalno upisivo" stvarno važi; 13–15 dokazuju da trigger sloj postoji, jer bi bez njih pravila iz §5.5 bila samo tekst.

---

## 11. Rollout

### 11.1 Preduslovi pre ijedne RLS migracije

1. lokalni backup;
2. primeniti `20260801_0013` i `20260801_0014` — **lokalna baza je na `20260731_0012`**, dve iza head-a; `pytest` to ne otkriva jer integracioni testovi grade svoju šemu;
3. potvrditi da lokalna, test i migration head imaju istu verziju;
4. rešiti ili eksplicitno izuzeti **D19** schema drift — dok `alembic check` nije čist, ne može biti CI gate koji bi čuvao RLS migracije;
5. ponoviti inventar kolona **tek posle** usklađivanja šeme.

### 11.2 Tri PR-a, ne jedan

**PR 1 — identitet baze i guardovi.** Lokalna baza na head; bootstrap/owner/migrator/app uloge; odvojeni URL-ovi; ownership i grant model; startup guard sa imenovanim objektom. **Još bez ijedne polise na poslovnim tabelama.**

> Kriterijum prihvatanja: aplikacija normalno radi kao `psihointegritet_app`, a testovi dokazuju da RLS **još ne štiti** — to je očekivano i ispravno stanje ovog PR-a.

**PR 2 — organizacioni discriminator i integritet.** `organization_id` na 17 izvedenih child tabela; backfill; indeksi; composite FK gde je dozvoljen; dokumentovani **i sprovedeni** izuzeci (§5.3); mixed/global pravila i trigger sloj (§5.5); poseban slučaj `taxonomy_publication_events` (§5.6). **Još bez masovnog `FORCE` roll-outa.**

> Kriterijum prihvatanja: postojeći funkcionalni tokovi rade, a **nijedno dete ne može da odluta u drugu organizaciju** — dokazano testom, ne pregledom koda.

**PR 3 — RLS enforcement.** `app_private` helper funkcije; principal i organization transaction kontekst; polise **po komandama**; `ENABLE` + `FORCE`; stvarni runtime integracioni testovi; pool leakage; staff membership bootstrap; postepeno uključivanje po grupama modula.

> Kriterijum prihvatanja: **namerno uklonjen aplikacioni filter i dalje ne može da procuri podatke** (test 5).

### 11.3 Grupe aktivacije

Nikad svih 30 tabela odjednom:

1. CMS i pravni dokumenti — sve `NOT NULL`, najjednostavnija grupa;
2. therapist matching profili;
3. Intake;
4. **`consent_records` — imenovana zasebno**, najosetljivija tabela u sistemu (saglasnosti vezane za terapijski kontekst), nasleđuje organizaciju kroz `intake_case_id`;
5. **taxonomy i Kompas registar — namerno poslednji**, jer jedini traži polisu §7.3;
6. ostali operativni moduli i audit.

Posle svake grupe: funkcionalni tok, performanse, query plan, pozadinski zadaci, audit događaji, javne rute.

### 11.4 Indeksi

Najmanje `(organization_id, id)` i `(organization_id, parent_id)`, uz dodatne po stvarnim obrascima. Svi tenant-level unique ugovori uključuju organization scope — npr. `UNIQUE (organization_id, canonical_slug)`.

### 11.5 Produkcija

Backup i test vraćanja · provereni Railway credential-i (**provisioned korisnik je tamo po pravilu vlasnik baze — mora se proveriti, ne pretpostaviti**) · migrator i app odvojeni · kontrolisan termin · monitoring odbijenih DB operacija · unapred definisan rollback.

---

## 12. Šta ovaj ADR ne odlučuje

- **Komercijalna hijerarhija** (`company_accounts` iznad `organizations`) — D-055, zaseban PR **posle** stabilizacije RLS-a. Prvo zaključati postojeću granicu i učiniti je stvarno bezbednom, pa tek onda dodavati nivo iznad. Ne menjati bezbednosnu granicu dok se upravo štiti.
- **`legal_entities`** (tri paušalne radnje) — zaseban model, ne poistovećuje se ni sa organizacijom ni sa brendom.
- **`client_companies`** (B2B) — R4, uz ADR-015.
- **Custom domeni i domain resolver** — §6.3, kad postoji druga organizacija.
- **Platform admin cross-organization tok** — nadograđuje postojeći D-051, ne uvodi paralelan model. Danas ne postoji nijedan cross-organization put jer sve ide kroz `default_organization_slug`, pa nema šta da se auditira; O-25.
- **Ponašanje globalnih taxonomy termina** pri promeni javne labele, arhiviranju, kopiranju u organizacijski termin i organizacijskom override-u — **O-26**. Zabrana runtime upisa iz §7.3 važi odmah i ne čeka tu odluku; override model se ne piše unapred.

---

## 13. Definition of Done

```text
[ ] aplikacija ne koristi superuser, BYPASSRLS niti vlasnički nalog
[ ] DATABASE_URL i MIGRATION_DATABASE_URL koriste različite uloge
[ ] lokalna, test i staging šema su na istom head-u
[ ] svaka organization-scoped tabela ima direktan organization_id
[ ] composite FK štiti child/parent identitet tranzitivno kroz sva tri nivoa
[ ] izuzeci ka mešanim tabelama (§5.3) su napisani, obrazloženi I sprovedeni triggerom (§5.5)
[ ] `taxonomy_publication_events` ima „tačno jedan roditelj" CHECK i pravilo za buduće insert-e (§5.6)
[ ] mešane tabele imaju ČETIRI polise po komandi, ne jednu FOR ALL (§7.3)
[ ] runtime ne može da kreira, izmeni ni obriše globalan red (testovi 9–12)
[ ] runtime ne može da napravi globalno dete ni dete tuđeg roditelja (testovi 13/14)
[ ] polise postoje i aktivne su; svaka tabela sa ENABLE ima bar jednu polisu
[ ] FORCE ROW LEVEL SECURITY je uključen
[ ] nijedna uloga nema BYPASSRLS — ni trajno ni privremeno
[ ] startup guard imenuje tačan objekat, ne generičku poruku (§4.3)
[ ] bez konteksta pristup je zatvoren
[ ] kontekst je transaction-local; pool leakage test prolazi
[ ] A ne može čitati ni menjati B
[ ] globalni system termini su i dalje vidljivi svakoj organizaciji (test 8)
[ ] javni tok A ne vraća podatke B
[ ] background job ne radi bez eksplicitnog scope-a
[ ] cache i storage ključevi nose organization ID (kad ti sistemi nastanu)
[ ] Railway role atributi su provereni po okruženju
[ ] stvarni CMS, Kompas/taxonomy i Intake tokovi rade na stagingu
```

---

## 14. Odbačene alternative

| Alternativa | Zašto ne |
|---|---|
| Preimenovati `organization_id` → `tenant_id` kroz 14 migracija | Migracije su primenjene na staging/features; polisa referiše bilo koje ime kolone; nula dodatne zaštite uz veliki rizik |
| `tenants` tabela + `tenant_id` na CMS/Kompas/booking tabelama | Dodala bi novu kolonu na tačno one tabele koje štitimo — menjanje bezbednosne granice u toku njenog obezbeđivanja |
| Auto-RLS u `env.py` po prisustvu kolone | Implicitna DDL magija nad bezbednosnom granicom, nemoguća za review, suprotna Rules §17 |
| `EXISTS` polisa nad roditeljem za 17 dece | Izvršava se pri svakom pristupu redu, ne koristi prost indeks, ne garantuje isti organization kao roditelj |
| Samo aplikaciono skopiranje (status quo) | Jedan zaboravljen filter u 42+ mesta = curenje podataka između organizacija |
| Samo RLS, bez aplikacionog filtera | Gubi se domenska logika, query planiranje, autorizacione poruke i testabilnost; RLS je poslednja linija, ne jedina |
| `BYPASSRLS` na migrator ulozi radi lakših migracija | Vraća sistem u nebezbedno stanje pri prvoj sledećoj migraciji; §7.5 rešava eksplicitno i auditabilno |
