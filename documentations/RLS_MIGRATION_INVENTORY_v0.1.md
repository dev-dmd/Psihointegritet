# RLS Migration Inventory — klasifikacija svih tabela

**Verzija:** 0.1 · **Datum:** 2026-08-01 · **Autoritet:** ADR-023
**Izvor podataka:** živa development baza na migraciji `20260731_0012`, `information_schema` + `pg_constraint`, mereno 2026-08-01.

> ⚠️ **Inventar se mora ponoviti posle primene `20260801_0013` i `20260801_0014`** (ADR-023 §11.1). Lokalna baza je bila dve migracije iza head-a kad je ovaj snimak napravljen. Kolone koje te dve migracije dodaju (`content_revision_discovery`, `content_revision_relations`) još nisu uračunate.

## Legenda klasifikacija

| Klasa | RLS | Polisa |
|---|---|---|
| `GLOBAL` | ne | — |
| `BOOTSTRAP` | ne | uzak `GRANT SELECT`, čita se pre konteksta |
| `ORGANIZATION_SCOPED` | da | ADR-023 §7.2 |
| `ORGANIZATION_SCOPED_WITH_GLOBAL` | da | ADR-023 §7.3 |
| `DERIVED_CHILD` | da, posle denormalizacije | §7.2 ili §7.3 zavisno od roditelja |

---

## 1. Bez RLS-a (3)

| Tabela | Klasa | Napomena |
|---|---|---|
| `alembic_version` | `GLOBAL` | infrastruktura migracija |
| `internal_users` | `GLOBAL` | Clerk identitet → interni korisnik; pripadnost isključivo kroz `organization_memberships`. Nosi `is_superadmin` (D-051) |
| `organizations` | `BOOTSTRAP` | koren vlasništva; sopstveni `id` je diskriminator. Čita se pre konteksta (`_default_organization()`). Kolone `id`/`slug`/`display_name`/`created_at` — nema osetljivih podataka |

---

## 2. `ORGANIZATION_SCOPED` — direktan `organization_id NOT NULL` (9)

Polisa: ADR-023 §7.2. Nema šta da se denormalizuje.

| Tabela | Grupa | Napomena |
|---|---|---|
| `content_entries` | 1 — CMS | koren CMS lanca; dobija `UNIQUE (id, organization_id)` |
| `legal_documents` | 1 — pravni | koren pravnog lanca; dobija `UNIQUE (id, organization_id)` |
| `therapist_matching_profiles` | 2 | dobija `UNIQUE (id, organization_id)` |
| `guidance_sessions` | 3 — Intake | |
| `intake_cases` | 3 — Intake | koren Intake lanca; dobija `UNIQUE (id, organization_id)` |
| `intake_audit_events` | 3 — Intake | **već ima** `organization_id`, iako je i dete `intake_cases` |
| `taxonomy_intake_links` | 5 — taxonomy | FK ka `taxonomy_terms` je izuzetak §5.3 |
| `taxonomy_term_routes` | 5 — taxonomy | FK ka `taxonomy_terms` je izuzetak §5.3 |
| `organization_memberships` | 6 | **posebna polisa** — vidi §5 ispod |

---

## 3. `ORGANIZATION_SCOPED_WITH_GLOBAL` — mešano (2)

Polisa: ADR-023 §7.3. `organization_id` je **nullable i ostaje nullable**.

| Tabela | Globalnih redova | Napomena |
|---|---|---|
| `taxonomy_terms` | **17 od 19** | system ose D-053/ADR-022 (`journey_intent`, `content_format`, access) + pet D-052 `support_area` iz `20260731_0011` |
| `taxonomy_term_revisions` | **17 od 17** | revizije istih system termina |

**Ove dve tabele nikad ne dobijaju `NOT NULL`.** Standardna polisa bi ih sakrila i oborila Kompas panel i Intake matching.

**Globalno čitljivo nije globalno upisivo.** Mešane tabele dobijaju **četiri polise po komandi** (ADR-023 §7.3), ne jednu `FOR ALL`:

