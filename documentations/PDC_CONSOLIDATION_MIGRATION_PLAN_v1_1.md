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

**Railway rupa je zatvorena 2026-09-07** — Milan je proverio uživo. `production`, `staging`,
`features`, `sanja-production` i `sanja-staging` postoje u **istom projektu**; backend, Postgres i
Redis su u `SUCCESS` stanju. Production backend je startovan sa `environment="production"`.
§5 time prelazi iz „izvedeno" u **potvrđeno**.

### 1.5 Dva nalaza koja je živi Railway audit oborio

| Nalaz | Šta je plan tvrdio | Šta je izmereno | Ispravna klasifikacija |
| --- | --- | --- | --- |
| **N1** | `ENVIRONMENT=staging` na Vercel production targetu je runtime blocker | Railway production backend **jeste** startovan sa `environment="production"`. Frontend `serverEnv` **nikad ne čita** `ENVIRONMENT` — čita `DEPLOYMENT_ENV` (provereno: 0 pojavljivanja `process.env.ENVIRONMENT` u `frontend/src`) | 🟡 **stale env hygiene.** Vercel kopija ne opisuje nijedan runtime; briše se kad se čisti N3 |
| **N2** | production `CORS_ORIGINS` je pogrešan | Ta vrednost živi na **Vercel** projektu i ne konfiguriše Railway. Potvrđena arhitektura je `browser → Next.js → FastAPI`; nijedna klijentska komponenta ne zove FastAPI direktno (§6.4) | 🟡 **nije uzrok nijednog incidenta.** Stvarnu Railway vrednost tek treba auditovati, i to odvojeno |

