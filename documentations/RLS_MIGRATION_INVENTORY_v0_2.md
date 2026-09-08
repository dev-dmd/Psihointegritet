# RLS Migration Inventory v0.2 — svih 52 tabele na `head`

**Datum:** 2026-09-07 · **Autoritet:** ADR-023 (Amandman 2) · **Zadatak:** C5 iz `PDC_CONSOLIDATION_MIGRATION_PLAN_v1_1.md`
**Status:** merenje. **Nijedna polisa nije kreirana, nijedan podatak nije migriran, produkcija nije dirana.**

**Izvor podataka:** živa PostgreSQL 18.4 baza na migraciji `c4d81e37b920` (`head`),
`information_schema` + `pg_class` + `pg_constraint` + `pg_policies`, mereno 2026-09-07.

---

## 0. Zašto v0.2 postoji

`RLS_MIGRATION_INVENTORY_v0.1.md` je mereno **2026-08-01**, na `20260731_0012`, i sam sebe upozorava
da je „dve migracije iza head-a". U međuvremenu je shema narasla za dvadeset tabela. v0.1 ostaje
istorijski zapis; **v0.2 je ono što se koristi za GATE B.**

| Merenje | v0.1 (2026-08-01) | **v0.2 (2026-09-07)** | Δ |
| --- | --- | --- | --- |
| Tabela u `public` | 31 | **52** | +21 |
| Sa `organization_id` | 11 | **28** | +17 |
| RLS uključen | 0 | **0** | — |
| Polisa | 0 | **0** | — |
| Migracija primenjeno | `…0012` | `c4d81e37b920` | +21 |

Nalaz **N6** iz migracionog plana je time zatvoren: dvadeset tabela je bilo neklasifikovano.

---

## 1. Runtime stanje uloga — nepromenjeno i dalje blokira RLS

```
uloga                 psihointegritet
rolsuper              t          ← superuser
rolbypassrls          t          ← polise ga ne dodiruju
vlasnik svih tabela   da         ← FORCE bi bio potreban i onda
polisa                0
```

**Jedna uloga radi sve tri stvari** — migracije, runtime i vlasništvo. Sve tri stavke iz ADR-023 §1
i dalje važe: uključivanje polisa bez razdvajanja uloga proizvodi **izgled zaštite bez zaštite**.

ADR-023 §4.1 traži četiri uloge (`bootstrap`, `_owner` NOLOGIN, `_migrator`, `_app`). Danas postoji
jedna. To je **prvi korak Faze 6**, pre ijedne polise.

---

## 2. Klasifikacija — svih 52 tabele

| Klasa | N | RLS |
| --- | --- | --- |
| `GLOBAL` | 2 | ne |
| `BOOTSTRAP` | 1 | ne, uzak `GRANT SELECT` (§6) |
| `ORGANIZATION_SCOPED` | 26 | da, §7.2 |
| `ORGANIZATION_SCOPED_WITH_GLOBAL` | 2 | da, **polisa po komandi** §7.3 |
| `DERIVED_CHILD` | 21 | da, **posle denormalizacije** §5 |
| **UKUPNO** | **52** | |