| Komanda | Obuhvat |
|---|---|
| `SELECT` | `organization_id IS NULL OR = current` |
| `INSERT` | samo `= current` |
| `UPDATE` | `USING = current` **i** `WITH CHECK = current` |
| `DELETE` | samo `= current` |

Runtime dakle ne može da napravi globalan red, ne može da izmeni ni obriše postojeći globalan red, i ne može svoj red da „promoviše" u globalan niti da ga prebaci u drugu organizaciju. Globalni redovi nastaju i menjaju se isključivo kroz kontrolisan platformski/migracioni tok.

Ponašanje globalnog termina pri promeni javne labele, arhiviranju i organizacijskom override-u je **otvoreno kao O-26** i ne blokira rollout.

---

## 4. `DERIVED_CHILD` — traži denormalizaciju (17)

Redosled kolona: tabela · roditelj kroz koji se izvodi organizacija · dubina lanca · rollout grupa · polisa posle backfill-a.

| Tabela | Izvor organizacije | Nivo | Grupa | Polisa |
|---|---|---|---|---|
| `content_revisions` | `entry_id` → `content_entries` | 2 | 1 | §7.2 |
| `content_review_decisions` | `revision_id` → `content_revisions` | 3 | 1 | §7.2 |
| `content_publication_events` | `revision_id` → `content_revisions` | 3 | 1 | §7.2 |
| `legal_document_revisions` | `document_id` → `legal_documents` | 2 | 1 | §7.2 |
| `legal_document_events` | `revision_id` → `legal_document_revisions` | 3 | 1 | §7.2 |
| `therapist_matching_profile_support_areas` | `therapist_profile_id` → `therapist_matching_profiles` | 2 | 2 | §7.2 |
| `intake_answers` | `intake_case_id` → `intake_cases` | 2 | 3 | §7.2 |
| `intake_contacts` | `intake_case_id` → `intake_cases` | 2 | 3 | §7.2 |
| `intake_free_texts` | `intake_case_id` → `intake_cases` | 2 | 3 | §7.2 |
| `intake_assignments` | `intake_case_id` → `intake_cases` | 2 | 3 | §7.2 |
| `intake_assignment_events` | `intake_case_id` → `intake_cases` | 2 | 3 | §7.2 |
| **`consent_records`** | `intake_case_id` → `intake_cases` | 2 | **4 (zasebno)** | §7.2 |
| `taxonomy_review_decisions` | `revision_id` → `taxonomy_term_revisions` | 3 | 5 | **§7.3** |
| `taxonomy_term_search_terms` | `revision_id` → `taxonomy_term_revisions` | 3 | 5 | **§7.3** |
| `taxonomy_term_relations` | `source_revision_id` → `taxonomy_term_revisions` | 3 | 5 | **§7.3** |
| `taxonomy_intake_link_review_decisions` | `link_id` → `taxonomy_intake_links` | 2 | 5 | §7.2 |
| `taxonomy_publication_events` | **uslovno**, vidi §6 | 2–3 | 5 | **§7.3** |

### 4.1 Deca mešanih roditelja su i sama mešana

`taxonomy_review_decisions`, `taxonomy_term_search_terms` i `taxonomy_term_relations` visе na `taxonomy_term_revisions`, čijih je 17 od 17 redova globalno. Posle backfill-a njihov `organization_id` je takođe `NULL` za sistemske termine — dakle **§7.3 polise po komandi i bez `NOT NULL`**, ne §7.2. Primena `NOT NULL` ovde bi oborila backfill.

**Četiri pravila (ADR-023 §5.5), sva sprovedena triggerom, ne komentarom:**

1. roditelj globalan → dete globalno;
2. roditelj organizacijski → dete isti `organization_id`;
3. runtime nikad ne pravi globalno dete;
4. organizacija A ne pravi dete za roditelja organizacije B.

Pošto composite FK ne pokriva globalnog roditelja (§7 ispod), pravila 1, 2 i 4 postoje samo ako postoji **trigger ili kontrolisana DB funkcija** koja poredi `organization_id` deteta sa roditeljevim. Testovi 13 i 14 iz ADR-023 §10 su dokaz da taj sloj radi.

---