> **Pouka koja se prenosi:** env promenljiva na Vercel projektu nije dokaz o Railway runtime-u.
> Prvobitni audit je čitao Vercel jer Railway nije bio dostupan, i obe pogrešne klasifikacije potiču
> odatle. Nalaz o infrastrukturi koja nije očitana mora nositi tu ogradu, ne ozbiljnost.

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
| **N1** | ~~`ENVIRONMENT=staging` na production targetu je runtime blocker~~ **— POVUČENO 2026-09-07** | 🟡 niska — **stale env hygiene**, ne blocker | vidi §1.5 |
| **N2** | `CORS_ORIGINS` na **Vercel** projektu dozvoljava samo `qa.psihointegritet.com` | 🟡 niska — **to je frontend kopija, ne Railway konfiguracija**; browser ne zove FastAPI direktno, pa nije uzrok nijednog poznatog incidenta. Stvarna Railway vrednost nije auditovana | vidi §1.5 |
| **N3** | Backend tajne (`DATABASE_URL`, `MIGRATION_DATABASE_URL`, `PGPASSWORD`, `POSTGRES_PASSWORD`, `REDIS_URL`, `REDIS_PASSWORD`, `DATABASE_PUBLIC_URL`) postoje kao env na **Vercel frontend** projektu | 🟠 srednja — nisu `NEXT_PUBLIC_`, pa ne cure u browser bundle, ali su kopija produkcionih kredencijala u sistemu koji ih ne koristi; proširuju površinu i rotaciju | Faza 10 (higijena), ne blokira |
| **N4** | `p-digital-center.com` je **živ** i servira `Psihointegritet` naslov | 🟠 srednja — kanonski platformski domen trenutno tvrdi tenant identitet koji je D-080 povukao | Faza 3 |
| **N5** | `www.p-digital-center.com` nije u projektu; sertifikat ga ne pokriva | 🟡 niska | Faza 3 |
| **N6** | ADR-023 inventar meri 31 tabelu; danas ih je **51** | 🟠 srednja — RLS inventar se mora ponoviti pre pisanja polisa, inače 20 tabela ostaje neklasifikovano | Faza 6 (gate) |
| **N7** | `TODO.md` B2-6 preporučuje A zapis `76.76.21.21` | 🟡 niska — Vercel danas kao rank-1 preporučuje `216.150.1.1`; `76.76.21.21` je rank-2 legacy | §4 |
| **N8** | `isSurfaceAllowedOnHost` završava sa `host.isTenant \|\| host.isPlatform`, pa na platform-only hostu propušta ceo tenant public tree — `p-digital-center.com/` bi renderovao Psiho početnu | 🔴 **visoka — blocker za Fazu 3** | **Faza 2b, zatvoreno 2026-09-07** |
| **N9** | Root layout obavija i tenant segment, pa Sanjina stranica u payload-u nosi **ceo `sr-Latn` katalog poruka** (uključujući Psiho javnu kopiju) i **`clerk.psihointegritet.com`** kao Clerk Frontend API domen. **Renderovan tekst je čist** — „Sanja Neuer / Sajt je u pripremi.", 0 pominjanja | 🟡 niska danas (stranica je `noindex`), 🟠 pre PDC-1 javnog sajta | katalog: PDC-1 (tenant-authored sadržaj) · Clerk domen: §9 |
| **N10** | **`/api/v1/me` first-login race** — `ensure_internal_user()` radi SELECT → INSERT bez atomarnosti; dva paralelna zahteva za nov `external_auth_id` oba vide `None` i oba INSERT-uju. Loser dobija `UniqueViolationError: uq_internal_users_external_auth_id` → 500. Frontend pita **oba** production backend-a kroz `Promise.all()`, pa jedan 500 obara ceo sign-in | 🔴 **BLOCKER — bio uzrok Maria login greške** | **Faza 2c, kod zatvoren `e206730`** |

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
| **2b** | **Platform-host surface fix** — public tree fail-closed bez tenanta; `/` → 307 `/prijava` | Faza 2 | 11 testova u `surface-access.test.ts`; nula regresije na `psihointegritet.com` | revert PR (pravilo je jedna grana) | **Ne** |
| **2c** | **`/api/v1/me` first-login race** (N10) — `ON CONFLICT DO NOTHING` + autoritativan read | Faza 2b | concurrency test pada pre / prolazi posle; **Maria realna prijava bez error boundary-ja** | revert PR; DB nepromenjena | **Ne** |
| **2d** | **Platform shell** — landing, surface-aware `/prijava`, post-auth dispatcher, staff-scoped workspace org | Faza 2c | 857 testova; build diff = +3 rute, statika 32 vs baseline 30 | revert PR | **Ne** |
| **3** | `PLATFORM_HOST=p-digital-center.com`; `NEXT_PUBLIC_APP_URL`; `CORS_ORIGINS` (N2); `www` politika (N5) | **Faze 2b–2d deployovane**; **Maria smoke zelen ✅**; **Clerk cutover §9.2 izveden**; `NEXT_PUBLIC_APP_URL` **se NE menja** (§8.5) | `p-digital-center.com/radni-prostor` traži prijavu i radi; `psihointegritet.com` je **samo** tenant | vrati `PLATFORM_HOST` na `psihointegritet.com` + redeploy | **Ne** (reverzibilno) |
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

### 8.2 Faza 2b — zašto Faza 3 nije smela da krene bez nje (N8)

Nalaz otkriven pri pregledu plana, **pre** cutover-a. Nije ga našao prvobitni audit jer se ne vidi
ni u jednom merenju žive infrastrukture — dok je `PLATFORM_HOST=psihointegritet.com`, taj host je
**i tenant i platforma**, pa se rupa ne manifestuje.

**Uzrok.** `isSurfaceAllowedOnHost()` je završavao sa:

```ts
return host.isTenant || host.isPlatform;   // sve što nije owner ni client surface
```

Ta grana pokriva **ceo javni tree**. Bila je tačna dok je platform host ujedno bio i domen
osnivačkog tenanta — host je stvarno posedovao stranice koje servira. Prestaje da bude tačna u
trenutku kad se to razdvoji.

**Posledica koja bi nastupila u Fazi 3.** Postavljanje `PLATFORM_HOST=p-digital-center.com` pravi
prvi **platform-only** host. Zahtev za `/` bi prošao proveru (`host.isPlatform === true`), pao na
`proxy.ts` granu `onPlatformHost && !tenant` → `NextResponse.next()` → renderovao `app/(public)`,
gde i dalje stoji ~26 stranica Psihointegriteta.

