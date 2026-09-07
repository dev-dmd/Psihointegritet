# PDC konsolidacija — objedinjen migracioni plan

**Datum:** 2026-09-07 · **Vlasnik:** Milan Dražić (CTO) · **Status:** zapisan, **ne izvodi se**
**Odluka:** D-081 · **Prethodi:** D-077 A7/A8, D-080, ADR-023, `PDC_B2_SPIKE_RESULT_v1_0.md`

**Okidač:** kupovina `p-digital-center.com`. Do tada se ništa iz ovog plana ne izvodi.

---

## 0. Zašto ovaj dokument postoji

Zato što je frontend konsolidacija (B2) izvedena, a backend nije — i to stanje **nije stabilna
međutačka**. Frontend danas zna da su tenanti podatak, backend još uvek misli da su deployment.
Šav između ta dva je `productionApiBaseUrl` u domain registry-ju: radi, ali je pogrešnog oblika i
zna se zašto.

Dalje razvijanje u tom obliku znači razvijanje četiri API-ja — Psiho prod, Sanja prod, Psiho
staging, Sanja staging — od kojih nijedan ne želimo. Zato se staje ovde, a ne na pola sledeće faze.

---

## 1. Ciljna infrastruktura

```
                    P. DIGITAL CENTER

PRODUCTION
────────────────────────────────────────────
One Vercel project
├── p-digital-center.com        → platforma
├── psihointegritet.com         → tenant
└── sanjaneuer.com              → tenant
              │
              ▼
One Railway production backend
              │
              ▼
One production PostgreSQL
├── organization_id = psihointegritet
├── organization_id = sanja-neuer
└── organization_id = future-tenant


NON-PRODUCTION
────────────────────────────────────────────
QA frontend ──────┐
                  ├── One Railway staging backend
Staging frontend ─┘
                            │
                            ▼
                   One staging PostgreSQL
```

**Nema:** baze po tenantu, backend-a po tenantu, Vercel projekta po tenantu — ni u produkciji ni
u staging-u.

---

## 2. Šta se menja u modelu

### 2.1 `apiBaseUrl` pripada okruženju, ne tenantu

Ovo je ispravka onoga što je B2 konsolidacija uvela.

```
BILO (prelazno):   tenant           → apiBaseUrl
BIĆE:              environment      → apiBaseUrl
                   request          → organizationSlug → organization_id → scope
```

Domain registry dugoročno ostaje odličan, ali samo za ono što jeste njegovo:

```ts
{ organizationSlug, domains, publicUrl }
```

`productionApiBaseUrl` se briše iz registra kad backend postane jedan po okruženju.

### 2.2 Tenant je request scope, ne deployment konfiguracija

```
BILO:  Railway deployment → DEFAULT_ORGANIZATION_SLUG → jedna organizacija
BIĆE:  request → trusted tenant context → organizationSlug → organization
                → organization_id → authorization → organization-scoped DB session
```

`DEFAULT_ORGANIZATION_SLUG` posle ovoga ostaje **samo** local-dev pomoć — koju organizaciju vidiš
na laptopu bez menjanja `/etc/hosts`. Prestaje da bude izvor produkcione tenancy.

> **Backend ima dobar deo osnove.** `resolve_staff_actor()` već proverava membership za konkretan
> `organization.id` i nije globalan — to je provereno tokom B2-1, kad se ispostavilo da je rupa
> bila isključivo na frontendu. Jedina greška je odakle organizacija stiže: iz deployment
> konfiguracije umesto iz zahteva.

### 2.3 RLS ulazi u gate, prestaje da bude „kasnije"

Jedna baza za sve stvarne klijente menja težinu ovog pitanja. ADR-023 §2.2 je već postavio tri
sloja i oni od sada moraju stajati **zajedno**:

```
API authorization
        +
explicit organization_id repository scope
        +
PostgreSQL RLS (fail-closed)
```

Merena polazna tačka (2026-09-06): **0 polisa**, **111 ručnih filtera**, runtime uloga sa
`rolbypassrls=t` i vlasništvom nad tabelama. ADR-023 §1 već kaže zašto je uključivanje polisa bez
izmene uloga gore od nepostojanja RLS-a — proizvodi **izgled zaštite bez zaštite**.

Zato: **RLS + runtime DB uloga su gate za spajanje podataka**, ne posao posle njega.

