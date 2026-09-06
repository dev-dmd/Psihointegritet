# P. DIGITALNI CENTAR — platformski plan v1.1

**Datum:** 2026-09-06 · **Vlasnik:** Milan Dražić (CTO)
**Status:** aktivan · **Odluka koja ga uvodi:** `PRODUCT_DECISIONS.md` D-080 (+ Amandman 1)
**Tenant specifikacija:** `SANJA_NEUER_TENANT_v1_0.md`

> **v1.1 (2026-09-06)** — posle revizije tenant provisioning path-a (§3). PDC-0 je razložen na
> **PDC-0A…0E** sa kriterijumima prihvatanja (§4), faze su prenumerisane (§5), i dodata su tri
> arhitektonska pravila (§6). Tvrdnja iz v1.0 da je „šav već postoji i radi" je **potvrđena na
> backendu i opovrgnuta na frontendu** — vidi §2.3.

---

## 0. Šta se menja u načinu rada

Do sada je kriterijum bio: *šta još treba završiti od Psihointegriteta?*

Od sada je: **šta mora da radi da Sanja može P. DC da koristi bez Milana za svakodnevni posao?**

Iz toga sledi tri pravila koja važe za ceo ovaj plan:

1. **Ne završavamo Psihointegritet backlog zato što postoji.** Sanja određuje sledeći
   vertical slice.
2. **Ono što iz stare implementacije radi dobro — koristimo.** Booking i Intake se ne
   redizajniraju.
3. **Ono što je komplikovano ili pogrešno ne popravljamo samo zato što je već napravljeno** —
   zamenjujemo boljim modelom dok gradimo stvarnu upotrebu.

P. Digitalni Centar više nije „platforma napravljena za Psihointegritet". To je multi-tenant
proizvod za psihologe, psihoterapeute, konsultante, edukatore i srodne profesionalce.
Psihointegritet ostaje **demo tenant**. Sanja Neuer je **prvi tenant u stvarnoj svakodnevnoj
upotrebi**.

---

## 1. Ciljna struktura

```
P. DIGITALNI CENTAR  (P. DC)
│
├── Platform / Superadmin
│   Tenants · Users · Feature Gates · Diagnostics · Engine status · audit · tenant konfiguracija
│   privremeni postojeći host  →  kasnije  p-digital-center.com
│
├── Psihointegritet Demo          →  psihointegritet.com
│   Maria Bullock · Elsa Browers · John Francis
│   Kompas · Intake · Anketa · My Workspace · Booking · Client panel · Admin panel
│
└── Sanja Neuer                   →  njen domen (čeka se)
    1:1 konsultacije · mentorstvo · Booking · Intake · Blog · Video Blog
    Anketa · Client panel · Admin panel
```

Dva potpuno različita poslovna modela na **istim engine-ima**:

```
 PSIHOintegritet Demo                  Sanja Neuer
          │                                 │
 Multi-provider                      Expert/Creator
 Therapist matching                  Personal methodology
          │                                 │
 Booking Engine                      Booking Engine
 Intake Engine                       Intake Engine
 Content Engine                      Content Engine
 Compass                             Video + Blog
 Client Workspace                    Client Workspace
```

To je zdravija arhitektura nego forkovanje repoa za Sanju, i jedini način da se sazna šta je
u kodu stvarno platformsko, a šta je samo Psihointegritetova pretpostavka koja se prikrala.

---

## 2. Domain policy — najvažniji deo ovog plana

### 2.1 Odluka

**`psihointegritet.com` od ovog trenutka više nije platformski domen.** To je custom domen
jednog normalnog demo tenanta.

Domen se **ne uklanja sada.** Prelazak na `p-digital-center.com` je namerno odložen dok
Sanja tenant ne proradi end-to-end. Ne troši se vreme na rebranding infrastrukture dok se još
raspetljava admin i content model.

Ali od danas se **arhitektura piše kao da je `p-digital-center.com` platformski domen**, čak
i ako DNS još nije prebačen.

### 2.2 Formulacija koja se prosleđuje svakom agentu i saradniku

> `psihointegritet.com` must no longer be treated as the platform identity or platform root
> domain. It is a normal demo tenant custom domain. The platform must be domain-agnostic and
> prepared for a later canonical platform domain migration to `p-digital-center.com`, without
> performing that migration now.

### 2.3 Kako se domain-agnostičnost postiže — **ispravka predloženog mehanizma**

> **Sudar sa donetom odlukom. Cilj ostaje, mehanizam se menja.**

Predlog je bio tenant resolver oblika:

```
request hostname → domain mapping → tenant → theme / features / content / booking / intake
```

**To se ne sme implementirati**, jer je u sudaru sa **D-077, Amandman 1 (C2 zaključan na (a))**:

- **jedan deployment = jedna organizacija**;
- javne stranice ostaju **SSG/ISR** i **ne smeju** da zavise od request host/header konteksta;
- zabranjeni izvori javnog tenant/locale konteksta: **`Host`**, `X-Organization-*`, browser
  cookie, `Accept-Language`;
- zabrana je sprovedena **statički**, u `frontend/scripts/check-frontend-architecture.mjs`
  (vidi liniju ~542), zato što je otkaz tiho gubljenje statike, ne izuzetak.

Runtime resolver po hostname-u bi svaku javnu stranicu obe firme pretvorio u dinamički render.
To je C2(b) (host-shared multi-tenancy), koji po D-077 ostaje isključivo kroz
`ADR-023 §6.3 + RLS milestone` i **ne gradi se usput**.

**Dobra vest:** pod C2(a) je domain-agnostičnost *lakša*, ne teža. Tenant se ne razrešava
iz hostname-a — **razrešava se iz deployment konfiguracije**:

```
deployment  →  DEFAULT_ORGANIZATION_SLUG  →  tenant
                                              ├ theme (tokeni)
                                              ├ feature gates
                                              ├ content
                                              ├ booking
                                              └ intake
```

Šav već postoji i radi: `DEFAULT_ORGANIZATION_SLUG` se build-time inline-uje u
`frontend/next.config.ts`, a registar tenanta je `frontend/src/lib/tenant/organizations.ts`.
Sanja se dodaje kao još jedan unos i još jedan deployment.

Time se **nigde ne grana po domenu** — što je jača garancija od one koja je tražena. Domen
postaje čista deployment/DNS konfiguracija, tačno kako i treba.

**Prelazak na `p-digital-center.com` kasnije** je onda promena env vrednosti + DNS, ne
arhitektonski posao — što je bio i cilj.

### 2.3.1 Provereno: da li je `DEFAULT_ORGANIZATION_SLUG` pravi root tenant context?

Pitanje je bilo da li je taj env samo fallback za content pack, ili može da nosi
`organization → branding · theme · pages · content · services · booking · intake · survey · features`.

**Backend: već jeste pun root tenant context.** `settings.default_organization_slug` se razrešava u
`Organization` red i odatle vodi svaki modul:

| Površina | Gde |
| -------- | --- |
| Content + taxonomy | `modules/content/router.py:78,89` · `taxonomy_router.py:63,466,492` |
| Kompas | `modules/compass/router.py:59,70` · `content/compass_router.py:69` |
| Privacy / pravna dokumenta | `modules/privacy/router.py:53,122` · `privacy/service.py:708` |
| Research / Anketa | `modules/research/router.py:66,84` |
| Booking | `modules/booking/router.py:808` |
| Intake / guidance | `modules/guidance/router.py:173` · `guidance/service.py:368` |
| Auth / staff actor | `api/dependencies.py:81,125` |

**Frontend: nije — ali šav postoji i namerno je tako oblikovan.** Env dopire samo do četiri mesta:
`content/registry.ts:47` (content pack), `proxy.ts:45` (fallback locale),
`lib/tenant/org-context.ts:157` (org context) i `api/organizations/me/locales/route.ts:38` (cache tag).

Nosilac je **`getDeploymentOrganization()`** u `lib/tenant/org-context.ts`. Danas vraća
`{ slug, contentPack, uiLocale, defaultContentLocale, timeZone }` — dakle locale i pack, ne branding.
Ali već radi hibrid *checked-in registar + živi backend fetch* i nosi eksplicitan
`TODO(org-backend)`: kad stigne `GET /api/v1/organizations/me`, čita keširanu organization konfiguraciju
pod statički poznatim organization id-em, **a pozivna mesta se ne menjaju**.

**Zaključak:** to je tačno taj seam. Sve tenant-scoped konfiguracije (branding, site settings, kasnije
sekcije stranica) idu kroz `OrganizationContext`, **nikad kroz paralelni mehanizam** i nikad kroz nov
modul-level konstantu. Backend `organizations` tabela danas ima samo
`id · slug · display_name · ui_locale · default_content_locale · created_at`, pa PDC-0B mora da doda
javnu konfiguraciju kao kolone ili vezanu tabelu. `display_name` je već seed za `publicName`.

### 2.4 Šest mesta gde se domeni neprimetno hard-code-uju — stvarni nalaz

Provereno u kodu, ne pretpostavljeno:

| # | Mesto | Status | Nalaz |
| - | ----- | ------ | ----- |
| 1 | **Email linkovi i canonical URL-ovi** | 🔴 **hard-coded** | `backend/.../infrastructure/email/layout.py:17` — `base = "https://psihointegritet.com"`; `.../email/templates.py:18` — `_app_url()` isto. Sanjini review/notification mejlovi bi vodili na tuđi domen. |
| 2 | **Sender identitet** | 🔴 **hard-coded** | `.../email/resend_client.py:64` — default `review@psihointegritet.com` i fiksno ime pošiljaoca `"Psihointegritet"`. |
| 3 | **Site settings / kontakt** | 🔴 **hard-coded** | `frontend/src/content/site-settings.ts` — `name: "Psihointegritet"`, `contactEmail: "info@psihointegritet.com"`, plus `locations` (Chicago/Milwaukee/Madison) i `country: "USA"` koji Sanji ne znače ništa. |
| 4 | **Staff roster i provisioning** | 🟠 delimično | `backend/.../modules/identity/roster.py`, `backend/scripts/provision_staff.py`, `frontend/scripts/set-clerk-roles.mjs` — `@psihointegritet.com` adrese kao ugrađeni podaci. |
| 5 | **Sitemap, metadata, OpenGraph, robots** | 🟢 **već čisto** | `frontend/src/app/layout.tsx:28` koristi `metadataBase: new URL(serverEnv.NEXT_PUBLIC_APP_URL)`; `discoverability.ts` isto. Ne dirati — ovo je model kako ostalo treba da izgleda. |
| 6 | **CORS / trusted origins** | 🟢 konfigurisano | `backend/.../core/config.py:35` — `cors_origins` je lista iz env-a. Treba samo proširiti po deployment-u. |
| 7 | **Auth redirect / Clerk allowed domains** | ⚪ **za proveru** | Nije potvrđeno u ovom prolazu. Proveriti pre Sanja deployment-a — Clerk allowed origins i redirect URL-ovi su konfiguracija u Clerk dashboard-u, ne samo u kodu. |
| 8 | **Cookies i cookie domain** | ⚪ **za proveru** | Nije potvrđeno. Ako se cookie domain igde postavlja eksplicitno, mora da bude per-deployment. |

**Env promenljive koje se uvode u PDC-0:**

```
PLATFORM_HOST          # p-digital-center.com kad dođe; do tada privremeni host
PUBLIC_APP_HOST        # javni host tekućeg deployment-a (postoji kao NEXT_PUBLIC_APP_URL)
EMAIL_BASE_URL         # zamenjuje literal u layout.py/templates.py
EMAIL_FROM             # već postoji, ali ime pošiljaoca mora iz konfiguracije
EMAIL_SENDER_NAME      # zamenjuje fiksno "Psihointegritet"
```

`ADMIN_HOST` i `TENANT_DOMAINS` iz prvobitnog predloga se **ne uvode** — pod C2(a) admin živi
na istom hostu kao i tenant deployment, a mapa domena bi bila upravo zabranjeni host resolver.

---

## 3. Revizija tenant provisioning path-a (2026-09-06)

Pre implementacije provereno je da li tenant provisioning uopšte postoji. **Ne postoji.**
Nalaz je dokaz, ne procena — svaka tvrdnja ima mesto u kodu.

| # | Pitanje | Odgovor | Dokaz |
| - | ------- | ------- | ----- |
| 1 | Superadmin kreira tenanta? | **Ne** | Nema `POST /organizations`. `Organization(` postoji samo kao definicija klase (`modules/organizations/models.py:22`); nigde se ne instancira. UI: *„Novi tenant — onboarding tok je planiran za fazu white-label ponude. **Uskoro**"* (`app/(superadmin)/superadmin/tenants/page.tsx:23`) |
| 2 | Tenant dobija svoj slug/id? | **Ne kroz kod** | Jedina organizacija je `op.bulk_insert` u migraciji `20260722_0001:459` sa fiksnim UUID-om |
| 3 | Učitava se na subdomenu? | **Nema mehanizma** | Nema `vercel.json`, nema wildcard konfiguracije, `proxy.ts` (92 linije) ne pominje hostname |
| 4 | Hostname resolver vraća tenanta? | **Ne postoji — i ne sme** | D-077 A1; zabrana aktivno sprovedena u `scripts/check-frontend-architecture.mjs:542` |
| 5 | Auth/admin vezan za pravog tenanta? | **Da, ali za jednog** | `resolve_staff_actor` uzima org iz `settings.default_organization_slug` (`core/config.py:41`), ne iz korisnikovog membership-a |
| 6 | Public frontend bez psihointegritet.com? | **Ne** | `content/site-settings.ts` je modul-level konstanta, nije tenant-scoped — curi u footer, kontakt, pravna dokumenta i SEO provider na svakom deployment-u |
| 7 | Nov tenant kreće prazan? | **Da** | `blank` pack sa `demoDataMode: "off"` i `sourceStatus: missing` (`content/packs/blank/index.ts`) |

### 3.1 Šta iz revizije zaista sledi