```
p-digital-center.com/  →  Psihointegritet početna     ❌
```

Kanonski platformski domen bi tvrdio tenant identitet koji je D-080 povukao — i to bez ijedne
izmene koda, samo promenom env vrednosti.

**Popravka.** Poslednja grana je sada `host.isTenant` — *nema tenanta, nema javnog sajta*. Pravilo
je izraženo kao svojstvo, ne kao spisak: ništa u njemu ne nabraja javni tree, pa dodavanje stranice
ne može da proširi ono što platform host servira. Dve kategorije su izuzete kao **host-neutral**,
jer bi ih pravilo inače oborilo zajedno sa javnim sajtom:

| Kategorija | Zašto mora da radi na oba hosta |
| --- | --- |
| `/prijava`, `/registracija` | jedini ulaz na bilo koju površinu; Clerk drži te putanje u svojoj konfiguraciji |
| `/api/...` | Route Handler-i su serverski endpoint-i — radni prostor i superadmin ih zovu sa platform hosta |

**Root platform hosta** više nije fallback nego eksplicitan odgovor: `307 → /prijava`, uz
`Cache-Control: private, no-store`. **307, ne 308** — privremeno je po konstrukciji, a trajni
redirect bi ostao keširan u browser-ima i posle PDC-1 landing stranice.

**Ponašanje po kategoriji na platform-only hostu:**

```
/workspace · /radni-prostor · /superadmin   → serve
/prijava · /registracija · /api/*           → serve
/                                            → 307 → /prijava
/nalog · /account                            → 404
/kompas · /o-nama · /usluge · /tim · …       → 404
/robots.txt · /sitemap.xml                   → 404
neregistrovana putanja                       → 404  (fail-closed je default grana)
```

**Nula promene za `psihointegritet.com`**, koji je i dalje i tenant i platforma — provereno na
produkciji posle deploy-a, svih 19 putanja identično kao pre.

### 8.3 `sanja-neuer.vercel.app` — TEMPORARY ACCESS HOST

```
sanja-neuer.vercel.app
  = TEMPORARY ACCESS HOST
  = NIJE tenant arhitektura
  = uklanja se nakon sanjaneuer.com DNS cutover-a
```

**Povod.** Namecheap pristup trenutno ne postoji (M1), a `sanjaneuer.com` je nedostupan od kupovine.
Sanjin tenant time blokira posao koji sa DNS-om nema veze. Rešenje je hostname koji odgovara danas —
**na istom projektu `psihointegritet`, kao još jedan red u registru.**

**Šta ovo NIJE.** Nije povratak na project-per-tenant. Nije novi Vercel projekat. Ne menja ciljnu
topologiju iz §4, ne dira Railway, ne uklanja `sanjaneuer.com` iz registra i ne menja Namecheap.

#### Razdvajanje koje je moralo da nastane

Jedno polje je nosilo dva različita pitanja. Od sada ih nosi dva:

| Polje | Pitanje | Vrednost |
| --- | --- | --- |
| `publicUrl` | šta sajt **jeste** — canonical, SEO, adresa koju Sanja štampa | `https://sanjaneuer.com` |
| `temporaryAccessUrl` | gde sajt **odgovara** danas | `https://sanja-neuer.vercel.app` |

`publicUrl` **namerno ostaje mrtav domen.** Upisivanje `.vercel.app` hosta u canonical tražilo bi od
Google-a da privremenu adresu indeksira kao njen identitet, a čišćenje posle toga bilo bi migracija
domena umesto obrisanog polja.

#### SEO režim

| Sloj | Ponašanje |
| --- | --- |
| tenant placeholder stranica | `robots: { index: false, follow: false }` — **već postojalo** |
| canonical | `https://sanjaneuer.com/` — pokazuje na budući domen, ne na stand-in |
| openGraph `url` | `publicUrl`, ne stand-in |
| proxy, svaki odgovor sa tog hosta | `X-Robots-Tag: noindex, nofollow` — **novo** |