| # | Tabela | Klasa | `organization_id` | Put do organizacije | Napomena |
| --- | --- | --- | --- | --- | --- |
| 1 | `alembic_version` | `GLOBAL` | — | — | — |
| 2 | `internal_users` | `GLOBAL` | — | — | — |
| 3 | `organizations` | `BOOTSTRAP` | — | — | — |
| 4 | `taxonomy_term_revisions` | `ORGANIZATION_SCOPED_WITH_GLOBAL` | nullable | direktno | — |
| 5 | `taxonomy_terms` | `ORGANIZATION_SCOPED_WITH_GLOBAL` | nullable | direktno | — |
| 6 | `alternative_proposals` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 7 | `appointment_requests` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 8 | `appointments` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 9 | `availability_exceptions` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 10 | `availability_profiles` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 11 | `availability_rules` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 12 | `compass_flow_review_decisions` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 13 | `compass_flow_versions` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 14 | `compass_flows` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 15 | `content_entries` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 16 | `content_review_assignments` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 17 | `guidance_sessions` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 18 | `intake_audit_events` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 19 | `intake_cases` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 20 | `legal_documents` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 21 | `manual_availability_slots` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 22 | `notification_outbox` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 23 | `organization_audit_events` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 24 | `organization_memberships` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 25 | `research_submissions` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 26 | `research_surveys` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 27 | `service_booking_configs` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 28 | `slot_holds` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 29 | `taxonomy_intake_links` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 30 | `taxonomy_term_routes` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 31 | `therapist_matching_profiles` | `ORGANIZATION_SCOPED` | NOT NULL | direktno | — |
| 32 | `consent_records` | `DERIVED_CHILD` | — | intake_cases | — |
| 33 | `content_publication_events` | `DERIVED_CHILD` | — | content_revisions → content_entries | — |
| 34 | `content_review_decisions` | `DERIVED_CHILD` | — | content_revisions → content_entries | — |
| 35 | `content_revision_discovery` | `DERIVED_CHILD` | — | content_revisions → content_entries | dete **mešanog** roditelja (taxonomy_terms) — §5.5; **2 roditelja** — §5.6 |
| 36 | `content_revision_relations` | `DERIVED_CHILD` | — | content_entries | **2 roditelja** — §5.6 |
| 37 | `content_revision_taxonomy_terms` | `DERIVED_CHILD` | — | content_revisions → content_entries | dete **mešanog** roditelja (taxonomy_terms) — §5.5; **2 roditelja** — §5.6 |
| 38 | `content_revisions` | `DERIVED_CHILD` | — | content_entries | — |
| 39 | `content_submit_idempotency` | `DERIVED_CHILD` | — | content_revisions → content_entries | — |
| 40 | `intake_answers` | `DERIVED_CHILD` | — | intake_cases | — |
| 41 | `intake_assignment_events` | `DERIVED_CHILD` | — | intake_cases | **2 roditelja** — §5.6 |
| 42 | `intake_assignments` | `DERIVED_CHILD` | — | intake_cases | **2 roditelja** — §5.6 |
| 43 | `intake_contacts` | `DERIVED_CHILD` | — | intake_cases | — |
| 44 | `intake_free_texts` | `DERIVED_CHILD` | — | intake_cases | — |
| 45 | `legal_document_events` | `DERIVED_CHILD` | — | legal_document_revisions → legal_documents | — |
| 46 | `legal_document_revisions` | `DERIVED_CHILD` | — | legal_documents | — |
| 47 | `taxonomy_intake_link_review_decisions` | `DERIVED_CHILD` | — | taxonomy_intake_links | — |
| 48 | `taxonomy_publication_events` | `DERIVED_CHILD` | — | taxonomy_intake_links | dete **mešanog** roditelja (taxonomy_term_revisions) — §5.5; **2 roditelja** — §5.6 |
| 49 | `taxonomy_review_decisions` | `DERIVED_CHILD` | — | taxonomy_term_revisions | dete **mešanog** roditelja (taxonomy_term_revisions) — §5.5 |
| 50 | `taxonomy_term_relations` | `DERIVED_CHILD` | — | taxonomy_term_revisions | dete **mešanog** roditelja (taxonomy_term_revisions, taxonomy_terms) — §5.5; **2 roditelja** — §5.6 |
| 51 | `taxonomy_term_search_terms` | `DERIVED_CHILD` | — | taxonomy_term_revisions | dete **mešanog** roditelja (taxonomy_term_revisions) — §5.5 |
| 52 | `therapist_matching_profile_support_areas` | `DERIVED_CHILD` | — | taxonomy_terms | dete **mešanog** roditelja (taxonomy_terms) — §5.5; **2 roditelja** — §5.6 |

---

## 3. Tri klase opasnosti u `DERIVED_CHILD` skupu

Nijedna od 21 izvedene tabele **nije sirotan** — svaka ima put do organizacije. Ali tri grupe traže
više od standardne denormalizacije.

### 3.1 Deca mešanih roditelja (ADR-023 §5.5) — **7 tabela**

Najopasniji slučaj u celom poslu, i narastao je sa 2 na 7 od v0.1.

```
content_revision_discovery                 → taxonomy_terms
content_revision_taxonomy_terms            → taxonomy_terms
therapist_matching_profile_support_areas   → taxonomy_terms
taxonomy_publication_events                → taxonomy_term_revisions
taxonomy_review_decisions                  → taxonomy_term_revisions
taxonomy_term_relations                    → taxonomy_term_revisions, taxonomy_terms
taxonomy_term_search_terms                 → taxonomy_term_revisions
```

Roditelj im može imati `organization_id IS NULL` (sistemska osa) **ili** vrednost (tenant termin).
Backfill „uzmi roditeljev `organization_id`" ovde upisuje `NULL` za svaki red koji visi o sistemskoj
osi — a `SET NOT NULL` posle toga puca, ili, gore, polisa te redove tiho sakrije.