**Izolacija je zdrava.** `organization_id` je stvarna granica, superadmin se čita iz PostgreSQL kolone
a ne iz Clerk claim-a, i postoji namerno prazan content pack. Nov tenant neće naslediti Psihointegritetov
sadržaj. To je dobra polazna tačka.

**Ali „multi-tenant" je danas šema baze, ne radni tok.** Sve što razlikuje tenante je checked-in kod i
env, a ne podatak koji se kreira. Superadmin „Tenanti" ekran je mock iz dizajn prototipa
(`psihointegritetTenant` sa `domain: "psihointegritet.com"`), a detaljna stranica nosi komentar
`// Only the hardcoded Psihointegritet tenant exists in this phase.`

**Dva nalaza menjaju obim u odnosu na v1.0:**

1. **Sanji treba i sopstveni backend deployment**, ne samo frontend — `default_organization_slug` je
   backend env i određuje kome pripada *svaki* staff zahtev. Jedan backend ne servisira oba tenanta
   pod C2(a). Postaje **PDC-0C**.
2. **`site-settings.ts` je veći problem od email literala**, jer curi u javne stranice i pravna
   dokumenta. Postaje **PDC-0B** i ima prioritet.

---

## 4. PDC-0 — zaključana faza

**Cilj:** dva deployment-a iz istog koda, bez white-label onboarding sistema.

> **Rez koji definiše ovu fazu.** Ručni provisioning je prihvatljiv; ručna izmena podataka nije.
>
> **OK:** developer pokrene bootstrap komandu → kreira organizaciju → podesi env → deploy.
> **Nije OK:** otvori SQL editor, ručno menja 17 tabela, kopira Psihointegritet podatke, zamenjuje stringove.
>
> Granica je da **ručni tok danas mora da poziva isti application/service sloj koji će sutra pozvati
> Superadmin onboarding UI.**

### PDC-0A — Tenant identity & bootstrap

Sanja kao stvarna organizacija: `slug: sanja-neuer` · `contentPack: blank` · `demoDataMode: off`.

**Ključno pravilo: tenant nije schema migracija.** Ne uvodi se obrazac
`tenant 1 → migracija · tenant 2 → migracija · tenant 3 → migracija`. Tenant podaci nisu šema.

Umesto toga — minimalan reusable provisioning seam, **bez UI-ja**:

```
create organization
      ↓
validate unique slug
      ↓
create organization row
      ↓
apply initial/default configuration
      ↓
return organization id/slug
```

Danas ga zove developer (CLI / script / bootstrap task), sutra isti application path zove white-label
onboarding. Mora da bude **idempotentan** — dvostruko pokretanje ne pravi drugi red niti pada.

Istorijsku Psihointegritet migraciju **ne diramo**. Sanja je trenutak da se obrazac preseče, ne da se
retroaktivno ispravlja.

**Ne pravimo:** hostname resolver · wildcard subdomene · onboarding UI · izmenu C2(a).

### PDC-0B — Tenant-scoped public site settings

**Prvi implementacioni zadatak.**

Cilj nije da `site-settings.ts` dobije granu po tenantu. Ovo je izričito **pogrešno**:

```ts
if (slug === "sanja-neuer") { ... }   // ne
```

Cilj je da globalna konstanta **prestane da postoji**:

```ts
export const siteSettings = {            // ovo nestaje
  name: "Psihointegritet",
  contactEmail: "info@psihointegritet.com",
}
```

i da se zameni lancem:

```
current organization / deployment
        ↓
tenant public configuration
        ↓
site settings
```

Polja, koliko postojeći model dozvoljava: `publicName` · `publicUrl` · `contactEmail` · `legalName` ·
`logo` · `locale` · `socialLinks` · `seoDefaults`.

Nosilac je `OrganizationContext` iz `getDeploymentOrganization()` (§2.3.1) — **ne** nov paralelni modul.
Footer, kontakt stranica, pravna dokumenta i SEO provider čitaju **isti** tenant-scoped izvor.
To uklanja celu klasu grešaka odjednom.

#### Status PDC-0B — isporučeno 2026-09-06 (commit `9145347`)

`content/site-settings.ts` je **obrisan**. Javni identitet ide kroz
`getDeploymentOrganization() → OrganizationContext.publicSite`, isti put kojim već ide locale.

**Dva accessora**, po uzoru na postojeći locale split:

| Accessor | Oblik | Za koga |
| -------- | ----- | ------- |
| `getPublicSiteSettings()` | async, `server-only` | render (footer, header, CTA, kontakt, o-nama, pravna) |
| `deploymentPublicSite()` | sync, čita registar | `static-provider.ts` (module-level konstanta) i Content Health CLI (čist Node) |