Header pokriva i odgovore koji nikad ne dobiju `<meta>` tag. Žigoše se iz registra, ne iz literala,
pa brisanje `temporaryAccessUrl` povlači i njega.

#### Bezbednost

Host je naveden **doslovno**, nikad kao `*.vercel.app` wildcard — wildcard bi svaki preview hostname
na nalogu pretvorio u poverljivu rutu u nečiji tenant. Test to tvrdi eksplicitno
(`unknown.vercel.app`, `sanja-neuer.vercel.app.evil.com`, `evil-sanja-neuer.vercel.app` → sve
`undefined`), uz invariant da je svaki `temporaryAccessUrl` host i u `domains`.

**B2 invarijante se ne omekšavaju zato što je hostname privremen:** owner površine ostaju van njega,
klijentska ostaje na njemu, `/s/*` ostaje 404.

#### Šta se briše na `sanjaneuer.com` cutover-u (Faza 4b)

```
1. temporaryAccessUrl iz sanja-neuer unosa
2. "sanja-neuer.vercel.app" iz domains
3. Vercel project domain sanja-neuer.vercel.app
4. testovi koji ga imenuju
```

Posle toga `tenantSiteUrl()` sam vraća `publicUrl`, a `isTemporaryAccessHost()` nema nijedan host —
`X-Robots-Tag` nestaje bez ijedne dodatne izmene. **Nijedan drugi kod ne zna da je ovo postojalo.**

#### Mereno na produkciji 2026-09-07 (`ac152f9`)

```
http            200
x-pdc-tenant    sanja-neuer
x-pdc-surface   tenant
X-Robots-Tag    noindex, nofollow
title           Sanja Neuer
canonical       https://sanjaneuer.com          ← ne stand-in
og:url          https://sanjaneuer.com          ← ne stand-in
robots meta     noindex, nofollow
vidljiv tekst   "Sanja Neuer  Sajt je u pripremi."   ← 0 pominjanja Psihointegriteta

/radni-prostor · /workspace · /superadmin   404
/s/sanja-neuer · /s/psihointegritet         404
/kompas · /o-nama · /usluge · /tim          404      ← Psiho javni tree nedostupan
/nalog                                      307 → /prijava   ← klijentska površina radi
```

Bez regresije: `psihointegritet.com` svih pet putanja nepromenjeno, **bez** `X-Robots-Tag`.

> **Nalaz N9 otkriven pri ovom smoke testu.** Renderovan sadržaj je čist, ali *payload* nije:
> root layout obavija i tenant segment, pa nosi ceo `sr-Latn` katalog poruka i Clerk-ov
> `clerk.psihointegritet.com`. Ne blokira — stranica je dvostruko `noindex` — ali mora biti
> zatvoreno pre nego što tenant dobije stvarni javni sajt (PDC-1).

**M1 (Namecheap) ostaje otvoren, ali više nije blocker** ni za jednu fazu.

### 8.4 Faza 2c — `/api/v1/me` first-login race (N10)

**Incident.** Maria Bullock se prijavljuje, stiže na `/radni-prostor`, i dobija global error boundary
sa potpuno validnom sesijom. Railway log `sanja-production` u tom trenutku:

```
GET /api/v1/me → 200
GET /api/v1/me → 500
UniqueViolationError: duplicate key value violates unique constraint
                      "uq_internal_users_external_auth_id"
```

**Lanac uzroka — dva defekta, ne jedan.**

```
ensure_internal_user():  SELECT → None → INSERT        ← nije atomarno
        ↓
dva paralelna zahteva za nov subject oba vide None, oba INSERT-uju
        ↓
loser → UniqueViolationError → HTTP 500
        ↓
frontend apiBaseUrlsForRequest() na platform surface pita OBA production backenda
        ↓
Promise.all([Psiho 200, Sanja 500]) → reject
        ↓
global error boundary — iako je Psiho odgovorio ispravno
```

**Zašto baš sada.** Račun je postojao u Psiho bazi, ali **ne** u Sanjinoj. Njena baza je za Mariju
bila „prva prijava", i to je jedini put na kojem se INSERT uopšte dešava.

