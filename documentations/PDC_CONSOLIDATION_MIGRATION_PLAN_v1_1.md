# PDC konsolidacija — objedinjen migracioni plan v1.1

**Datum:** 2026-09-07 · **Vlasnik:** Milan Dražić (CTO) · **Status:** audit + plan, **ne izvodi se**
**Odluka:** D-081 · **Prethodi:** D-077 A7/A8, D-080, ADR-023 (Amandman 2), `PDC_B2_SPIKE_RESULT_v1_0.md`, `PDC_TENANT_ROUTING_AUDIT_v1_0.md`
**Merena osnova:** `20c3d59` (`staging`), origin fetch 2026-09-07

---

## 0. Odnos prema v1.0 — anotacija, ne prepravka

`PDC_CONSOLIDATION_MIGRATION_PLAN_v1_0.md` **ostaje kao istorijski zapis i ne briše se.** Sve što je
u njemu zapisano bilo je tačno u trenutku pisanja. v1.1 ga **nadograđuje (supersedes)** u tri tačke,
i svaka je posledica merenja, ne promene mišljenja:

| v1.0 tvrdi | Mereno stanje 2026-09-07 | Posledica |
| --- | --- | --- |
| §3: „Frontend deo cutover-a je **iza nas**, ne ispred" | B2 postoji **samo na `staging`**. Produkcija servira `29ae344` (`main`), čije je stablo identično merge-base-u — **bez ijednog B2 commita** | §3 važi za granu `staging`, **ne za produkciju**. Dodat je Fazа 0 (git reconcile) kao preduslov svemu |
| §3: „`sanjaneuer.com` + `www` na PDC projektu ✅" | Domeni **jesu** priključeni i `verified=true`, ali `misconfigured: true` — DNS nikada nije upereno na Vercel | Priključenje ≠ konfiguracija. Dodata Faza 4b sa tačnim uzrokom (§4) |
| §5: redosled počinje sa „platform domain na PDC Vercel projekat" | `p-digital-center.com` je **već** na projektu, živ, sa validnim Let's Encrypt sertifikatom | Korak 1 iz v1.0 je delom izvršen. Ostaje samo `PLATFORM_HOST` + `www` politika |

Ništa iz v1.0 §1 (ciljna infrastruktura), §2 (model), §4 (migration artifacts) se **ne menja**.
Ciljna topologija se u ovom dokumentu **ne otvara ponovo** — samo se izvodi.

> **Ispravka terminologije koja se prenosi u sve buduće dokumente:** ne postoji „Sanja backend
> servis". Postoji **jedan** Railway servis raspoređen kroz **više Railway environment-a**. Vidi §5.

---

## 1. CURRENT STATE — stvarno očitano stanje

### 1.1 Kako je mereno

| Sloj | Metod | Pouzdanost |
| --- | --- | --- |
| Git | `git fetch --all` + `rev-list` + `diff` nad tree hash-evima | ✅ direktno |
| Vercel | Vercel REST API (`/v9/projects`, `/v9/projects/*/domains`, `/v6/domains/*/config`, `/v10/.../env`, `/v6/deployments`), read-only GET | ✅ direktno |
| DNS | `dig @1.1.1.1` (NS/A/AAAA/CNAME/CAA) + `openssl s_client` + `curl` | ✅ direktno |
| Kod | `grep`/čitanje repozitorijuma na `20c3d59` | ✅ direktno |
| **Railway** | **CLI token istekao 2026-09-06 22:06 UTC** — GraphQL vraća `Not Authorized` | ⚠️ **izvedeno**, vidi §5 |

**Jedina rupa u auditu je Railway.** Stanje u §5 je rekonstruisano iz `~/.railway/config.json`,
iz Vercel env vrednosti i iz `domain-registry.ts` — ne iz živog Railway API-ja. To je označeno svuda
gde se pojavljuje i **mora se potvrditi pre Faze 7**.

### 1.2 Dijagram — stvarno stanje, ne ciljno

```
GIT
  origin/main     29ae344   ← PRODUKCIJA GRADI OVO. Tree == merge-base. NEMA B2.
      │ 4 merge commita, 0 sadržaja (§2)
  merge-base      b0ea228   (== tip grane `features`)
      │ 30 commitova
  origin/staging  20c3d59   ← B2 routing, tenant-scoped auth, domain registry


VERCEL — projekat `psihointegritet` (prj_keHJiARFXmml5gZtzyAsp0GmFzci)
         team_wFRMcPj8Gzzm1ouGXWNCxTAy · NE postoji projekat imena "p-digital-center"

  p-digital-center.com        ✅ verified · Vercel NS · A ok · LE cert ok · HTTP 200
                              ⚠️ servira <title>Psihointegritet | Psihointegritet</title>
  www.p-digital-center.com    ❌ NIJE u projektu (cert ne pokriva host)
  psihointegritet.com         ✅ verified · Vercel NS · HTTP 200 · = PLATFORM_HOST (prod)
  staging.psihointegritet.com ✅ vezan za granu `staging`
  qa.psihointegritet.com      ✅ vezan za granu `features`
  sanjaneuer.com              ⛔ verified ali misconfigured:true · DNS na Namecheap parking
  www.sanjaneuer.com          ⛔ verified ali misconfigured:true · CNAME → parkingpage.namecheap.com
  psihointegritet.vercel.app  (default)

  Production deployment: 29ae344 (grana main, 2026-08-14) — pre-B2


RAILWAY  ⚠️ IZVEDENO, NIJE POTVRĐENO ŽIVO
  project  valiant-cat-psihointegritet   6b78124b-1dff-46a0-ae24-2387213ddce8
    └── service  diligent-serenity        (a3da48c9-0f6f-4ffa-b473-36023e7c9d78)
          ├── environment production      → diligent-serenity-production-1b3e.up.railway.app
          ├── environment staging         → diligent-serenity-staging.up.railway.app
          ├── environment features        → diligent-serenity-features.up.railway.app  (7474687d-…)
          ├── environment sanja-production→ diligent-serenity-sanja-production.up.railway.app
          └── environment sanja-staging    (a66cc9d3-…)
    + Postgres/Redis resursi po environment-u


BAZA
  RLS polisa u migracijama: 0   (grep nad svih 33 migracije: nijedan CREATE POLICY)
  Tabela (__tablename__):     51   ← ADR-023 je merio 31 (2026-08-01). Inventar je zastareo.
     sa organization_id:      27
     bez organization_id:     24   ← DERIVED_CHILD kandidati + GLOBAL
```