---

## 3. Šta je od ovoga već izvedeno

| Korak | Status |
| ----- | ------ |
| Jedan Vercel projekat, host → tenant | ✅ 2026-09-07 (`8a092e8`) |
| `sanjaneuer.com` + `www` na PDC projektu | ✅ 2026-09-07 |
| **`sanja-neuer` Vercel projekat obrisan** | ✅ 2026-09-07 |
| Tenant-scoped autorizacija | ✅ B2-1 (`ff127c6`) |
| `PLATFORM_HOST` kao konfiguracija | ✅ postavljen na sva tri targeta |

> Frontend deo cutover-a je dakle **iza nas**, ne ispred. Ono što je u planu ostalo za brisanje
> (§7) je isključivo Railway strana.

---

## 4. Šta ostaje migration artifact

Ne razvija se dalje, **ne gasi se naglo**:

| Artefakt | Zašto još stoji |
| -------- | --------------- |
| Sanjin Railway backend servis | jedini backend koji njena organizacija ima dok konsolidacija ne prođe |
| Sanjina zasebna production baza | **jedina stvarna izolacija koju danas imamo** — RLS ne postoji |
| `productionApiBaseUrl` u domain registry-ju | drži produkciju ispravnom dok postoje dva backend-a |
| `DEFAULT_ORGANIZATION_SLUG` kao production tenancy | zamenjuje ga request-scoped kontekst |

Prva dva **nisu bezbednosni dug nego bezbednosna imovina** dok RLS ne stigne. Gase se poslednji.

---

## 5. Redosled izvođenja

Obavezujući. Svaki korak pretpostavlja da je prethodni završen i proveren.

```
p-digital-center.com kupljen
        ↓
 1. platform domain na PDC Vercel projekat, PLATFORM_HOST → p-digital-center.com
 2. psihointegritet.com postaje SAMO tenant domen
        ↓
 3. request-scoped tenant context na backendu (zamena za DEFAULT_ORGANIZATION_SLUG)
 4. RLS + runtime DB uloga bez BYPASSRLS  ← GATE
        ↓
 5. jedan production Railway backend
 6. jedan staging Railway backend; QA i staging frontend oba na njega
        ↓
 7. migracija Sanjinih podataka u zajedničku production bazu
 8. live cross-tenant testovi, Sanja i Psiho istovremeno
        ↓
 9. gašenje: Sanja Railway backend servis, Sanja Postgres baza
10. brisanje productionApiBaseUrl iz domain registry-ja
```

**Koraci 3 i 4 su gate za 5–7.** Spajanje podataka pre njih ukida jedinu izolaciju koju imamo.

---

## 6. Kriterijumi prihvatanja

- [ ] `p-digital-center.com` služi platformu; `psihointegritet.com` je samo tenant domen
- [ ] nijedan produkcioni zahtev ne zavisi od `DEFAULT_ORGANIZATION_SLUG`
- [ ] runtime DB uloga **nema** `BYPASSRLS` i **nije** vlasnik tabela
- [ ] polise postoje za svaku `ORGANIZATION_SCOPED` i `DERIVED_CHILD` tabelu
- [ ] namerno izostavljen `organization_id` filter u repozitorijumu vraća **0 redova**, ne tuđe
- [ ] jedan production backend, jedna production baza; jedan staging backend, jedna staging baza
- [ ] QA i staging frontend gađaju isti staging backend
- [ ] Sanjini podaci u zajedničkoj bazi, sa netaknutim `organization_id`
- [ ] cross-tenant test uživo: Sanjina sesija ne vidi nijedan Psiho red i obrnuto
- [ ] tek posle svega: Sanjin Railway servis i baza obrisani

---

## 7. Van obima ovog plana

- Deljeni Clerk model i migracija korisnika između Clerk instanci — zaseban zadatak
- PDC-1 Page Composer i Sanjin sadržaj — nezavisno, ne čeka ovo
- Onboarding UI za trećeg tenanta — cilj **posle** konsolidacije, ne uslov za nju

---

## 8. Merilo

Kad ovo prođe, treći tenant nije infrastrukturna faza nego:

```
create organization → add domain → assign owner → configure tenant → publish
```

Jedna platforma, jedna infrastruktura po okruženju, organizacija je podatak — nije deployment.