**Ispravka (`e206730`).** `INSERT ... ON CONFLICT DO NOTHING` pa autoritativan `SELECT`:

```python
user = await _find_internal_user(session, identity.subject)
if user is None:
    await session.execute(
        pg_insert(InternalUser)
        .values(external_auth_id=identity.subject, email=identity.email)
        .on_conflict_do_nothing(index_elements=["external_auth_id"])
    )
    user = await _find_internal_user(session, identity.subject)
```

Unique constraint **ostaje** — on arbitrira, aplikacija ne pogađa. Čitanje mora doći **posle** upisa:
pod `READ COMMITTED` gubitnički INSERT čeka da pobednik commit-uje, a tek nov `SELECT` vidi
commit-ovan red. Odbačeno je: hvatanje `IntegrityError`, frontend retry, ignorisanje 500,
uklanjanje constraint-a, application lock.

Semantika nepromenjena: prva prijava pravi **neutralnog** korisnika bez membershipa, promenjen email
se ažurira. Email grana se sada primenjuje na red koji je preživeo, pa zastareo email ne može da
nadživi race koji ga je upisao.

**Test (`test_identity_first_login_concurrency.py`).** Vredi utoliko što **prvo pada**. Običan
`asyncio.gather` prolazi i protiv pokvarenog koda — event loop sme da završi jedan zahtev pre nego
što drugi počne — pa se sesije sinhronizuju na barijeri tačno na proveri postojanja, i tek onda
insert-uju. To je interleaving koji je produkcija imala.

```
protiv starog koda:  2 failed  ← reprodukovan tačan UniqueViolationError
protiv novog koda:   3 passed
ceo backend suite:   574 passed, 1 skipped
```

> **Preostali frontend rizik, svesno van ovog slice-a.** `Promise.all()` u
> `loadBackendIdentity()` i dalje znači da jedan pokvaren backend obara sign-in. To prestaje da
> bude problem sam od sebe kad backend postane jedan (Faza 7). Do tada je uzrok zatvoren, ne
> simptom — kako je i traženo.

### 8.5 `NEXT_PUBLIC_APP_URL` — auditovano, **NE menja se u Fazi 3**

Zadatak je tražio da se env ne menja naslepo. Audit kaže: **ne menjati ga uopšte u ovom slice-u.**

Runtime potrošači (`frontend/src`, bez testova):

| Mesto | Upotreba |
| --- | --- |
| `app/layout.tsx:42` | `metadataBase: new URL(serverEnv.NEXT_PUBLIC_APP_URL)` — root layout obavija i legacy `(public)` tree |
| `lib/content-governance/discoverability.ts:17` | `publicOrigin(origin = process.env.NEXT_PUBLIC_APP_URL)` |
| ↳ koristi se kao **default argument** u `absolutePublicUrl`, `sitemapEntries`, `robotsPolicy`, `jsonLdForEntity` (+ `compassBreadcrumbJsonLd`, `compassSitemapEntries`) |

**Odlučujuće:** pozivaoci ga **ne prosleđuju**.

```
app/(public)/usluge/[slug]/page.tsx:75   jsonLdForEntity(contentEntity)          ← bez origin-a
app/(public)/tim/[slug]/page.tsx:57      jsonLdForEntity(contentEntity)          ← bez origin-a
app/(public)/radionice/[slug]/page.tsx:48 jsonLdForEntity(contentEntity)         ← bez origin-a
app/sitemap.ts:21,29                     sitemapEntries(provider, undefined, …)  ← eksplicitno undefined
```

Zato bi `NEXT_PUBLIC_APP_URL=https://p-digital-center.com` proizvelo:

```
psihointegritet.com/usluge/x
  canonical  → https://p-digital-center.com/usluge/x     ZABRANJENO
  JSON-LD    → https://p-digital-center.com/...          ZABRANJENO
  sitemap    → https://p-digital-center.com/...          ZABRANJENO
```

**Presuda:** uslov „tenant-origin je već eksplicitno prosleđen svuda" **nije ispunjen**, pa se env
ne menja. Platform URL u Fazi 3 dolazi iz `PLATFORM_HOST`, koji je već konfiguracija.