## 5. `organization_memberships` — posebna polisa

Organization-scoped je, ali se čita **pre** postavljanja konteksta, da bi se utvrdilo kojim organizacijama korisnik pripada (ADR-023 §6.4):

```sql
USING (
  user_id = app_private.current_principal_id()
  OR organization_id = app_private.current_organization_id()
)
WITH CHECK (
  organization_id = app_private.current_organization_id()
)
```

---

## 6. `taxonomy_publication_events` — uslovno izveden roditelj

Ima dva međusobno isključiva roditelja:

```text
intake_link_id    → taxonomy_intake_links      (organization_id NOT NULL)
term_revision_id  → taxonomy_term_revisions    (organization_id nullable, 17/17 NULL)
```

Tri obaveze, ne samo backfill (ADR-023 §5.6):

1. **`CHECK` „tačno jedan roditelj"** — `num_nonnulls(intake_link_id, term_revision_id) = 1`. Zabranjeno je i da su oba `NULL` i da su oba popunjena.
2. **Backfill `COALESCE` preko oba puta**, sa sopstvenim testom; ne rešava se generičkim skriptom kao ostalih 16.
3. **Pravilo za buduće insert-e** — `organization_id` se izvodi iz jedinog aktivnog roditelja kroz kontrolisan insert tok ili trigger. Bez toga tabela posle prve nove objave dobija redove sa praznim ili pogrešnim scope-om, a to je tiha greška koju polisa neće prijaviti.

---

## 7. Izuzeci od composite FK — reference ka mešanoj tabeli

Composite FK `(parent_id, organization_id)` **ne može** da se primeni kada roditelj ima globalne redove — red organizacije A koji pokazuje na globalni termin pao bi na ograničenju.

| FK | Cilj | Zašto izuzetak |
|---|---|---|
| `taxonomy_intake_links.topic_term_id` | `taxonomy_terms` | topic može biti managed ili system |
| `taxonomy_intake_links.support_area_term_id` | `taxonomy_terms` | **D-052 seed je globalan** |
| `therapist_matching_profile_support_areas.support_area_term_id` | `taxonomy_terms` | isto |
| `taxonomy_term_revisions.primary_parent_term_id` | `taxonomy_terms` | hijerarhija može ići ka globalnom |
| `taxonomy_term_revisions.journey_intent_term_id` | `taxonomy_terms` | **system osa, uvek globalna** |
| `taxonomy_term_relations.source_term_id` / `target_term_id` | `taxonomy_terms` | povezane teme mogu biti system |
| `taxonomy_term_routes.term_id` | `taxonomy_terms` | ruta može pokazivati na system termin |

Za sve njih **prost jednokolonski FK ostaje**, a pravilo „ista organizacija ili globalno" sprovodi **trigger ili kontrolisana DB funkcija** (§4.1), uz obavezan komentar u migraciji zašto composite FK nije primenjen. Komentar objašnjava; trigger štiti — potrebna su oba.

---

## 8. Rekapitulacija

| Klasa | Broj |
|---|---:|
| `GLOBAL` | 2 |
| `BOOTSTRAP` | 1 |
| `ORGANIZATION_SCOPED` | 9 |
| `ORGANIZATION_SCOPED_WITH_GLOBAL` | 2 |
| `DERIVED_CHILD` | 17 |
| **Ukupno** | **31** |

Od 17 `DERIVED_CHILD` tabela, **4 dobijaju §7.3 polisu** (deca mešanih roditelja + uslovni `taxonomy_publication_events`), a 13 standardnu §7.2.

---

## 9. Kolona „verified"

Popunjava se tokom rollout-a; prazna dok grupa ne prođe staging proveru.

| Grupa | Tabela | Denorm. | Composite FK | Indeks | Polisa | `FORCE` | Verified |
|---|---|---|---|---|---|---|---|
| 1 | CMS + pravni (7 tabela) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | therapist matching (2) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Intake (7) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | `consent_records` (1) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | taxonomy / Kompas (8) | ⬜ | n/a §7 | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | `organization_memberships` (1) | n/a | n/a | ⬜ | ⬜ | ⬜ | ⬜ |