**Posledica ako se pogreši:** ne curenje podataka nego **tiho nestajanje sistemskog registra** —
Kompas panel i Intake matching prestaju da rade, i to tek u okruženju gde RLS stvarno radi.

ADR-023 §5.5 traži četiri zaključana pravila i **stvarni enforcement** (trigger/funkcija) za ovu
grupu. Komentar u migraciji nije zaštita.

### 3.2 Tabele sa više roditelja (ADR-023 §5.6) — **8 tabela**

```
content_revision_discovery                 content_revisions, taxonomy_terms
content_revision_relations                 content_entries, content_revisions
content_revision_taxonomy_terms            content_revisions, taxonomy_terms
intake_assignment_events                   intake_cases, therapist_matching_profiles
intake_assignments                         intake_cases, therapist_matching_profiles
taxonomy_publication_events                taxonomy_intake_links, taxonomy_term_revisions
taxonomy_term_relations                    taxonomy_term_revisions, taxonomy_terms
therapist_matching_profile_support_areas   taxonomy_terms, therapist_matching_profiles
```

Za svaku se mora odlučiti **od kog roditelja** se nasleđuje organizacija, i mora postojati
ograničenje da se roditelji ne razilaze. `taxonomy_publication_events` je bio jedini takav u v0.1 i
ADR-023 §5.6 mu je već tražio „tačno jedan roditelj" pravilo; sada ih je osam.

**Četiri tabele su i mešane i višeroditeljske** — `content_revision_discovery`,
`content_revision_taxonomy_terms`, `taxonomy_term_relations`,
`therapist_matching_profile_support_areas`. Te idu prve i najpažljivije.

### 3.3 Trostepeni lanci — roditelj i sam mora dobiti `UNIQUE (id, organization_id)`

```
content_revisions           (content_entries → content_revisions → 4 deteta)
legal_document_revisions    (legal_documents → legal_document_revisions → legal_document_events)
```

Potvrđuje ADR-023 §5.2: composite FK je tranzitivan, pa i međučlan nosi `UNIQUE (id, organization_id)`,
ne samo koren.

> **Napomena o `taxonomy_term_revisions`:** ono je istovremeno **mešano** i **međučlan** lanca
> (`taxonomy_terms → taxonomy_term_revisions → 3 deteta`). Composite FK sa nullable
> `organization_id` ne radi kako se očekuje — `NULL` u FK-u ne poredi se jednakošću. Ovo je jedini
> slučaj u shemi koji traži eksplicitno rešenje pre pisanja polise, i **nije rešen u ADR-023**.

---

## 4. `ORGANIZATION_SCOPED` koje su ujedno deca — 17 tabela

Već nose `organization_id NOT NULL`, pa im denormalizacija nije potrebna, ali **jesu** kandidati za
composite FK: bez njega dete i roditelj mogu pripadati različitim organizacijama.

```
alternative_proposals · appointment_requests · appointments · availability_exceptions
availability_profiles · availability_rules · compass_flow_review_decisions
compass_flow_versions · intake_audit_events · intake_cases · manual_availability_slots
notification_outbox · research_submissions · service_booking_configs · slot_holds
taxonomy_intake_links · taxonomy_term_routes
```

Za njih je posao jeftin — `UNIQUE (id, organization_id)` na roditelju i composite FK na detetu — i
može ići **pre** RLS-a, jer ništa ne menja u ponašanju aplikacije.

---

## 5. Migration-overlap: Psiho production ↔ Sanja production

Pitanje koje odlučuje strategiju Faze 8: **šta se dešava kad se dve baze spoje.**

### 5.1 Shema je identična, i to je dokazano konstrukcijom

Oba backend-a su **isti Railway servis** u različitim environment-ima, sa
`preDeployCommand: alembic upgrade head` u `railway.json`. Isti commit → isti migracioni lanac →
ista shema. Potvrđeno 2026-09-07: `production` i `sanja-production` oba na `7717110`.

**Znači spajanje nema problem usklađivanja sheme.** Ceo rizik je u podacima.

### 5.2 Globalni redovi su deterministički — i to je dobra vest

Migracija `20260731_0011_kompas_taxonomy_registry` ne generiše nasumične UUID-jeve:

```python
_NAMESPACE = UUID("2f7452bf-a102-4c9c-9a3e-5824c6e12540")
def _term_id(axis, stable_id):     return uuid5(_NAMESPACE, f"term:{axis}:{stable_id}")
def _revision_id(axis, stable_id): return uuid5(_NAMESPACE, f"revision:{axis}:{stable_id}:sr-Latn:v1")
```

Provereno na živoj bazi: **17 od 17** globalnih `taxonomy_terms` redova ima tačno onaj `uuid5` koji
migracija izračuna. Isto važi za 17 `taxonomy_term_revisions`.

**Posledica za migraciju:**

| | |
| --- | --- |
| Globalni taxonomy redovi | **identični u obe baze** — pri spajanju se **preskaču**, ne insert-uju |
| Sanjini tenant redovi koji referišu sistemsku osu | FK cilj ima **isti UUID** u ciljnoj bazi → veza preživljava spajanje netaknuta |
| Naivni „insert sve iz izvora" | puca na PK koliziji za tih 34 reda — i to je **ispravno ponašanje**, ne kvar |

Da je seed koristio `uuid4()`, svaka baza bi imala svoju kopiju sistemskih osa i spajanje bi
zahtevalo mapiranje **taksonomije**, ne samo tenant redova. Ova odluka, doneta zbog idempotentnosti,
usput je učinila Fazu 8 izvodljivom.

### 5.3 Sve ostalo je nasumično i mora se mapirati

```
20260810_0022_booking_availability_v2   gen_random_uuid()   ← availability_profiles, tenant-scoped
20260722_0001_intake_matching_foundation bulk_insert         ← therapist_matching_profiles, tenant-scoped
runtime (uuid4 default na svakom modelu)                     ← svi poslovni redovi
```

Za njih važi §10.2 migracionog plana bez izmene: mapping tabela `source_uuid → target_uuid`,
topološki redosled, `organization_id = Sanjin UUID u TARGET bazi`.

### 5.4 Šta ostaje neizmereno

Nisam čitao produkcione baze — nemam Railway pristup (M3), a produkcioni kredencijali sa Vercel-a
nisu korišćeni. Sledeće se **mora potvrditi na živim bazama pre Faze 8**:

- [ ] obe baze zaista na `c4d81e37b920` (`alembic_version`)
- [ ] broj globalnih taxonomy redova u obe = 17/17, sa istim `uuid5` vrednostima
- [ ] postoji li ijedna PK kolizija van te 34 globalna reda
- [ ] Sanjin `organizations.id` u izvoru i u cilju (očekivano **različiti** — provisioning je nezavisan)

---

## 6. Redosled posla za Fazu 6 (GATE B)

Ne izvodi se sada. Zapisano da se ne izmišlja ponovo.

```
1. četiri DB uloge (§4.1)                      ← pre ijedne polise
2. DATABASE_URL → _app, MIGRATION_DATABASE_URL → _migrator (§4.2)
3. composite FK za 17 tabela iz §4              ← jeftino, bez promene ponašanja
4. denormalizacija 14 „čistih" DERIVED_CHILD tabela (21 − 7 mešanih)
5. 7 tabela sa mešanim roditeljem (§3.1)        ← trigger/enforcement, ne komentar
6. odluka o nullable composite FK za taxonomy_term_revisions (§3.3)
7. UNIQUE (id, organization_id) na content_revisions i legal_document_revisions
8. polise: 26 scoped + 21 derived (§7.2), 2 mešane po komandi (§7.3)
9. FORCE ROW LEVEL SECURITY svuda
10. startup guard (§4.3) sa imenovanim objektom
11. negativni testovi: izostavljen filter → 0 redova; pod _migrator → redovi
```

Koraci 1–3 ne menjaju ponašanje aplikacije i mogu ići rano. Korak 5 je onaj koji obara Kompas ako se
pogreši.

---

## 7. Zaključak

Shema je narasla za dve trećine otkad je ADR-023 pisan, a opasni deo je narastao brže od bezopasnog:
deca mešanih roditelja sa 2 na 7, višeroditeljske tabele sa 1 na 8. **RLS je danas veći posao nego
što ADR-023 opisuje**, i to je jedini razlog zašto je ovaj inventar ponovljen pre Faze 6, a ne tokom nje.

Spajanje baza je, suprotno očekivanju, **lakše** nego što je izgledalo: shema je identična po
konstrukciji, a sistemska taksonomija deterministički deljena. Ostaje mapiranje tenant UUID-jeva —
mehanički posao sa jasnim kriterijumom provere.