Prelazak `publicOrigin()` sa env default-a na `tenant.publicUrl` je **PDC-1 posao** (isti šav kao
N9 i legacy `(public)` tree), ne deo domain cutover-a.

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

### 9.1 Clerk readiness za `p-digital-center.com` — **NIJE spreman, traži Dashboard izmenu**

Mereno 2026-09-07, bez menjanja ijedne Clerk postavke.

```
clerk.psihointegritet.com      CNAME  frontend-api.clerk.services.    ← custom Frontend API
accounts.psihointegritet.com   CNAME  accounts.clerk.services.        ← Account Portal

clerk.p-digital-center.com     (nema zapisa)
accounts.p-digital-center.com  (nema zapisa)
```

Clerk production instanca je vezana za **`psihointegritet.com` kao primarni domen**, sa custom FAPI
poddomenima ispod njega. N9 to potvrđuje sa druge strane: `clerk.psihointegritet.com` se već pojavljuje
u payload-u **svakog** tenant hosta.

**Posledica za Fazu 3.** Prijava na `p-digital-center.com` gađala bi FAPI na tuđem domenu. To nije
samo pitanje allowed origins — Clerk sesijski kolačić se postavlja u odnosu na primarni domen
instance, pa domen koji nije primarni traži **satellite** konfiguraciju ili promenu primarnog domena.
Bez toga vlasnik može da se prijavi i **ne dobije sesiju** na novom hostu.

> **STOP pred cutover-om.** Ovo se ne menja naslepo — vidi M2 u §13.1 za tačan spisak.

Odluka između dve opcije (`p-digital-center.com` postaje primarni domen instance, ili ostaje
satellite) je otvorena i pripada `PDC_TENANT_ROUTING_AUDIT_v1_0.md` §6.2. **Faza 3 je blokirana dok
se ne donese.**

### 9.2 Clerk primary domain cutover — ručni checklist (NIJE izvršen)

**Odluka (zaključana 2026-09-07):** `p-digital-center.com` postaje **primary** Clerk domen;
`psihointegritet.com`, `sanjaneuer.com` i budući tenant domeni postaju **satelliti**.

Razlog nije branding: primary domen drži centralni auth state, a kod satellite modela se
sign-in/sign-up **izvršava na primary domenu**. Dugoročno je pogrešno da to bude domen jednog tenanta.

#### Posledica koja se ne skriva

Standardni Clerk satellite flow vodi korisnika na primary domen i vraća ga natrag:

```
klijent na sanjaneuer.com → klik "Prijava"
    → p-digital-center.com/prijava        ← URL privremeno napušta tenant domen
    → nazad na sanjaneuer.com/nalog
```

Time raniji cilj „klijent nikad ne vidi PDC domen" **nije kompatibilan** sa modelom jedna instanca +
satelliti. Za MVP se prihvata. Ublažavanje je prezentaciono — login ekran se brendira prema
povratnom kontekstu — ne URL trik. Ako URL nikad ne sme napustiti tenant domen, to je druga auth
arhitektura (instanca po tenantu) i ne komplikuje se B2 zbog nje.

> ⚠️ **Production satellite domains su plaćena funkcija.** Proveriti plan **pre** cutover-a.

#### Korak po korak

**A. Clerk Dashboard**

1. Production instanca → **Domains → Change domain** → `p-digital-center.com`.
2. Preuzeti **tačne DNS zapise koje Dashboard prikaže** (Frontend API i Account Portal CNAME).
   **Ne izmišljati `clerk.` / `accounts.` vrednosti** — koristi se doslovno ono što Clerk da.
3. Uneti ih u **Vercel DNS** za `p-digital-center.com` (domen je na Vercel nameserverima).
4. Sačekati verifikaciju i izdavanje sertifikata.
5. Preuzeti **nov production publishable key** (`pk_live_…` — menja se jer kodira Frontend API domen).
6. Proveriti da li **secret key** ostaje isti; ako Dashboard izda nov, preuzeti i njega.
7. **Satellites:** dodati `psihointegritet.com`, `www.psihointegritet.com`, `sanjaneuer.com`,
   `www.sanjaneuer.com`, `sanja-neuer.vercel.app`.