### 1.3 Vercel env — produkcijske vrednosti (dekriptovane)

| Ključ | Production | Preview | Preview/`staging` |
| --- | --- | --- | --- |
| `PLATFORM_HOST` | `psihointegritet.com` | `qa.psihointegritet.com` | `staging.psihointegritet.com` |
| `NEXT_PUBLIC_APP_URL` | `https://psihointegritet.com` | `https://qa.psihointegritet.com` | `https://staging.psihointegritet.com` |
| `NEXT_PUBLIC_API_URL` | `…-production-1b3e.up.railway.app` | `…-features.up.railway.app` | `…-staging.up.railway.app` |
| `DEFAULT_ORGANIZATION_SLUG` | `psihointegritet` | `psihointegritet` | — |
| `DEPLOYMENT_ENV` | `production` | `preview` | `staging` |
| **`ENVIRONMENT`** | **`staging`** ⛔ | `staging` | — |
| **`CORS_ORIGINS`** | **`["https://qa.psihointegritet.com"]`** ⛔ | isto | — |

### 1.4 Nalazi koji nisu bili u planu, a mereni su

| # | Nalaz | Ozbiljnost | Gde se rešava |
| --- | --- | --- | --- |
| **N1** | `ENVIRONMENT=staging` na **production** targetu | 🔴 visoka — ADR-023 §4.3 startup guard se aktivira samo za `staging`/`production`; pogrešna vrednost menja koje se provere i koja grana konfiguracije primenjuju | Faza 2 |
| **N2** | `CORS_ORIGINS` u produkciji dozvoljava **samo** `qa.psihointegritet.com` | 🟠 srednja — ne pokriva nijedan produkcioni origin; posle cutover-a mora da nabroji sva tri | Faza 3 |
| **N3** | Backend tajne (`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `PGPASSWORD`, `POSTGRES_PASSWORD`, `REDIS_URL`, `REDIS_PASSWORD`, `DATABASE_PUBLIC_URL`) postoje kao env na **Vercel frontend** projektu | 🟠 srednja — nisu `NEXT_PUBLIC_`, pa ne cure u browser bundle, ali su kopija produkcionih kredencijala u sistemu koji ih ne koristi; proširuju površinu i rotaciju | Faza 10 (higijena), ne blokira |
| **N4** | `p-digital-center.com` je **živ** i servira `Psihointegritet` naslov | 🟠 srednja — kanonski platformski domen trenutno tvrdi tenant identitet koji je D-080 povukao | Faza 3 |
| **N5** | `www.p-digital-center.com` nije u projektu; sertifikat ga ne pokriva | 🟡 niska | Faza 3 |
| **N6** | ADR-023 inventar meri 31 tabelu; danas ih je **51** | 🟠 srednja — RLS inventar se mora ponoviti pre pisanja polisa, inače 20 tabela ostaje neklasifikovano | Faza 6 (gate) |
| **N7** | `TODO.md` B2-6 preporučuje A zapis `76.76.21.21` | 🟡 niska — Vercel danas kao rank-1 preporučuje `216.150.1.1`; `76.76.21.21` je rank-2 legacy | §4 |

---

## 2. Git — `main`/`staging` divergence i četiri `main-only` commita

### 2.1 Nalaz

```
merge-base(origin/main, origin/staging) = b0ea228   (tip grane `features`)

origin/main..origin/staging   30 commitova
origin/staging..origin/main    4 commita        → grane SU divergirane topološki
```

**Ali — i ovo je ključ cele faze:**

```
git diff b0ea228 origin/main     →  PRAZNO
tree(b0ea228)   = 5e985c32fc56a827a7854c5b9c83f2696e6a0ebd
tree(origin/main) = 5e985c32fc56a827a7854c5b9c83f2696e6a0ebd    ← identično
```

### 2.2 Sva četiri `main-only` commita

Svaki je **merge commit** PR-a iz grane `features`. Nijedan ne nosi sopstvenu izmenu.

| SHA | Datum | Naslov | Drugi roditelj | Sadržaj već u `staging`? |
| --- | --- | --- | --- | --- |
| `87706d0` | 2026-08-12 | Merge PR #22 from `features` | `0bea0a8` „Client panel desktop view" | ✅ da — `0bea0a8` je predak `b0ea228` |
| `07a2746` | 2026-08-12 | Merge PR #24 from `features` | `f801f1f` „Set Clerk roles and team" | ✅ da |
| `2ab8766` | 2026-08-14 | Merge PR #26 from `features` | `1434f92` „test(e2e): align booking assertions" | ✅ da |
| `29ae344` | 2026-08-14 | Merge PR #27 from `features` | `b0ea228` „Booking widget translated" | ✅ da — **to JE merge-base** |

**Zaključak:** `main` je topološki divergiran, ali **semantički je pravi podskup `staging`-a**.
Sva četiri commita su čisto merge-knjigovodstvo grane `features` u `main`; njihov kumulativni tree
je tačno merge-base tree. Nema nijedne izmene koju bi trebalo cherry-pick-ovati, reconcile-ovati
ili ručno prenositi.

### 2.3 Preporučeni postupak — bez gubitka istorije

```bash
git checkout main
git merge --no-ff origin/staging -m "Merge staging into main: B2 tenant routing (D-077 A7/A8, D-081)"
```

**Zašto baš ovo, a ne alternative:**

- **`--no-ff` merge** čuva obe istorije i ne prepisuje nijedan objavljen commit. Rezultujući tree je
  **garantovano jednak** `tree(origin/staging)`, jer je `main` podskup — dakle rezultat je proverljiv
  jednom komandom, ne procenom.
- **Ne `rebase`** — prepisao bi 4 objavljena merge commita i pokvario `features` istoriju.
- **Ne `cherry-pick`** — nema šta da se bira; sadržaj je već tamo.
- **Ne `force push`** — nikad na `main`.
- **Ne fast-forward** — nije ni moguć (`git merge-base --is-ancestor origin/main origin/staging` → false).

**Konflikti:** strukturno nemogući. Merge sa granom čiji je drugi roditelj tvoj predak, kad je tvoj
tree identičan merge-base tree-u, razrešava se trivijalno u korist `staging`-a.

**Obavezna verifikacija posle merge-a, pre push-a:**

```bash
test "$(git rev-parse main^{tree})" = "$(git rev-parse origin/staging^{tree})" \
  && echo "OK: main tree == staging tree" || echo "STOP: trees differ"
```

Ako ovaj test ne prođe — **stati i ne push-ovati.** Prolazak znači da produkcija dobija tačno ono
što je na staging-u već testirano, ni red više.

---

## 3. Zašto `sanjaneuer.com` kaže Invalid Configuration — tačan uzrok

**Ne „DNS nije dobar".** Uzrok je jedan, konkretan i merljiv:

> **`sanjaneuer.com` nikada nije upereno na Vercel. Oba zapisa i dalje pokazuju na Namecheap
> parking stranicu, koja je podrazumevano stanje sveže kupljenog domena.**

### 3.1 Mereno stanje protiv Vercel preporuke

Namecheap **jeste** authoritative — `dns1/dns2.registrar-servers.com` su Namecheap BasicDNS
nameserveri. **Izmene u Namecheap → Domain List → sanjaneuer.com → Advanced DNS imaju efekta.**
(Ovo je bilo otvoreno pitanje u zadatku; odgovor je potvrdan.)

| Zapis | Trenutno (mereno `dig @1.1.1.1`) | Vercel očekuje | Status |
| --- | --- | --- | --- |
| `NS` | `dns1.registrar-servers.com`, `dns2.registrar-servers.com` | (bilo koji, dok su zapisi tačni) | ✅ Namecheap BasicDNS je authoritative |
| `A @` | **`162.255.119.41`** — Namecheap parking IP | `216.150.1.1` (rank 1) ili `76.76.21.21` (rank 2) | ⛔ **pogrešna vrednost** |
| `CNAME www` | **`parkingpage.namecheap.com.`** | `cname.vercel-dns.com.` | ⛔ **pogrešna vrednost** |
| `AAAA` | nema | nema | ✅ |
| `CAA` | nema | — | ✅ ne blokira Let's Encrypt |
| konflikti | `conflicts: []` | — | ✅ nema zaostalih Vercel zapisa |

### 3.2 Vercel odgovor, doslovno

```json
sanjaneuer.com      { "configuredBy": null, "serviceType": "external",
                      "aValues": ["162.255.119.41"],
                      "acceptedChallenges": [], "misconfigured": true }

www.sanjaneuer.com  { "configuredBy": null, "serviceType": "external",
                      "cnames": ["parkingpage.namecheap.com."],
                      "acceptedChallenges": [], "misconfigured": true }
```

`acceptedChallenges: []` je drugi deo odgovora: pošto nijedan zapis ne stiže do Vercel edge-a,
**ACME `http-01` izazov ne može da se završi, pa sertifikat nikada nije ni izdat.** Otud „Invalid
CDN/SSL", a ne samo „Invalid DNS".

### 3.3 Potvrda uživo

```
https://sanjaneuer.com       → connection timed out (parking IP ne odgovara na :443)
https://www.sanjaneuer.com   → SSL: unexpected eof while reading
```

Za poređenje, isti projekat, ispravno upereni domen:

```
https://p-digital-center.com → HTTP 200 · issuer Let's Encrypt · Verify return code: 0 (ok)
```

### 3.4 Šta NIJE uzrok — provereno i isključeno

- ❌ Nije „domen nije dodat projektu" — dodat je, `verified: true`.
- ❌ Nije „vlasništvo nije potvrđeno" — `verified: true` na oba zapisa.
- ❌ Nije zaostali CNAME ka obrisanom `sanja-neuer` Vercel projektu — `conflicts: []`, CNAME
  pokazuje na Namecheap parking, ne na Vercel.
- ❌ Nije „nameserveri nisu Namecheap, pa Advanced DNS nema efekta" — jesu Namecheap.
- ❌ Nije CAA blokada — nema CAA zapisa na `sanjaneuer.com`.

### 3.5 Ispravka koja se izvodi (Faza 4b, **ručno, Milan**)

U Namecheap → Domain List → `sanjaneuer.com` → **Advanced DNS**:

| Akcija | Type | Host | Value | TTL |
| --- | --- | --- | --- | --- |
| **izmeni** postojeći | `A Record` | `@` | `216.150.1.1` | Automatic |
| **izmeni** postojeći | `CNAME Record` | `www` | `cname.vercel-dns.com.` | Automatic |
| **obriši** | `URL Redirect` | bilo koji na `@`/`www` | (parking) | — |

**Ne dirati:** `MX`, `TXT` (SPF/DKIM/DMARC), `_acme-challenge` ako ga Vercel doda sam.
Brisanje email zapisa bi oborilo Sanjinu poštu, koja nije deo ove migracije.

> **Kritično:** ovo se izvodi **tek posle Faze 1** (`main` sadrži B2). Ako se DNS uperi ranije,
> `sanjaneuer.com` će stići na produkciju koja nema host routing i **servirati Psihointegritet
> sajt na Sanjinom domenu**. To je tačno ono što `TODO.md` B2-6 već upozorava.

---

## 4. TARGET STATE — zaključana topologija

Preuzeto iz v1.0 §1 **bez izmene**. Ne otvara se ponovo.

```
PRODUCTION
  Vercel projekat `psihointegritet` (ime ostaje; preimenovanje nije deo plana)
  ├── p-digital-center.com   → PLATFORMA   (PLATFORM_HOST)
  ├── psihointegritet.com    → tenant psihointegritet
  └── sanjaneuer.com         → tenant sanja-neuer
                    │
                    ▼
        JEDAN Railway production environment servisa `diligent-serenity`
                    │
                    ▼
        JEDNA production PostgreSQL
        ├── organization_id = psihointegritet
        ├── organization_id = sanja-neuer
        └── organization_id = budući tenanti

NON-PRODUCTION
  QA frontend ──────┐
                    ├── JEDAN Railway staging environment
  Staging frontend ─┘
                    │
                    ▼
             JEDNA staging PostgreSQL
```

**Nema:** backend po tenantu, baza po tenantu, Vercel projekat po tenantu.
**Tenant je request scope, ne deployment.**

---

## 5. Railway — ispravka terminologije i sudbina svakog environment-a

### 5.1 Razlika koju plan mora da poštuje

```
project      valiant-cat-psihointegritet     ← JEDAN
service      diligent-serenity               ← JEDAN
environment  production | staging | features | sanja-production | sanja-staging   ← PET
database     Postgres/Redis resurs PO environment-u
deployment   instanca build-a servisa u jednom environment-u
```

Formulacija „Sanjin backend servis" iz v1.0 §4 je **netačna** i ovim se povlači. Sanja nema svoj
servis — ima **dva dodatna environment-a istog servisa**, svaki sa svojim Postgres resursom.

**Posledica za plan koja nije kozmetička:** gašenje `sanja-production` **ne briše nikakav kod ni
servis** — briše environment i njegov Postgres volume. Rizik je isključivo u podacima, ne u
deployment-u. To pomera težište Faze 10 sa „ne obriši servis" na „ne obriši volume pre nego što je
migracija verifikovana".

### 5.2 Sudbina po environment-u

| Environment | Status | Odluka | Kada |
| --- | --- | --- | --- |
| `production` | ostaje | **jedini** production backend | — |
| `staging` | ostaje | **jedini** non-production backend; QA i staging frontend oba na njega | Faza 7 |
| `features` | **procenjuje se posebno** | vidi §5.3 | Faza 7 |
| `sanja-production` | migration artifact | gasi se **tek** posle Faze 9 | Faza 10 |
| `sanja-staging` | migration artifact | gasi se **tek** posle Faze 9 | Faza 10 |

### 5.3 `features` — nalaz i preporuka

`features` **nije Sanja artifact** i ne tretira se kao takav. Merene činjenice:

- `qa.psihointegritet.com` je na Vercel-u vezan za granu `features` (`gitBranch: features`);
- `NEXT_PUBLIC_API_URL` za Preview pokazuje na `diligent-serenity-features.up.railway.app`;
- grana `features` postoji i tip joj je `b0ea228` — tačno merge-base;
- sva 4 `main-only` commita su PR-ovi **iz** `features` — to je stvarni development tok, ne ostatak.

**Preporuka:** `features` je **suvišan kao backend environment**, ali `features` **grana** ostaje.
D-081 eksplicitno traži da QA i staging frontend gađaju **isti** staging backend. Kad `qa.…`
pokaže na staging backend (Faza 7), `features` Railway environment gubi jedinog potrošača.

**Ali se ne gasi u Fazi 7.** Ostaje kao izolovan environment za migracije koje bi razbile staging,
dok se ne potvrdi da ga niko ne koristi. Odluka o gašenju je **zaseban zadatak posle Faze 11**, ne
deo ove migracije. Ne brisati bez audita — kako zadatak i traži.

---

## 6. Backend request-scoped tenancy — plan zamene `DEFAULT_ORGANIZATION_SLUG`

### 6.1 Klasifikacija svih poziva

Mereno: **21 poziv `settings.default_organization_slug` u `backend/src`**, plus skripte i testovi.

Nalaz koji plan čini malim: pozivi **nisu razbacani po endpoint-ima**. Skoro svi su unutar
**deset malih modul-lokalnih helper funkcija** koje već primaju `settings` kao dependency.

**MUST MIGRATE — javna tenant rezolucija** (odlučuje čiji se sadržaj servira):

| Fajl | Helper |
| --- | --- |
| `modules/privacy/router.py:53` | `_default_organization()` |
| `modules/privacy/service.py:708` | `resolve_intake_consent_versions()` |
| `modules/content/router.py:78` | `list_public_content()` (public_router) |
| `modules/content/compass_router.py:69` | `_organization_id()` |
| `modules/content/taxonomy_router.py:466` | `get_public_taxonomy()` (public_router) |
| `modules/content/taxonomy_router.py:492` | `resolve_public_taxonomy_route()` |
| `modules/booking/router.py:808` | `_resolve_org_id()` |
| `modules/compass/router.py:59` | `_organization_id()` |
| `modules/research/router.py:66` | `_organization()` |
| `modules/guidance/service.py:368` | organization lookup |

**MUST MIGRATE — staff actor rezolucija** (samo argument `organization_slug`):

| Fajl | Helper |
| --- | --- |
| `api/dependencies.py:81` | `require_superadmin()` |
| `api/dependencies.py:125` | `require_staff()` |
| `modules/privacy/router.py:122` | `_org_admin_actor()` |
| `modules/content/router.py:89` | `_org_admin_actor()` |
| `modules/content/taxonomy_router.py:63` | `_actor()` |
| `modules/guidance/router.py:173` | `_staff_actor()` |
| `modules/compass/router.py:70` | `_actor()` |
| `modules/research/router.py:84` | `_actor()` |

**LOCAL-DEV DEFAULT MAY REMAIN:**

| Fajl | Zašto ostaje |
| --- | --- |
| `core/config.py:59,89–98` | definicija polja + guard koji **traži** eksplicitnu vrednost na deployed okruženjima. Ostaje kao local-dev pogodnost, po D-081 |
| `scripts/tenant_doctor.py` (6 mesta) | dijagnostika koja se pokreće **protiv** jednog environment-a |
| `scripts/seed_research_surveys.py:146` | seed skripta, ne request path |
| `scripts/provision_organization.py:30` | samo docstring |

**UNRELATED:**

| Fajl | Zašto |
| --- | --- |
| `modules/guidance/authorization.py:29,54` | komentar + tekst poruke o grešci |
| `modules/organizations/provisioning.py:71` | docstring |
| `tests/**` (7 mesta) | testovi konstruišu `Settings(...)` eksplicitno |

### 6.2 Osnova koja već radi ispravno

`resolve_staff_actor()` (`modules/guidance/authorization.py:97`) **već** skopira membership na
konkretan `organization.id`:

```python
select(OrganizationMembership).where(
    OrganizationMembership.organization_id == organization.id,   # ← nije globalno
    OrganizationMembership.user_id == user.id,
    OrganizationMembership.status == MembershipStatus.ACTIVE,
)
```

Ovo potvrđuje tvrdnju iz D-081: **jedina greška je odakle organizacija stiže**, ne kako se
autorizacija računa. Popravlja se izvor, ne logika.

### 6.3 Kanonski šav — jedan, ne po endpoint-u

Zadatak izričito traži da se hostname trust **ne** uvodi u svaki endpoint. Predlog:

```
                       JEDAN dependency
request → TenantContext(organization_id, organization_slug, source) → sve ostalo
```

Konkretno:

1. **`api/tenancy.py`** — novi modul sa `get_tenant_context()` FastAPI dependency-jem.
2. **Deset helper-a iz §6.1 prestaju da primaju `settings`** i primaju `TenantContext`. Pozivna
   mesta endpoint-a se **ne menjaju** — helper-i su već dependency-ji.
3. `resolve_staff_actor(session, identity, ctx.organization_slug)` — potpis nepromenjen.

**Redosled poverenja u `get_tenant_context()`:**

```
1. verifikovan tenant header sa trusted frontend-a   → produkcija
2. settings.default_organization_slug                → SAMO ako environment == development
3. inače → HTTP 400, fail-closed
```

### 6.4 Zašto korisnik ne može poslati proizvoljan slug — mereni razlog

Ovo je bezbednosno jezgro §8 zadatka, i audit daje konkretan odgovor.

**Mereno: nijedna klijentska (browser) komponenta ne zove backend direktno.** Svih 18 modula koji
čitaju `NEXT_PUBLIC_API_URL` su server-only — Route Handler-i (`app/api/**/route.ts`) ili moduli sa
`import "server-only"`. Nijedan nema `"use client"`.

```
browser → Next.js server (Vercel)  → Railway backend
          ▲                          ▲
          │ ovde host odlučuje       │ ovde stiže žig koji browser ne može da falsifikuje
          │ (proxy.ts, x-pdc-tenant) │
```

Zato je model poverenja izvodljiv i uzak:

| Kontrola | Kako |
| --- | --- |
| **Ko sme da tvrdi tenant** | Samo Next.js server. Tenant se izvodi iz `Host`-a u `proxy.ts` (već postoji, `x-pdc-tenant`) i prosleđuje dalje kao **server-to-server** header |
| **Zašto browser ne može** | Browser nikad ne govori sa Railway-em direktno; nema endpoint na koji bi poslao lažni slug |
| **Šta ako neko pogodi Railway URL** | Backend prihvata tenant header **samo** uz deljenu tajnu koju drži isključivo Vercel server env (npr. `TENANT_CONTEXT_SIGNING_KEY`). Bez nje → 400, nikad tihi fallback |
| **Šta ako je slug validan ali tuđ** | `resolve_staff_actor()` i dalje traži **aktivan membership u toj organizaciji** (§6.2). Slug otvara vrata, membership odlučuje ko prolazi |
| **Poslednja linija** | RLS (§7) — i kad bi sve gore palo, upit vraća 0 tuđih redova |

**Ključno:** tenant header sam po sebi **ne daje pristup**. On bira *kontekst*; autorizacija i RLS
odlučuju o *pristupu*. Napadač koji uspe da nametne `organizationSlug=sanja-neuer` i dalje nema
membership u toj organizaciji i dobija 403.

---

## 7. SECURITY GATES

Dva gate-a. Nijedan destruktivni ili konsolidacioni korak ne prolazi pre njih.

### GATE A — request-scoped tenant context (Faza 5)

- [ ] `get_tenant_context()` postoji kao **jedini** izvor tenanta u request path-u
- [ ] svih 18 `MUST MIGRATE` mesta iz §6.1 čita `TenantContext`, ne `settings`
- [ ] tenant header se prihvata **samo** uz verifikaciju; bez nje → 400
- [ ] `default_organization_slug` u request path-u radi **samo** kad `environment == development`
- [ ] negativan test: zahtev sa lažnim `x-pdc-tenant` bez potpisa → **400**, ne 200
- [ ] negativan test: validan potpis, tuđ slug, korisnik bez membershipa → **403**

### GATE B — RLS + bezbedna runtime uloga (Faza 6) — **HARD GATE**

**Polazno mereno stanje:** 0 polisa u 33 migracije · runtime uloga `rolsuper=t`, `rolbypassrls=t`,
vlasnik tabela · 51 tabela naspram 31 u ADR-023 inventaru.

- [ ] **inventar ponovljen na 51 tabeli** (N6) — svaka klasifikovana kao `GLOBAL` /
      `BOOTSTRAP` / `ORGANIZATION_SCOPED` / `ORGANIZATION_SCOPED_WITH_GLOBAL` / `DERIVED_CHILD`
- [ ] 24 tabele bez `organization_id` denormalizovane po ADR-023 §5 (7 koraka, redom)
- [ ] tri uloge postoje: `_owner` (NOLOGIN), `_migrator`, `_app`
- [ ] `DATABASE_URL` → `_app`; `MIGRATION_DATABASE_URL` → `_migrator`; **različiti principali**
- [ ] runtime uloga: **NOSUPERUSER, NOBYPASSRLS, nije vlasnik nijedne tabele**
- [ ] polisa za **svaku** `ORGANIZATION_SCOPED` i `DERIVED_CHILD` tabelu
- [ ] `FORCE ROW LEVEL SECURITY` svuda gde je RLS uključen
- [ ] `ORGANIZATION_SCOPED_WITH_GLOBAL` (`taxonomy_terms`, `taxonomy_term_revisions`) ima polisu
      **po komandi** (ADR-023 §7.3) — inače Kompas panel i Intake matching tiho padaju
- [ ] startup guard iz ADR-023 §4.3 aktivan, sa **imenovanim objektom** u poruci
- [ ] **`ENVIRONMENT` na production targetu ispravljen na `production`** (N1) — inače se guard ne
      ponaša kako je specificiran

**Negativni testovi — obavezni, ne opcioni:**

- [ ] repository upit sa **namerno izostavljenim** `organization_id` filterom vraća **0 redova**
- [ ] isti upit pod `_migrator` ulogom **vraća** redove → dokaz da test meri RLS, a ne prazan skup
- [ ] sesija tenanta A ne vidi nijedan red tenanta B ni u jednoj `ORGANIZATION_SCOPED` tabeli
- [ ] globalni `taxonomy_terms` redovi (`organization_id IS NULL`) **ostaju vidljivi** obojici

---

## 8. Faze — Change / Preconditions / Verification / Rollback / Destructive

| Phase | Change | Preconditions | Verification | Rollback | Destructive? |
| --- | --- | --- | --- | --- | --- |
| **0** | Audit (ovaj dokument) | — | dokument izglasan | — | **Ne** |
| **1** | `merge --no-ff staging → main` | Faza 0; staging zelen | `tree(main) == tree(origin/staging)`; CI zelen | `git revert -m 1 <merge>` | **Ne** |
| **2** | Production deploy `main`; `ENVIRONMENT=production` (N1) | Faza 1 | `psihointegritet.com` 200; `x-pdc-surface` prisutan; `/radni-prostor` radi | Vercel *Instant Rollback* na `29ae344` | **Ne** |
| **3** | `PLATFORM_HOST=p-digital-center.com`; `NEXT_PUBLIC_APP_URL`; `CORS_ORIGINS` (N2); `www` politika (N5) | Faza 2 zelena **24h**; Clerk (§9) unapred | `p-digital-center.com/radni-prostor` traži prijavu i radi; `psihointegritet.com` je **samo** tenant | vrati `PLATFORM_HOST` na `psihointegritet.com` + redeploy | **Ne** (reverzibilno) |
| **4a** | `psihointegritet.com` → tenant-only | Faza 3 | `/` = Psiho sajt; `/radni-prostor` na njemu **404** | isto kao Faza 3 | **Ne** |
| **4b** | **Namecheap DNS za `sanjaneuer.com`** (§3.5) | **Faza 1 MORA biti gotova** | `dig +short A sanjaneuer.com` = `216.150.1.1`; `misconfigured:false`; LE cert; sajt = Sanjin | vrati parking zapise | **Ne** (ali vidljivo javno) |
| **5** | Request-scoped tenant context | Faza 4 | **GATE A** u celosti | revert PR; `settings` fallback se vraća | **Ne** |
| **6** | RLS + uloge bez BYPASSRLS | **GATE A** | **GATE B** u celosti | `DROP POLICY` + `DISABLE RLS` + `DATABASE_URL` na staru ulogu | **Ne** (ali menja DB) |
| **7** | Jedan production + jedan staging backend; QA → staging | **GATE B** | Sanjin domen radi kroz **production** backend; QA i staging na istom API-ju | vrati `productionApiBaseUrl` u registry | **Ne** |
| **8** | **Migracija Sanjinih podataka** u zajedničku bazu | **GATE B** + Faza 7 + inventar §10 + **dump** | row-count po tabeli; FK integritet; `organization_id` = Sanjin UUID u **target** bazi na svakom redu | restore iz dump-a; `sanja-production` je i dalje živ | ⚠️ **Da** |
| **9** | Live cross-tenant testovi | Faza 8 | Sanjina sesija: 0 Psiho redova; Psiho sesija: 0 Sanja redova; smoke: booking, intake, content, Kompas | povratak na `sanja-production` preko registry-ja | **Ne** |
| **10** | Gašenje `sanja-production` / `sanja-staging` environment-a i njihovih Postgres volume-a | Faza 9 zelena **≥7 dana** + verifikovan offline dump | environment nestao; produkcija netaknuta | **samo iz dump-a** | 🔴 **Da, nepovratno** |
| **11** | Brisanje `productionApiBaseUrl` iz `domain-registry.ts` | Faza 10 | registry = `{organizationSlug, domains, publicUrl}`; build zelen | revert commit | **Ne** |

### 8.1 Provera zavisnosti — gde se redosled iz zadatka menja i zašto

Polazni redosled je proveren. **Tri izmene**, sve zbog merenih činjenica:

| Izmena | Zašto |
| --- | --- |
| **Dodata Faza 0/1 (git) ispred svega** | Zadatak je to već naslutio. Audit potvrđuje: produkcija gradi `29ae344`, koji **nema B2**. Bez Faze 1 svaki DNS korak servira pogrešan sajt. Dobra vest: merge je bezopasan (§2.2) |
| **`sanjaneuer.com` DNS (4b) pomeren ispred backend konsolidacije** | v1.0 ga nije ni imao kao korak. Sanjin sajt je **danas nedostupan** (§3.3), a popravka zavisi **samo** od Faze 1 — ne od RLS-a ni od tenant context-a. Držati ga iza GATE B bi značilo nedeljama mrtav domen bez ijednog bezbednosnog razloga |
| **Clerk provera pomerena ispred Faze 3, ne posle** | Faza 3 uvodi **nov host na kojem se ljudi prijavljuju**. Ako Clerk ne zna za `p-digital-center.com`, cutover obara prijavu vlasnicima — jedini korak koji može da zaključa i tebe samog (§9) |

**Nepromenjeno i neotvoreno:** GATE A pre GATE B; GATE B pre Faze 7–8; Faza 10 poslednja.

---

## 9. Clerk — samo ono što domain cutover dodiruje

PDC-0D i deljeni Clerk model **ostaju van obima** (v1.0 §7). Ali Faza 3 menja host na kojem se
prijava dešava, pa se ovo mora proveriti **pre** nje.

**Mereno stanje:** jedna Clerk instanca · `signInUrl={SIGN_IN_URL}` gde je `SIGN_IN_URL = "/prijava"`
· **bez** `isSatellite`/`domain` konfiguracije · `proxy.ts:132` gradi `new URL(SIGN_IN_URL, request.url)`
— dakle prijava se dešava **na hostu na kojem je posetilac**.

Pre Faze 3 (Clerk Dashboard, **ručno**):

- [ ] `p-digital-center.com` u **allowed origins**
- [ ] redirect URL-ovi za `/prijava`, `/registracija` na novom hostu
- [ ] after-sign-in vodi na `/radni-prostor` **na platformskom hostu**
- [ ] production ključevi važe za nov domen
- [ ] potvrđeno da su kolačići host-scoped (poželjno — sesija na `sanjaneuer.com` ne curi na
      `psihointegritet.com`)

**Vlasništvo površina posle cutover-a** (nepromenjeno u odnosu na zadatak):

```
p-digital-center.com/workspace | /radni-prostor | /superadmin   → owner/staff/platform
sanjaneuer.com/nalog · psihointegritet.com/nalog                → klijenti
```

**PDC-0D (email identity)** stoji **posle Faze 4**, paralelno sa 5–6. Razlog: `EMAIL_FROM` je danas
`review@psihointegritet.com` i posle cutover-a je tenant vrednost, ne platformska — ali ta odluka
pripada PDC-0D. **Platform/domain migracija ne sme usput hardcode-ovati nove email odluke.**
Faze 1–4 ne diraju `EMAIL_FROM`.

---

## 10. DATA MIGRATION — Sanja → zajednička production baza (Faza 8)

**Ne počinje pre GATE B.** Odvojena baza je do tada jedina stvarna izolacija (ADR-023 Amandman 2).

### 10.1 Inventar pre migracije

Za **svaku** tabelu u izvornoj bazi, snimiti pre i posle:

```
organizations (Sanjin red)      organization_memberships / internal_users
booking (appointments, appointment_requests, availability_*, slot_holds,
         manual_availability_slots, service_booking_configs, alternative_proposals)
intake  (intake_cases, intake_answers, intake_assignments, intake_contacts,
         intake_free_texts, intake_audit_events, intake_assignment_events)
content (content_entries, content_revisions, content_publication_events,
         content_review_*, content_revision_*)
taxonomy (taxonomy_terms, taxonomy_term_revisions, taxonomy_term_routes,
          taxonomy_intake_links, taxonomy_*_decisions, taxonomy_publication_events)
compass (compass_flows, compass_flow_versions, compass_flow_review_decisions)
research (research_surveys, research_submissions)
privacy (legal_documents, legal_document_revisions, legal_document_events,
         consent_records)
audit   (organization_audit_events, notification_outbox)
```

### 10.2 UUID/FK strategija — ne pretpostavljati jednakost

**Ne sme se pretpostaviti da su UUID-jevi isti između baza.** Obe su nastale nezavisnim
`provision_organization()` pozivima.

```
1. u TARGET bazi utvrdi/kreiraj Sanjinu organizaciju → zapamti target_org_uuid
2. napravi mapping tabelu  source_uuid → target_uuid  za SVAKI preneti red
3. prenosi se u FK topološkom redosledu (roditelji pre dece)
4. na svakom tenant-scoped redu:  organization_id = target_org_uuid
5. PK kolizije razrešavaj mapiranjem, NIKAD prepisivanjem postojećeg reda
```

**Očuvanje `id`-jeva je poželjno, ali nije pretpostavka** — gde kolizija postoji, mapiranje pobeđuje.

### 10.3 Verifikacija posle migracije

- [ ] row-count po tabeli: izvor == cilj (za Sanjine redove)
- [ ] referencijalni integritet: 0 osirotelih FK
- [ ] **`SELECT COUNT(*) WHERE organization_id != target_org_uuid` = 0** na svakoj prenetoj tabeli
- [ ] 0 redova bez `organization_id` u `ORGANIZATION_SCOPED`/`DERIVED_CHILD`
- [ ] smoke API kroz **production** backend na `sanjaneuer.com`
- [ ] **zero cross-tenant leakage** — GATE B negativni testovi ponovljeni na živim podacima
- [ ] `sanja-production` **i dalje živ i netaknut** do Faze 10

---

## 11. ROLLBACK — po koraku koji menja produkciju

| Korak | Precondition | Change | Verification | Rollback trigger | Rollback action |
| --- | --- | --- | --- | --- | --- |
| **Git/main deploy** (1–2) | staging zelen; tree test | merge + prod deploy | `tree(main)==tree(staging)`; `x-pdc-surface` prisutan | 500-e; radni prostor nedostupan | Vercel Instant Rollback na `29ae344`; `git revert -m 1` |
| **PDC platform domain** (3) | Faza 2 zelena 24h; Clerk spreman | `PLATFORM_HOST` + `CORS_ORIGINS` | prijava radi na novom hostu | vlasnici ne mogu da se prijave | `PLATFORM_HOST=psihointegritet.com` + redeploy (~2 min) |
| **Sanja DNS** (4b) | Faza 1 gotova | Namecheap A + CNAME | `misconfigured:false`; LE cert; Sanjin sajt | pogrešan sajt na njenom domenu | vrati parking zapise; TTL Automatic |
| **Backend tenant context** (5) | GATE A | `TenantContext` dependency | GATE A negativni testovi | 400/403 na legitimne zahteve | revert PR; `settings` fallback |
| **RLS** (6) | GATE A | polise + uloge | GATE B; **posebno**: prazan rezultat gde treba podatak | tiho nestajanje sistemskog registra (Kompas/Intake) | `DROP POLICY` + `DISABLE RLS` + `DATABASE_URL` na staru ulogu |
| **Shared production API** (7) | GATE B | registry → jedan API | Sanja radi kroz prod backend | njeni podaci nedostupni | vrati `productionApiBaseUrl`; `sanja-production` je i dalje živ |
| **Sanja data migration** (8) | GATE B + dump | INSERT u shared bazu | §10.3 u celosti | bilo koja stavka §10.3 padne | restore iz dump-a; registry natrag na `sanja-production` |

> **Pravilo koje nadjačava sve ostalo:** `sanja-production` i `sanja-staging` environment-i i njihovi
> Postgres volume-i **ostaju živi i netaknuti** dok shared production acceptance (Faza 9) ne prođe i
> ne odstoji. Dok postoje, rollback svake faze 7–9 je promena jednog polja u registry-ju.

---

## 12. DECOMMISSION — šta se briše, i tek na kraju

| Artefakt | Briše se u | Uslov |
| --- | --- | --- |
| Railway environment `sanja-production` + Postgres volume | Faza 10 | Faza 9 zelena ≥7 dana **i** verifikovan offline dump |
| Railway environment `sanja-staging` + Postgres volume | Faza 10 | isto |
| `productionApiBaseUrl` iz `domain-registry.ts` | Faza 11 | Faza 10 gotova |
| `DEFAULT_ORGANIZATION_SLUG` kao **production** env | Faza 5 | GATE A (ostaje za local-dev) |
| Backend tajne na Vercel projektu (N3) | Faza 10 | higijena; ne blokira nijednu fazu |
| Railway environment `features` | **zaseban zadatak posle Faze 11** | §5.3 — ne brisati bez audita |

**Ništa iznad se ne briše ranije, ni kad izgleda nekorišćeno.**

---

## 13. Podela rada

### 13.1 Zahteva ručnu Milanovu akciju

| # | Akcija | Faza | Zašto ne može automatski |
| --- | --- | --- | --- |
| M1 | **Namecheap Advanced DNS** za `sanjaneuer.com` (§3.5) | 4b | Nema Namecheap API kredencijala u okruženju |
| M2 | **Clerk Dashboard** — origins, redirect URL-ovi, ključevi (§9) | pre 3 | Nema Clerk admin pristupa |
| M3 | **Railway re-auth** (`railway login`) — token istekao | pre 5 | Interaktivni OAuth |
| M4 | Odluka o `www.p-digital-center.com` (redirect na apex ili ne) | 3 | Proizvodna odluka |
| M5 | Odluka o sudbini `features` environment-a | posle 11 | Zavisi od stvarnog workflow-a |
| M6 | **Odobrenje pre Faze 8 i Faze 10** | 8, 10 | Jedina dva nepovratna koraka |
| M7 | Offline dump `sanja-production` pre Faze 10 | 10 | Vlasništvo nad backup-om |

### 13.2 Claude može da izvede (uz odobrenje po fazi)

| # | Akcija | Faza |
| --- | --- | --- |
| C1 | Git merge `staging → main` + tree verifikacija (§2.3) | 1 |
| C2 | Vercel env izmene (`PLATFORM_HOST`, `ENVIRONMENT`, `CORS_ORIGINS`, `NEXT_PUBLIC_APP_URL`) | 2–3 |
| C3 | Dodavanje `www.p-digital-center.com` + redirect, po M4 | 3 |
| C4 | DNS/SSL verifikacija posle M1 (`dig`, `/v6/domains/*/config`, `curl`) | 4b |
| C5 | **Ponovljeni RLS inventar na 51 tabeli** (N6) | pre 6 |
| C6 | `api/tenancy.py` + migracija 18 `MUST MIGRATE` mesta (§6.1) | 5 |
| C7 | Alembic migracije: denormalizacija, uloge, polise, `FORCE RLS` | 6 |
| C8 | Negativni testovi GATE A i GATE B | 5–6 |
| C9 | Migracioni skript + mapping + verifikacija §10.3 | 8 (izvršenje uz M6) |
| C10 | Cross-tenant testovi | 9 |
| C11 | Brisanje `productionApiBaseUrl` + čišćenje registry-ja | 11 |

---

## 14. Kriterijumi prihvatanja

Preuzeto iz v1.0 §6, dopunjeno merenim nalazima:

- [ ] `tree(main) == tree(origin/staging)`; produkcija gradi commit koji **sadrži** B2
- [ ] `p-digital-center.com` služi platformu; `psihointegritet.com` je **samo** tenant domen
- [ ] `sanjaneuer.com` `misconfigured:false`, validan sertifikat, servira **Sanjin** sajt
- [ ] `ENVIRONMENT=production` na production targetu **(N1)**
- [ ] `CORS_ORIGINS` nabraja sve produkcione origine **(N2)**
- [ ] nijedan produkcioni zahtev ne zavisi od `DEFAULT_ORGANIZATION_SLUG`
- [ ] lažan tenant header bez potpisa → **400**; tuđ slug bez membershipa → **403**
- [ ] RLS inventar ponovljen na **51** tabeli **(N6)**
- [ ] runtime DB uloga **nema** `BYPASSRLS` i **nije** vlasnik tabela
- [ ] polise za svaku `ORGANIZATION_SCOPED` i `DERIVED_CHILD` tabelu, uz `FORCE`
- [ ] namerno izostavljen filter vraća **0 redova**; ista sesija pod `_migrator` vraća redove
- [ ] globalni `taxonomy_terms` redovi vidljivi obojici tenanata
- [ ] jedan production backend + jedna baza; jedan staging backend + jedna baza
- [ ] QA i staging frontend gađaju **isti** staging backend
- [ ] Sanjini podaci u zajedničkoj bazi sa ispravnim `organization_id`
- [ ] cross-tenant test uživo: 0 tuđih redova u oba smera
- [ ] **tek posle svega:** `sanja-*` environment-i i volume-i obrisani

---

## 15. Van obima

Nepromenjeno u odnosu na v1.0 §7:

- Deljeni Clerk model i migracija korisnika između instanci (osim §9 provere)
- **PDC-0D email identity** — pozicioniran u §9, ne implementiran ovde
- PDC-1 Page Composer i Sanjin sadržaj
- Onboarding UI za trećeg tenanta
- Preimenovanje Vercel projekta `psihointegritet` → `p-digital-center`
- Sudbina `features` Railway environment-a (§5.3)

---

## 16. Merilo

Nepromenjeno. Kad ovo prođe, treći tenant nije infrastrukturna faza nego:

```
create organization → add domain → assign owner → configure tenant → publish
```