**Migrirano:** `site-footer` · `site-header` · `final-cta` · `kontakt` · `o-nama` ·
`legal-document-page` · `discoverability.ts` (`jsonLdForEntity`/`jsonLdForRoute` primaju identitet
kao parametar, kao i `provider`) · `static-provider.ts`.

**Brend je bio i doslovan literal** u `site-header`, `site-footer` i `final-cta`, i **upečen u
katalog poruka** (`footer.rights`, `footer.organizationGroup`). Postali su `{organization}`
placeholderi iz tenant konfiguracije. Ključevi `footer.formats` i `pages.contact.formats` su
**uklonjeni** — nosili su „online i uživo", što je činjenica o tenantu, ne platformski UI.

**Prazne lokacije su nosivi slučaj, ne ivični.** `organizationLocationsLabel()` vraća prazan string
za online-only tenanta, pozivaoci uz njega izbacuju i separator (inače linija počinje sa „ · "),
a `areaServed` se svodi na `["online"]`.

**Provereno stvarnim build-om oba deployment-a:**

```
DEFAULT_ORGANIZATION_SLUG=sanja-neuer      → „Sanja Neuer" ×11 · kontakt@sanjaneuer.com
                                             „© 2026 Sanja Neuer." · formats linija: „online"
DEFAULT_ORGANIZATION_SLUG=psihointegritet  → „© 2026 Psihointegritet." · info@psihointegritet.com
                                             „Chicago, IL · Milwaukee, WI · Madison, WI · online i uživo"
```

Javne rute ostaju `○` static — SSG ugovor nije narušen. Gate: `tsc` · `lint` · `format:check` ·
`architecture:check` · 92 test fajla / 766 testova, uz 10 novih u `lib/tenant/public-site.test.ts`.

**Šta PDC-0B namerno NIJE dirao.** Na Sanjinom build-u 24/25 stranica i dalje sadrži „Psihointegritet",
ali **nijedno pojavljivanje nije identitet** — sve su:

1. **per-route SEO stringovi** u `static-provider.ts` (`seo: { title: "Psihointegritet", … }`,
   opisi sa „u Chicagu, Milwaukeeju i Madisonu");
2. **marketing proza** u katalogu poruka (`footer.description`, `pages.about.intro`,
   „Upoznajte terapeute Psihointegriteta").

To je **sadržaj, ne identitet**, i pripada modelu stranice — PDC-1 read-only Page Composer +
zaseban content completion zadatak. Linija je namerna: identitet je činjenica o organizaciji koja
važi bez obzira koja se stranica renderuje; proza pripada stranici.

> **Posledica za kriterijume prihvatanja (§4.1).** Stavka „nigde javno ne piše Psihointegritet"
> **nije zadovoljena PDC-0B-om i ne može biti** — traži PDC-1, jer izvor nije više identitetski
> sloj nego katalog sadržaja. Stavke koje **jesu** zadovoljene: footer ima Sanjine podatke ·
> legal/public config nema Psihointegritet podatke · Psihointegritet demo nije regresiran ·
> tenant boundary testovi prolaze.

### PDC-0C — Backend deployment isolation

```
Psihointegritet frontend  ↕  Psihointegritet backend
                             DEFAULT_ORGANIZATION_SLUG=psihointegritet

Sanja frontend            ↕  Sanja backend
                             DEFAULT_ORGANIZATION_SLUG=sanja-neuer
```

Sanja dobija **svoj FE i svoj BE deployment, iz istog koda**. Baza ne mora nužno da bude druga ako je
`organization_id` boundary ispravan, ali **application runtime je po C2(a) vezan za jednu organizaciju**.

Ovo je arhitektonski važno i zato stoji eksplicitno, a ne kao pretpostavka.

#### Vercel env matrica — postavljeno 2026-09-06

Do sada nigde zapisano, pa se rekonstruisalo iz build loga svaki put kad bi puklo. Ovo je
zapis stvarnog stanja projekta `cikadrazas-projects/psihointegritet`, provereno kroz CLI.

**Domeni → grane** (svi verifikovani, `Root Directory: frontend`):

| Domen | Grana |
| ----- | ----- |
| `psihointegritet.com` · `psihointegritet.vercel.app` | Production |
| `qa.psihointegritet.com` | `features` |
| `staging.psihointegritet.com` | `staging` |

**Promenljive po scope-u:**

| Scope | `DEPLOYMENT_ENV` | `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_API_URL` |
| ----- | ---------------- | --------------------- | --------------------- |
| **Production** | `production` | `https://psihointegritet.com` | `https://diligent-serenity-production-1b3e.up.railway.app` |
| **Preview — sve grane** | `preview` | `https://qa.psihointegritet.com` | `https://diligent-serenity-features.up.railway.app` |
| **Preview — grana `staging`** | `staging` | `https://staging.psihointegritet.com` | `https://diligent-serenity-staging.up.railway.app` |

Vercel bira **specifičniji** unos, pa branch-scoped `staging` gazi neograničeni Preview bez
ikakve logike u kodu. Grana `features` namerno **nema** svoj unos — nasleđuje Preview, jer je
duplikat vezan baš za `features` i bio uzrok zabune (svaka druga grana je ostajala bez ijedne
promenljive i build je padao na `serverEnv`).

**Tri pravila koja iz ovoga slede:**

1. **Šema je obavezna.** `NEXT_PUBLIC_APP_URL` prolazi kroz `z.url()` i kroz
   `new URL()` u `metadataBase`; gola vrednost `qa.psihointegritet.com` pada na oba mesta.
   Uvek `https://`.
2. **Ne vezivati promenljive za pojedinačnu feature granu.** Neograničen Preview + override
   samo tamo gde se vrednost stvarno razlikuje (`staging`).
3. **Tip `config`, ne `secret`.** Ništa od ovo troje nije tajna — dve su ionako `NEXT_PUBLIC_`.
   Kao `secret` su nečitljive i za `env pull` i u dashboard-u, što je i produžilo dijagnostiku.

> **Popravljen tihi kvar na produkciji.** `DEPLOYMENT_ENV` **nije postojao** u Production scope-u.
> `env.ts` ga tada defaultuje na `development`, a `deploymentEnvironmentFromRuntime()` traži
> tačan string `production` — pa je `isProductionEnvironment()` vraćao `false` i `/robots.txt`
> je servirao **`Disallow: /`**, čime je ceo sajt bio blokiran na nivou crawlera. Nije se videlo
> ni u jednom build logu jer ništa ne puca. Posle popravke i redeploy-a produkcija vraća
> `Allow: /` uz sitemap referencu — provereno 2026-09-06.
>
> **Ali indeksiranje time nije otključano, i to nije kvar.** `pageMayBeIndexed()` traži i
> `publicationStatus === "published"`, a sve statičke stranice nose `prelaunchStatus = "in_review"`
> (`static-provider.ts:32`) — namerno, dok R1.5 ne prevede odobrene stranice u `published`.
> Zato `<meta name="robots" content="noindex">` i prazan `sitemap.xml` **ostaju** i posle
> ispravnog `DEPLOYMENT_ENV`. Env otvara vrata crawleru; sadržaj otvara odobrenje.
>
> Ranija formulacija ovog pasusa pripisivala je prazan sitemap isključivo env-u — netačno.

#### Provisioning je po bazi, ne po kodu — stanje 2026-09-06

`ensure_internal_user` namerno pravi **neutralan** red na prvi verifikovan login i ne dodeljuje
nijednu privilegiju („Register a verified person, but never grant a domain privilege implicitly").
Zato svaka sredina traži svoj `provision_staff.py` / `provision_team.py`, a dok se ne pokrene,
`resolveLandingRoute` sve šalje na `/nalog` — što izgleda kao kvar rutiranja, a nije.

| Sredina | Clerk instanca | Superadmin | Tim | Status |
| ------- | -------------- | ---------- | --- | ------ |
| localhost | development | `milan-dmdevelon` | Maria · Elsa · John | ✅ |
| features (QA) | development | oba Milanova naloga | ✅, stari tim `disabled` | ✅ zatečeno ispravno |
| staging | development | `milan-dmdevelon` | Maria · Elsa · John | ✅ postavljeno |
| production | **production** | ❌ **nijedan** | ✅ | ⛔ vidi ispod |

**Zašto produkcija nije završena.** Roster drži Clerk ID po instanci. Tim od 2026-08-09
(D-074) ima **oba** — dev i prod. **Nijedan Milanov nalog nema zabeležen produkcijski ID**,
pa `--person` tamo ne prolazi. Roster to izričito kaže: *„Anything not recorded here must still
be passed explicitly rather than guessed."* Superadmin na produkciji traži ID iz Clerk
**production** dashboarda:

```
python scripts/provision_staff.py \
    --external-id user_<prod_id> \
    --email milan.drazic@dmdevelon.website \
    --roles org_admin --superadmin
```

**Kako se izvršava na Railway-u.** `railway ssh` traži registrovan ključ, a `backend/.env.local`
gađa `postgres.railway.internal` koji je nedostupan spolja — i skripta ga namerno ne čita
(*„a script that auto-loaded it would take a command typed on a laptop and quietly apply it to
production"*). Put koji radi: uzeti `DATABASE_PUBLIC_URL` iz Railway varijabli tog okruženja,
prevesti šemu u `postgresql+asyncpg://` i proslediti je lokalnom backend kontejneru:

```
docker compose exec -e DATABASE_URL="<public url, asyncpg>" -e ENVIRONMENT=<staging|production> \
  backend python scripts/provision_staff.py --person <key>
```

> **Tri okruženja dele proxy domen `tokaido.proxy.rlwy.net` i razlikuju se samo portom**
> (features `23438`, staging `38992`, production `19415`). Uvek proveriti port pre izvršavanja —
> jedina razlika između staging komande i produkcijske je pet cifara.

### PDC-0D — Email identity

Odmah ukloniti `https://psihointegritet.com` i sender `Psihointegritet` iz email infrastrukture
(`infrastructure/email/layout.py:17`, `templates.py:18`, `resend_client.py:64`).

**Ovo je produkcijski bug, ne branding polish.** Sanjin deployment može da radi savršeno, a klijent
dobije mejl potpisan tuđim imenom sa linkom na tuđi domen.

Konceptualno: `organization.public_name` · `public_url` · `email_sender_name` · `support_email` — ili
konfiguracioni ekvivalent koji odgovara postojećoj arhitekturi. Template koristi tenant context,
**nikad literal**. Isto važi za unsubscribe/privacy/booking linkove.

Ne rešavaju se svi budući white-label email scenariji — samo se sprečava cross-tenant leakage.

### PDC-0E — Auth / domain audit

Ne blokira read-only javnu početnu, ali je **gate pre admin / Booking / Client korišćenja**:

sign-in URL · sign-up URL · after-sign-in redirect · after-sign-up redirect · Clerk allowed origins ·
authorized redirect URLs · session cookie scope · backend CORS.

**Sesija se ne deli između deployment-a.** Ne pokušavamo zajedničku browser sesiju za
`psihointegritet.com`, Sanjin domen i `p-digital-center.com` dok za to ne postoji razlog.
Host-only sesija je ovde **prednost**, jer tenant deploymenti ostaju izolovani.

### 4.1 Kriterijumi prihvatanja za PDC-0

PDC-0 je gotov kada se iz istog koda podignu dva deployment-a:

```
Deployment A   DEFAULT_ORGANIZATION_SLUG=psihointegritet   → Psihointegritet demo
Deployment B   DEFAULT_ORGANIZATION_SLUG=sanja-neuer       → Sanja Neuer
```

i kada na Sanjinom deployment-u važi **sve**:

- [ ] nigde javno ne piše „Psihointegritet" osim ako je deo namerno unetog sadržaja
      — **prenosi se u PDC-1.** Posle PDC-0B preostala pojavljivanja nisu identitet nego
      per-route SEO stringovi i marketing proza u katalogu sadržaja (vidi status PDC-0B).
- [x] footer ima Sanjine podatke
- [x] legal/public config nema Psihointegritet podatke
- [ ] SEO nema Psihointegritet identitet — **JSON-LD jeste** tenant-scoped (PDC-0B);
      per-route `title`/`description` još dolaze iz kataloga sadržaja, pa ostaje za PDC-1
- [ ] email nema Psihointegritet sender ni linkove
- [ ] `sanja-neuer` organizacija postoji u bazi, kreirana kroz bootstrap seam (ne kroz migraciju)
- [ ] nema demo Psihointegritet podataka
- [x] tenant boundary testovi prolaze
- [x] **postojeći Psihointegritet demo nije regresiran**

Tek tada se prelazi na PDC-1.

---

## 5. Faze posle PDC-0

| Faza | Cilj |
| ---- | ---- |
| **PDC-1** | **Read-only Page Composer runtime** + Sanjin javni frontend preko tog modela |
| **PDC-2** | Page Composer admin UX |
| **PDC-3** | Blog / stručni sadržaj / Video sadržaj |
| **PDC-4** | Postojeći Booking + Intake integracija |
| **PDC-5** | Clients + Client Workspace |
| **PDC-6** | Survey Engine (Anketa) |
| **PDC-7+** | Dalji engines po realnoj potrebi (Kompas, Program/Enrollment…) |

### PDC-1 — Read-only Page Composer runtime

**Najvažniji rez u celom planu:** prvo runtime model, tek onda editor.

Ne pravi se prošireni `FallbackContent`:

```
FallbackContent
  homepage.title
  homepage.subtitle
  homepage.method1
  homepage.method2      ← ovo je samo nov hard-coded Psihointegritet sa drugim stringovima
```

Pravi se model:

```
Page
 ├── section
 ├── section
 └── section
```

gde sekcija nosi: `type` · `position` · `enabled` · `content` · `settings`.

Sanjin homepage vizuelno ostaje praktično isti, ali umesto JSX-a sa ugrađenim tekstom:

```
<Frameworks />  <Methodology />  <Services />  <VideoBlog />
```

dobija:

```
Page definition → sections[] → section renderer registry → postojeće UI komponente
```

**Prva verzija nema editor.** Time se dramatično smanjuje rizik da napravimo admin, pa shvatimo da
frontend traži drugi model. Admin (PDC-2) posle uređuje **isti** model.

---

## 6. Arhitektonska pravila

Tri pravila koja izlaze iz revizije i važe od sada.

### 6.1 Tenant differentiation through tokens, configuration and content composition before component forks

`sanja-theme.css` dokazuje da tenant dizajn može da bude *postojeći `PsihointegritetUI` + drugačiji tokeni*:

```
PDC Design System → shared components → tenant theme tokens
                                        ├── Psihointegritet theme
                                        └── Sanja Neuer theme
```

a **ne**:

```
SanjaHomepage.tsx · SanjaButton.tsx · SanjaCard.tsx · SanjaHeader.tsx …
```

Fork komponente **samo** ako postoji stvarna strukturna razlika — nikad zbog boje, razmaka ili teksta.

### 6.2 Kontrolisan skup sekcija — nema proizvoljnog HTML/CSS-a

Sanji ne treba Webflow. Tenant bira **između naših kontrolisanih komponenti**, svaka sa definisanim
schema kontraktom:

`Hero` · `Intro` · `ExpertiseTags` · `FrameworkCards` · `Methodology` · `Services` · `ProcessSteps` ·
`FeaturedContent` · `VideoGrid` · `ArticleGrid` · `FAQ` · `CTA`

Kasnije: reorder · hide/show · add existing section type · remove · duplicate · možda variants.
Nikad: proizvoljan HTML ili CSS. Tako garantujemo njen dizajn. Ista lekcija kao na Marysoll Edu Centru.

### 6.3 Tenant podaci nisu schema migracija

Kreiranje tenanta ide kroz application/service sloj (PDC-0A), ne kroz Alembic. Migracija menja **oblik**
baze; tenant je **sadržaj** baze. Istorijska Psihointegritet migracija ostaje kakva jeste.

---

## 7. Van obima prvog Sanja release-a

Postoje kao platform direction, ali Sanji trenutno ne donose dovoljno:

- komplikovan multi-provider matching · B2B Companies · veliki Program Builder
- napredni Kompas · veoma kompleksne ankete · AI dijagnostika · deset AI agenata
- potpuno slobodan page builder
- **Superadmin „Novi tenant" wizard** — manual bootstrap je dovoljan za drugog tenanta; usko grlo
  postaje tek oko petog
- **C2(b) host-shared multi-tenancy** — ostaje kroz `ADR-023 §6.3` + RLS milestone
- **preimenovanje Python paketa `psihointegritet`** → tehnički dug
  („Internal namespace rename after product architecture stabilizes"). Promena bi dotakla import-e,
  putanje, testove, Alembic reference, tooling i deployment konfiguraciju **bez ikakve funkcionalne
  koristi za Sanju**. Interni namespace sme privremeno da zadrži istorijski naziv. Nije u Sanja
  critical path-u.

---

## 8. Otvorena pitanja

| # | Pitanje | Blokira |
| - | ------- | ------- |
| 1 | Sanjin domen | ništa u razvoju; blokira launch |
| 2 | Cene konsultacije i mentorstva | ekran „Usluge i cene" |
| 3 | Zvanja, akreditacije, `∞` kongresa, brojevi pregleda | objavu početne |
| 4 | Njeni pravni tekstovi (zaseban pravni subjekt) | launch |
| 5 | Šta sme da stoji u beleškama o klijentu — pravno i kliničko pitanje | PDC-5 |
| 6 | Clerk allowed domains / redirect URL-ovi i cookie scope | **PDC-0E** |
| 7 | Da li Superadmin ostaje na istom deployment-u kao demo tenant ili dobija svoj | PDC-0 završetak |

Pitanja 2–5 su na STOP listi (`SANJA_NEUER_TENANT_v1_0.md §9`) — ne pogađaju se.

---

## 9. Veze

| Dokument | Uloga |
| -------- | ----- |
| `SANJA_NEUER_TENANT_v1_0.md` | Šta je Sanja tenant — sadržaj, model, engine-i, STOP lista, status sadržaja |
| `PRODUCT_DECISIONS.md` D-080 + A1 | Odluka koja uvodi ovaj plan i njena revizija |
| `PRODUCT_DECISIONS.md` D-077 A1 | C2(a) — određuje kako se tenant razrešava (§2.3) |
| `adr/ADR-023-multi-tenant-isolation-and-rls.md` | `organization_id` kao jedina granica; §6.3 = C2(b) |
| `adr/ADR-026-organization-locale-and-route-registry.md` | Locale i registar ruta po organizaciji |
| `CLAUDE_CODE_MASTER_PLAN_v1_0.md` | Prethodna sekvenca — **podređena ovom planu za Sanja slice** |
| `TODO.md` | Živi status rada |