8. **Allowed redirect origins / paths:** svi gornji + `https://p-digital-center.com`,
   uz `/prijava`, `/registracija`, `/api/auth/landing`.

**B. Kod (ide u istom PR-u kao Dashboard promena, ne pre)**

9. `ClerkProvider` prelazi u client component i dobija `isSatellite` + `domain` iz
   `clerkSatelliteDomainFor` (logika i testovi već postoje — §9.3). **Ne pre cutover-a:** deklarisanje
   satellita dok je primary još Psiho obara prijavu na svim hostovima odjednom.

**C. Vercel env**

| Ključ | Pre | Posle |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production) | `pk_live_` za `clerk.psihointegritet.com` | **nov** `pk_live_` iz koraka 5 |
| `CLERK_SECRET_KEY` (production) | postojeći | isti, osim ako korak 6 kaže drugačije |
| `CLERK_PRIMARY_HOST` (production) | **ne postoji** | `p-digital-center.com` |
| `PLATFORM_HOST` (production) | `psihointegritet.com` | `p-digital-center.com` |
| `NEXT_PUBLIC_APP_URL` | `https://psihointegritet.com` | **NE MENJA SE** — §8.5 |

**D. Railway env — `production` i `sanja-production` (isti Clerk ugovor dok su backendi odvojeni)**

| Ključ | Pre | Posle |
| --- | --- | --- |
| `CLERK_ISSUER` | `https://clerk.psihointegritet.com` | nov issuer iz Dashboard-a |
| `CLERK_JWKS_URL` | `…/.well-known/jwks.json` na starom issuer-u | isto, na novom |
| `CLERK_AUDIENCE` | postojeći | proveriti da li se menja |
| `CLERK_SECRET_KEY` | postojeći | uskladiti sa C |

> Backend verifikuje token po `CLERK_ISSUER`/`CLERK_JWKS_URL`. Ako se oni ne promene zajedno sa
> ključevima, **svaki** API poziv posle cutover-a vraća 401 — i to na oba backend-a.

#### Redosled i rollback

```
1. Dashboard Change domain + DNS + sertifikat        ← reverzibilno (vrati domen)
2. Satellites + allowed origins                       ← reverzibilno
3. Railway production + sanja-production Clerk env    ← reverzibilno (stare vrednosti)
4. Vercel Clerk ključevi + CLERK_PRIMARY_HOST         ← reverzibilno (redeploy)
5. Kod: satellite deklaracija                         ← revert PR
6. PLATFORM_HOST → p-digital-center.com               ← Faza 3, poslednja
```

**Rollback ide obrnutim redosledom.** Kritično: koraci 3 i 4 moraju biti **blizu jedan drugom** —
između njih frontend i backend govore o različitim Clerk instancama i prijava ne radi. Zato se
Railway menja **pre** Vercel-a: backend koji prihvata **oba** issuer-a nakratko je bezbedniji od
frontenda koji šalje token koji backend ne prepoznaje.

**Rollback trigger:** bilo koja prijava vraća 401 ili sesija se ne uspostavlja na novom hostu.

### 9.3 Faza 2d — platform shell i post-auth routing (isporučeno `36e2489`)

Kod koji Fazu 3 pretvara u env promenu. Ništa od ovoga ne menja ponašanje postojećih hostova.

| Isporučeno | Šta rešava |
| --- | --- |
| `app/platform-home/` + proxy rewrite | Platform host dobija **svoju** stranicu. Do sada je nije imao — zato je N8 rupa i postojala. Direktan `/platform-home` je 404 |
| `features/auth/auth-surface-layout.tsx` | `/prijava` dvokolonski na platform površini, običan okvir na tenant površini. Površina dolazi iz proxy žiga, **ne** iz poređenja hostname-a u komponenti |
| `lib/auth/post-auth-landing.ts` | Role-aware odredište posle prijave; `app/api/auth/landing/route.ts` je tanak izvršilac |
| `app/pristup-odbijen/` | Vidljivo odbijanje umesto 404 za nalog sa validnom sesijom i bez uloge |
| `staffMemberships()` + `resolveWorkspaceOrganization()` | Radni prostor bira **staff** membership, ne abecedno prvi |
| `lib/auth/clerk/multi-domain.ts` | Odluka primary/satellite, testirana, **još nedeklarisana** — vidi §9.2 korak 9 |

#### Post-auth routing matrica

| Ko | Gde se prijavio | Odredište |
| --- | --- | --- |
| superadmin | bilo gde | `/superadmin` na platformi |
| org_admin / therapist | bilo gde | `/radni-prostor` na platformi |
| klijent | tenant host | `/nalog` na **tom** hostu |
| klijent | platform host, membership imenuje **jedan** tenant | `https://<tenant>/nalog` |
| klijent | platform host, **nula ili više** tenanata | `/pristup-odbijen` |
| bez uloge | bilo gde | `/pristup-odbijen` |

Nikad: `p-digital-center.com/nalog`. Test to tvrdi eksplicitno, za sve četiri vrste identiteta.

#### Nalaz koji je zamalo prošao — rendering contract nema stražara nad auth provider-om

Prva verzija je čitala `headers()` u `AuthProvider` da bi bila host-aware. Provider stoji u root
layout-u i obavija **svaku** stranicu, pa je build pao sa **30 prerenderovanih ruta na 3** — ceo
javni sajt na SSR. To je tačno ono što D-077 rendering ugovor zabranjuje.

`check-frontend-architecture.mjs` to **nije uhvatio**: skenira pet imenovanih SSG-safe modula, a
`lib/auth/clerk/auth-provider.tsx` nije među njima. Otkriveno je poređenjem broja statičkih ruta sa
baseline build-om.

```
baseline          30 static / 124 dynamic
sa headers()       3 static / 147 dynamic     ← regresija
posle popravke    32 static / 125 dynamic     ← +2 stranice, +1 route handler, diff prazan inače
```

> **Preporuka za zaseban zadatak:** proširiti statičku proveru na root layout i sve što on obavija,
> ili uvesti build-time gate na broj prerenderovanih ruta. Danas je jedina odbrana što je neko
> uporedio dva build-a.

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
| `temporaryAccessUrl` + `sanja-neuer.vercel.app` (registry, Vercel domain, testovi) | **Faza 4b** | `sanjaneuer.com` razrešava i servira Sanjin sajt — vidi §8.3 |
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
| M1 | **Namecheap Advanced DNS** za `sanjaneuer.com` (§3.5) | 4b | Nema Namecheap API kredencijala u okruženju. **Više nije blocker** — §8.3 daje privremeni host |
| M2 | **Clerk Dashboard** — vidi §9.1. Konkretno: (a) odluka da li `p-digital-center.com` postaje **primarni domen** instance ili **satellite**; (b) `p-digital-center.com` u allowed origins; (c) redirect/callback za `/prijava` i `/registracija`; (d) ako primarni — DNS `clerk.` i `accounts.` CNAME na Clerk vrednosti | **blokira Fazu 3** | Nema Clerk admin pristupa |
| M3 | **Railway re-auth** (`railway login`) — token istekao 2026-09-06 22:06 UTC | **blokira verifikaciju Faze 2c deploy-a** | Interaktivni OAuth; bez njega se ne može ni pokrenuti ni potvrditi backend deploy, ni čitati logovi |
| M4 | Odluka o `www.p-digital-center.com` (redirect na apex ili ne) | 3 | Proizvodna odluka |
| M5 | Odluka o sudbini `features` environment-a | posle 11 | Zavisi od stvarnog workflow-a |
| M6 | **Odobrenje pre Faze 8 i Faze 10** | 8, 10 | Jedina dva nepovratna koraka |
| M8 | **Maria realna prijava** posle 2c deploy-a — HARD GATE Faze 3 | pre 3 | Traži njene Clerk kredencijale; Claude se ne može prijaviti kao ona |
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
