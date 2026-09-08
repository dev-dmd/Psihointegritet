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
`id · slug · display_name · ui_locale · default_content_locale · created_at`. `display_name` je već
seed za `publicName`.

> **Ispravka (2026-09-06).** Raniji tekst je ovde tvrdio da „PDC-0B mora da doda javnu konfiguraciju
> kao kolone ili vezanu tabelu". PDC-0B to **nije uradio i nije trebalo** — pod C2(a) deployment
> legitimno poseduje javni identitet kao build-time konfiguraciju. Persisted, editable public-site
> konfiguracija ne postoji i ne označava se kao gotova. Gde će živeti (kolone na `organizations` vs.
> zasebna settings tabela) odlučuje se **uz ekran koji je piše**, kad Sanja bude menjala te podatke
> iz admina — ne unapred, i ne naduvavanjem centralne `organizations` tabele.

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

#### Status PDC-0A — isporučeno 2026-09-06 (commit `a169b13`)

Sanja postoji kao stvarna organizacija: `sanja-neuer` · `Sanja Neuer` · `sr-Latn`/`sr-Latn`,
sa UUID-om iz baze. Kreirana kroz servis, **ne kroz migraciju**.

**Šav:** `modules/organizations/provisioning.py` drži logiku, `scripts/provision_organization.py`
samo parsira argumente i odlučuje o commit-u — ista podela koja već postoji za staff. Superadmin
onboarding kasnije zove isti kod.

| Ponašanje | Provereno |
| --------- | --------- |
| kreiranje | `created organization sanja-neuer [edca44cb-…]`, exit 0 |
| idempotentnost | drugi identičan poziv: `already exists and matches; nothing to do`, exit 0, bez drugog reda i bez drugog audit zapisa |
| konflikt | drugo `display_name` uz isti slug: greška koja **imenuje polje i obe vrednosti**, exit 1, red nepromenjen |
| tenant resolution | `DEFAULT_ORGANIZATION_SLUG=sanja-neuer` → razrešava `Sanja Neuer` |
| javni endpoint | `/api/v1/public/organizations/sanja-neuer/locales` → `sr-Latn`/`sr-Latn`; nepostojeći slug → 404 `ORG-404` |
| bez regresije | `psihointegritet` i dalje razrešava; 564 backend testa, 766 frontend |

**D-078 je proširen, ne zaobiđen.** `ActorKind` dobija `SYSTEM`, a recorder prima `AuditActor`
umesto `StaffActor`. Lažni `StaffActor` sa `user_id=None` bio bi gori od izostanka traga — čita se
kao stvaran čovek. Migracija `c4d81e37b920` širi CHECK constraint, a njen `downgrade` **odbija da se
izvrši** dok postoje `system` redovi, umesto da briše audit zapise da bi shema prošla.

> **Zamka zabeležena da se ne ponovi:** `op.drop_constraint` primenjuje `NAMING_CONVENTION` iz
> `db/base.py` isto kao `create_check_constraint`. Prosleđivanje već razvijenog imena
> (`ck_organization_audit_events_actor_kind_supported`) razvija se **drugi put** u skraćeno ime koje
> ne postoji. Prosleđuje se **deklarisano** ime (`actor_kind_supported`).

`HEAD_REVISION` u `test_booking_migration_chain.py` je pomeren na `c4d81e37b920` — taj test namerno
pinuje head i komentar traži da se pomera uz svaku migraciju.

**Van obima, kako je i planirano:** nijedna nova kolona na `organizations`, nema HTTP rute, nema
Superadmin UI-ja, nema data migracije za Sanju, i **njen korisnički nalog nije napravljen** — traži
Clerk `external_auth_id` koji ne postoji dok se ne registruje.

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

**Šta PDC-0B nije isporučio.** Persisted, editable public-site konfiguracija na backendu.
`organizations` i dalje nosi samo `display_name` i dva locale-a; `publicSite` dolazi isključivo iz
checked-in registra, a `getDeploymentOrganization()` iz backenda povlači i dalje samo `uiLocale` i
`defaultContentLocale`. To nije nedostatak PDC-0B-a nego njegov namerni obim — treba tek kad tenant
bude uređivao te vrednosti sam.

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

> ## ⚠ SUPERSEDED za frontend deo — D-077 A7 (2026-09-07)
>
> Tekst ispod opisuje **prelaznu implementaciju**, ne ciljnu arhitekturu. Zadržan je jer objašnjava
> zašto Sanjin deployment danas izgleda ovako, i šta je iz njega ostalo tačno.
>
> **Ciljna topologija:**
>
> ```
> PDC Vercel projekat  (jedan)
> ├── p-digital-center.com   → platforma
> ├── psihointegritet.com    → tenant psihointegritet
> └── sanjaneuer.com         → tenant sanja-neuer
> ```
>
> `trusted hostname → domain registry → organizationSlug → rewrite /s/[organizationSlug]/...`
>
> **Zaseban `sanja-neuer` Vercel projekat je privremen migracioni artefakt.** Nije šablon za buduće
> tenante i ne sme se kopirati za trećeg. **Ne briše se** dok B2 cutover ne prođe — vidi
> `PDC_TENANT_ROUTING_AUDIT_v1_0.md §8`.
>
> **Šta iz PDC-0C ostaje tačno:** odvojene **baze** po tenantu ostaju, kao bezbednosna granica dok
> RLS milestone ne bude isporučen (danas: 0 polisa, 111 ručnih filtera, `rolbypassrls=t`).
> **Frontend konsolidacija nije konsolidacija baza.** Backend runtime sme privremeno da ostane na
> C2(a) modelu.
>
> **Dopuna D-081 (2026-09-07):** „privremeno" je od danas imenovano. Odvojen backend i odvojena
> baza po tenantu su **migration artifact**, istog statusa kakav je imao Sanjin Vercel projekat —
> ne razvijaju se dalje. Ciljno stanje je jedan backend i jedna baza **po okruženju**, sa
> `organization_id` kao jedinom granicom. Redosled i gate: `PDC_CONSOLIDATION_MIGRATION_PLAN_v1_0.md`.

```
Psihointegritet frontend  ↕  Psihointegritet backend
                             DEFAULT_ORGANIZATION_SLUG=psihointegritet

Sanja frontend            ↕  Sanja backend
                             DEFAULT_ORGANIZATION_SLUG=sanja-neuer
```

Sanja dobija **svoj FE i svoj BE deployment, iz istog koda**, i — po odluci od 2026-09-06 —
**svoju bazu**. Raniji tekst je ovde ostavljao deljenu bazu kao opciju („ne mora nužno da bude druga
ako je `organization_id` boundary ispravan"); merenje živog stanja je tu opciju zatvorilo. Vidi status
ispod. **Application runtime je po C2(a) i dalje vezan za jednu organizaciju.**

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
| production | **production** | `milan-dmdevelon` | ✅ | ✅ postavljeno |

**Produkcijski Clerk ID je sada u rosteru.** Roster drži Clerk ID po instanci, a tim od
2026-08-09 (D-074) ima oba. Milanov produkcijski ID nije postojao, pa je superadmin tamo
postavljen ručno kroz `--external-id`, a ID je odmah upisan u roster pod `CLERK_PRODUCTION`
(2026-09-06). Od sada i produkcija prolazi kroz `--person milan-dmdevelon`.

Razlog za upis, a ne za ostavljanje ručnog koraka: jedina komanda koja vraća pristup platformi
ne sme da bude ona koja prvo traži da se ID potraži u tuđem dashboardu.

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

#### Status PDC-0C — isporučeno 2026-09-06 (backend), frontend čeka Clerk ključeve

**Odluka: Sanja dobija zasebnu bazu.** Plan je dopuštao deljenu („ne mora nužno da bude druga ako je
`organization_id` boundary ispravan"), ali merenje živog stanja je tu ostavku obesmislilo:

| Mera | Vrednost |
| ---- | -------- |
| Eksplicitni `organization_id` filteri u `modules/` | **111** (dokumentovano 42 na dan 2026-08-01) |
| Tabele sa `organization_id` | **28** (dokumentovano 11) |
| Tabele sa uključenim RLS-om | **0** |
| Runtime DB uloga | `rolsuper=t`, **`rolbypassrls=t`** |

Izolacija počiva isključivo na 111 ručno pisanih filtera, bez zaštite na nivou baze, a runtime uloga
bi zaobišla RLS i da postoji. RLS milestone (§5E) je dokumentovan ali **kod nije počet**. Sanja unosi
stvarne klijente; Psihointegritet je demo. Jedan promašen filter meša to dvoje, pa deljena baza nije
ušteda nego odloženi incident.

**Topologija:**

```
Railway  valiant-cat-psihointegritet
  ├ features          → diligent-serenity-features         · Postgres tokaido:23438
  ├ staging           → diligent-serenity-staging          · Postgres tokaido:38992
  ├ production        → diligent-serenity-production-1b3e  · Postgres tokaido:19415
  └ sanja-production  → diligent-serenity-sanja-production · Postgres shuttle:57781   ← novo

Vercel
  ├ psihointegritet  → psihointegritet.com · qa. · staging.
  └ sanja-neuer      → sanja-neuer.vercel.app                                        ← novo
```

**Dokaz izolacije** (isti zahtev na sva četiri backenda):

| Okruženje | `sanja-neuer` | `psihointegritet` |
| --------- | ------------- | ----------------- |
| sanja-production | **200** | 200 |
| production | **404** | 200 |
| staging | **404** | 200 |
| features | **404** | 200 |

Njena organizacija postoji samo u njenoj bazi — `f98958c8-5acd-4400-93c9-6f0e8c2a981a`, kreirana kroz
`provision_organization.py`, ne kroz migraciju.

**Dve zamke pri dupliranju Railway okruženja, obe pogođene:**

1. **Baza se ne kopira, ali kredencijali se kopiraju doslovno.** Novi Postgres je prazan (0 tabela,
   provereno pre bilo čega drugog), ali `DATABASE_URL` na backend servisu je ostao **literal sa
   lozinkom starog okruženja** → `password authentication failed for user "postgres"`, uz `/health`
   koji i dalje vraća 200. Isto za `REDIS_URL`. Razlog što uopšte jesu literali: aplikacija traži
   `postgresql+asyncpg://` šemu, a Railway referenca `${{Postgres.DATABASE_URL}}` daje `postgresql://`
   — pa se šema mora prepisati ručno i referenca se ne može koristiti.
2. **`DEFAULT_ORGANIZATION_SLUG` nije bio postavljen nigde**, ni u produkciji. `config.py:41` ga
   defaultuje na `psihointegritet`, pa bi njen backend tiho servisirao tuđi tenant. Sada je eksplicitan.

> **Seed migracija pravi `psihointegritet` u svakoj novoj bazi.** Njena baza sadrži tu organizaciju sa
> tri seedovana `therapist_matching_profiles` reda (Anja, Marija, Marjan), 0 korisnika, 0 sadržaja.
> **Inertno je** — njen deployment razrešava `sanja-neuer` i taj slug nikad ne dodiruje. Ostavljeno
> namerno: brisanje bi diralo pretpostavke migracionog lanca. Ali je isti obrazac koji je PDC-0A
> upravo napustio — tenant podaci u migraciji — samo primenjen na osnivačkog tenanta. Vredi izmestiti
> kad se bude diralo `20260722_0001`.

**Šta još nije gotovo:** njen Vercel projekat nema `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ni
`CLERK_SECRET_KEY`. Oba su na postojećem projektu tipa `sensitive` i **ne mogu se pročitati preko API-ja**,
pa ih unosi operator. Do tada build pada na `serverEnv` — isto kao D37, i to je ispravno ponašanje.

**Napomena za PDC-0E:** njen backend koristi `CLERK_ISSUER=https://clerk.psihointegritet.com`, dakle
Psihointegritetovu produkcijsku Clerk instancu. Radi, ali znači da tenanti dele identity provider —
što auth/domain audit treba da razreši namerno, a ne po inerciji.

##### Dopuna 2026-09-06 — Sanjin staging i njen nalog

Tenant nije jedno okruženje nego **dva**, isto kao Psihointegritet: test okruženje mora da postoji
pre nego što se bilo šta pokazuje, a njeno postoji na Vercel domenu jer njen domen još nije poznat.

```
Railway  valiant-cat-psihointegritet
  ├ features          · Postgres tokaido:23438
  ├ staging           · Postgres tokaido:38992
  ├ production        · Postgres tokaido:19415
  ├ sanja-staging     · Postgres maglev:38221     ← novo
  └ sanja-production  · Postgres shuttle:57781

Vercel  sanja-neuer
  ├ staging grana → sanja-neuer-staging.vercel.app   ← test domen, radi
  └ main    grana → sanja-neuer.vercel.app           ← čeka merge u main
```

| Backend | `sanja-neuer` | `psihointegritet` |
| ------- | ------------- | ----------------- |
| sanja-production | **200** | 200 |
| sanja-staging | **200** | 200 |
| production | **404** | 200 |
| staging | **404** | 200 |
| features | **404** | 200 |

**Sanjin nalog je provisionovan** u obe njene baze: `user_3IxNmblGJWzd5JBmbgL8uUnEksz`,
`sanjaneuer@gmail.com`, uloge `org_admin` + `therapist`. **Jedan identitet, dve uloge** — nema
odvojenog „org_therapist naloga".

`TherapistMatchingProfile` **nije** kreiran. Njen tenant nema katalog terapeuta ni „pronađi podršku"
tok, pa bi red postojao u tabeli koju njen proizvod ne čita. Uloga otvara workspace površine i bez
njega; profil se dodaje ako se ispostavi da treba.

> **Clerk instanca: development, ne produkcijska.** Sanja se registrovala na
> `inviting-escargot-8.clerk.accounts.dev`, a njeno okruženje je prvobitno bilo nameštено na
> `clerk.psihointegritet.com` — **njen nalog se tamo nikad ne bi autentifikovao**. Oba njena
> okruženja sada koriste dev instancu, uz `ENVIRONMENT=staging` da se `clerk_instance_for()` slaže.
> Ime `sanja-production` je zato trenutno šire od sadržaja; prelazak na produkcijsku Clerk instancu
> je deo njenog go-live-a, ne ovog slice-a.

**Zamka pri dupliranju se ponovila i drugi put** i biće svaki put: `DATABASE_URL` i `REDIS_URL` se
kopiraju kao literali sa lozinkom izvornog okruženja, dok nova baza jeste prazna. Provera pre svega
ostalog: `select count(*) from information_schema.tables where table_schema='public'` mora da vrati
**0**, pa tek onda migracije.

**Vercel deployment protection je bio uključen** na novom projektu (`ssoProtection:
all_except_custom_domains`) i vraćao `vercel.com/login` umesto stranice. Isključen — postojeći
projekat ga nema. Svaki nov tenant projekat kreće sa njim uključenim.

##### Sanjini nalozi po Clerk instanci — 2026-09-06

Ona ima **dva Clerk naloga**, po jedan po instanci, sa istom adresom. To nisu duplikati nego dva
odvojena identiteta: dev token se ne verifikuje protiv produkcijskog issuer-a i obrnuto.

| Okruženje | Clerk instanca | `external_auth_id` | Uloge |
| --------- | -------------- | ------------------ | ----- |
| sanja-staging | `inviting-escargot-8.clerk.accounts.dev` | `user_3IxNmblGJWzd5JBmbgL8uUnEksz` | `org_admin` · `therapist` — aktivne |
| sanja-production | `clerk.psihointegritet.com` | `user_3Iy2Vp5BNrUCDKyXB3ZxkNPYZHt` | `org_admin` · `therapist` — aktivne |

U produkcijskoj bazi njen **dev nalog je povučen** (`--revoke`, uloge `disabled`, red zadržan zbog
audita). Postojao je iz faze kad je imala samo dev nalog; tamo se ionako nikad ne bi autentifikovao,
a aktivan red za identitet koji ne može da se uloguje je tačno ona neurednost zbog koje roster modul
i postoji.

> **Roster je jednotenantski po konstrukciji.** `TeamMember` nema polje za organizaciju, a
> `provision_staff.py` ima `DEFAULT_ORGANIZATION = "psihointegritet"`. Sanja zato **nije** u rosteru
> — dodavanje vlasnika drugog tenanta u tabelu koja implicitno pripada Psihointegritetu spojilo bi
> dva tenanta na mestu koje postoji baš da ih razdvaja. Posledica: njeni nalozi se provizioniraju
> eksplicitnim `--external-id`, svaki put. Prihvatljivo za drugog tenanta; to je posao koji onboarding
> UI preuzima.

**Produkcijski Clerk ključevi za njen frontend još nisu postavljeni.** Njen Vercel projekat nosi dev
ključeve (`pk_test_`) na oba targeta. Za `main` target trebaju produkcijski, ali to još ništa ne
blokira: `main` nema `sanja-neuer` u registru, pa `sanja-neuer.vercel.app` ionako ne može da builduje
dok se `staging` ne spoji u `main`. Tada trebaju i ključevi.

##### Sanjin domen — `sanjaneuer.com`, dodat 2026-09-06

Registrovan na Namecheap-u (`dns1/dns2.registrar-servers.com`), zatečen na parking stranici:
apex `A 162.255.119.41`, `www` CNAME `parkingpage.namecheap.com`, https nije radio.

Domen je dodat na njen Vercel projekat kao **produkcijski**, uz `www` koji 308-uje na apex. DNS se
menja kod Namecheap-a jer nameserveri ostaju njihovi:

| Zapis | Host | Vrednost | Zamenjuje |
| ----- | ---- | -------- | --------- |
| `A` | `@` | `216.150.1.1` | `162.255.119.41` (parking) |
| `A` | `@` | `216.150.16.1` | — |
| `CNAME` | `www` | `83fbfd6bf5b5539c.vercel-dns-016.com.` | `parkingpage.namecheap.com.` |

Env matrica njenog projekta je uz to **razdvojena po targetima**, jer je ranije sve stajalo na
`production,preview` bez opsega:

| Scope | `NEXT_PUBLIC_APP_URL` | `NEXT_PUBLIC_API_URL` | `DEPLOYMENT_ENV` |
| ----- | --------------------- | --------------------- | ---------------- |
| production | `https://sanjaneuer.com` | sanja-production backend | `production` |
| preview — sve grane | `https://sanja-neuer-staging.vercel.app` | sanja-staging backend | `preview` |
| preview — grana `staging` | isto | isto | `staging` |

> **Popravljen defekt uočen pri ovom razdvajanju.** `DEPLOYMENT_ENV=production` je stajao na
> neopsegovanom `production,preview` unosu, pa bi **svaki preview sa grane koja nije `staging`**
> razrešavao `production` → `robotsPolicy()` bi vratio `Allow: /` i preview build bi bio indeksabilan,
> uz canonical na njen pravi domen. Ista klasa greške kao neopsegovane Preview promenljive na
> Psihointegritet projektu, samo obrnutog smera.

Backend `sanja-production` sada prima `CORS_ORIGINS=["https://sanjaneuer.com","https://www.sanjaneuer.com"]`.

**Šta domen još ne servira i zašto:** `main` nema `sanja-neuer` u registru, pa produkcijski build pada
na `resolveDeploymentOrganization` — namerno, fail-closed. Uz to su Clerk ključevi na njenom projektu
i dalje **development** (`pk_test_`) na oba targeta, a produkcijski deployment treba produkcijske.
Oba uslova padaju sa `staging → main` merge-om i unosom ta dva ključa.

##### Kako se lokalno gleda drugi tenant

**Nema URL-a koji menja tenanta** — to je C2(a), ne propust. Jedan dev server servisira jednu
organizaciju, isto kao jedan deployment. Next.js 16 uz to odbija drugi `next dev` iz istog
direktorijuma („Another next dev server is already running"), pa ni dva porta nisu izlaz bez
zasebnog worktree-a.

Prebacivanje traži **oba sloja**, jer frontend i backend imaju svoje kopije slug-a:

```
# 1. frontend/.env.local
DEFAULT_ORGANIZATION_SLUG=sanja-neuer      # pa restart dev servera

# 2. backend
DEFAULT_ORGANIZATION_SLUG=sanja-neuer docker compose --profile backend up -d backend

# nazad
docker compose --profile backend up -d backend
```

> **Neusklađenost je gora od bilo kog usklađenog stanja.** Ako frontend razrešava jednog tenanta a
> backend drugog, panel prikazuje jednu organizaciju dok API odgovara za drugu — a ništa ne puca.
> Zato `compose.yaml` sada čita `${DEFAULT_ORGANIZATION_SLUG:-psihointegritet}` umesto zakucane
> vrednosti: prebacivanje je jedna promenljiva na oba mesta, ne izmena fajla na jednom.

Lokalna baza drži **obe** organizacije i naloge oba tenanta, pa prebacivanje ne traži nikakav
provisioning — samo restart.

### PDC-0 stabilization pass — 2026-09-06

Sanjin onboarding je izložio tri kvara koji se **ne prijavljuju sami**. Nijedan nije uhvaćen greškom;
sva tri su nađena tek kad se gledalo nešto drugo.

| Kvar | Kako je izgledao | Zašto se nije video |
| ---- | ---------------- | ------------------- |
| `sanja-staging` backend je pratio `main` | njen staging frontend gađao backend koji izvršava produkcijski kod od 14. avgusta (`29ae344`) | deployment uspešan, health 200 |
| Nijedno Psiho okruženje nije imalo `DEFAULT_ORGANIZATION_SLUG` | oslanjala se na `config.py` fallback | vrednost je slučajno bila tačna |
| Kopirani `DATABASE_URL` pri dupliranju okruženja | `password authentication failed`, a `/health` 200 | health ne dodiruje bazu |

#### `DEFAULT_ORGANIZATION_SLUG` je C2(a) deployment binding, ne onboarding

Ovo razdvajanje je bilo zamućeno i vredi ga zapisati doslovno:

```
Organization data      → provision_organization()      "tenant postoji"
Deployment binding     → DEFAULT_ORGANIZATION_SLUG     "ovaj runtime služi tog tenanta"
Identity / staff       → provision_staff()             "ko sme da uđe"
Capabilities           → email, media, domen…          "šta tenant može"
```

`provision_organization()` ostaje **kanonski application servis** koji će Superadmin onboarding
kasnije zvati. Deployment binding nije njegov posao i obrnuto.

#### Ukinut implicitni founding-tenant fallback

Ranije su i frontend `serverEnvSchema` i backend `Settings` defaultovali na `psihointegritet`, uz
obrazloženje da odsustvo ima jedan tačan odgovor. To je važilo dok je postojao jedan tenant. Sa
drugim, odsustvo ne znači „osnivački tenant" nego „neko je zaboravio" — a default tada servira
jednog tenanta iz deployment-a drugog, bez ijedne greške.

| Okruženje | Bez `DEFAULT_ORGANIZATION_SLUG` |
| --------- | ------------------------------- |
| `development` | ✅ fallback na `psihointegritet` — laptop bez konfiguracije mora da radi |
| `staging` · `production` | ⛔ **odbija start / build**, uz poruku koja imenuje promenljivu i okruženje |
| bilo koje, sa nepoznatim slug-om | ⛔ i dalje fail-closed, nepromenjeno |

Frontend je centralizovan u `lib/tenant/deployment-slug.ts`; četiri mesta su čitala env sa sopstvenim
`?? "psihointegritet"` (`validation/env.ts`, `content/registry.ts`, `lib/tenant/organizations.ts`,
`next.config.ts`). `next.config.ts` je najbolje mesto za pad — greška stiže na `next build`, pre nego
što išta postoji da servira pogrešnog tenanta.

> **Šta nije dirano, namerno:** `public-metadata.ts` `DEFAULT_ORG` (Clerk metadata fallback, druga
> briga) i zakucani `ORGANIZATION_ID` u dva workspace ekrana. Oba su zaseban dug, ne ovaj.

#### `scripts/tenant_doctor.py`

PASS/WARN/FAIL provera deployment-a na kom se izvršava. **Nijedna tajna ne ulazi u izlaz** — proverava
se prisustvo i, gde je bezbedno, oblik.

Proverava: deployment binding je eksplicitan · ciljna baza (bez kredencijala) · organizacija postoji u
toj bazi · migration head se poklapa sa kodom · Clerk konfiguracija i da li instanca odgovara okruženju ·
CORS · email konfiguracija · locale rečnik · opciono da li upareni frontend odgovara.

Izlazni kod je 1 samo na FAIL, pa se sme staviti ispred deploy-a. **Nije** u diagnostics engine-u:
taj ugovor je građen od `organization_id`, `affected_count` i `sample_rows` i odgovara na pitanja o
**redovima**; ovo su pitanja o **konfiguraciji**.

Prvi pokretanje na Sanjinim bazama je odmah uhvatilo cross-tenant email
(`sender domain psihointegritet.com belongs to another tenant`) — to je PDC-0D.

### B2 — frontend konsolidacija · isporučeno 2026-09-07

Ovim je ciljna topologija iz `⚠ SUPERSEDED` bloka iznad **stvarna**, a ne planirana.
Jedan Vercel projekat, više tenant domena, statika netaknuta.

#### Površine su vezane za host, ne za deployment

Ovo je ispravka ranijeg čitanja plana. Nije „tenant domen služi sve što tenant ima":

| Host | Šta služi | Odakle organizacija |
| ---- | --------- | ------------------- |
| tenant domen | javni sajt + klijentski `/nalog` | hostname |
| platformski domen (`PLATFORM_HOST`) | vlasnički `/radni-prostor` + `/superadmin` | membership |
| host koji je oboje — danas `psihointegritet.com` | oboje, po površini | po površini |

Razlog je jedan: **klijent i vlasnik ne postavljaju isto pitanje.** Klijent koji dođe na
`sanjaneuer.com` je u njenom prostoru bez obzira ko je i da li je uopšte iko. Vlasnik koji radi u
`/radni-prostor` je u organizaciji u kojoj ima membership — a vlasnici oba tenanta dele isti host,
pa adresa to ne može da odgovori.

Zato su to **dva imenovana resolvera**, ne jedan helper koji gleda oba izvora i vraća šta nađe:
`resolveTenantSurfaceOrganization()` (header) i `resolveWorkspaceOrganization()` (membership).
`getActiveOrganizationSlug()` bira eksplicitno, po žigu koji je proxy postavio, jer je proxy jedini
sloj koji to već zna.

#### Sve ostalo je 404 — fail-closed lista

| Zahtev | Odgovor | Zašto |
| ------ | ------- | ----- |
| neregistrovan host | 404 | domen uperen u projekat ne sme da posluži bilo čiji sajt |
| direktan `/s/<slug>` | 404 | interno stablo bi se indeksiralo paralelno sa pravim domenom |
| `/radni-prostor` na tenant domenu | 404 | vlasnički prostor odgovara samo na platformskom hostu |
| `/nalog` na platformskom hostu bez tenanta | 404 | klijent nema membership, pa bi jedini preostali odgovor bio founding tenant |

404 pre auth gate-a, namerno: slanje na prijavu na domenu koji stranicu ionako neće poslužiti čita
se kao pokvaren login, ne kao pogrešna adresa.

#### `PLATFORM_HOST` je obavezan na deployed okruženjima

Isti oblik pravila kao `DEFAULT_ORGANIZATION_SLUG`, i iz istog razloga: na laptopu je odsustvo
udobnost, na deployment-u znači da je neko zaboravio. Cena zaborava je ovde specifična —
`/radni-prostor` i `/superadmin` ne odgovaraju **nigde**. Zato pada na build-u
(`MissingPlatformHostError`), gde se `serverEnv` učitava, a ne kod vlasnika koji ne može da uđe.

**Postavljeno na Vercel-u 2026-09-07** (projekat `psihointegritet`, tip `Config`, ne `Secret` —
hostname nije tajna i mora ostati čitljiv za proveru):

| Target | `PLATFORM_HOST` |
| ------ | --------------- |
| Production | `psihointegritet.com` |
| Preview | `qa.psihointegritet.com` |
| Preview (grana `staging`) | `staging.psihointegritet.com` |
| lokalno | prazno — `localhost` i `127.0.0.1` su uvek platforma |

Kasnije: `p-digital-center.com`, kao env izmena a ne refaktor.

#### Preview deployment nema custom domen

Ovo je propust iz prve verzije slice-a, uhvaćen na prvom staging build-u. Svaki Vercel preview
dobija `*.vercel.app` hostname koji nijedna tabela ne može da nabroji, pa bi fail-closed pravilo
oborilo **ceo** preview u 404 — a `features`/QA tok se oslanja baš na te linkove.

`resolveHostBinding()` zato ima tri odgovora, po specifičnosti:

1. registrovan domen → njegov tenant (i, ako jeste, platformski host)
2. deployment URL bez custom domena → **deployment-ov sopstveni tenant binding**, obe površine.
   Ovo je C2(a) koji preživljava tačno tamo gde je i dalje tačan, ne opšti fallback
3. **produkcija odbija sve ostalo** — tamo nema preview URL-a kao izgovora: domen je ili naš ili
   neko upire DNS u nas

Isto pravilo pokriva i `localhost`. On **jeste** platformski host, ali je i jedini host koji
developer ima, pa mora biti i tenant — inače `/nalog` odgovara 404 na sopstvenoj mašini, što se i
desilo.

Provereno uživo u oba oblika: `pdc-abc123.vercel.app` → 200 na staging-u, **404 na produkciji**.

#### Backend se bira po tenantu — **samo u produkciji**

`productionApiBaseUrl` živi u domain registry-ju pored tenanta, i ime nosi `production` jer prva
verzija nije, pa je lokalna prijava tiho zvala produkcijski API. Token iz dev Clerk instance je
odbijen, memberships su stigli prazni, i rezultat je bio prijavljen korisnik **bez ijednog panela**
— ni superadmin, ni tenant admin, ni klijentski — bez ijedne greške koja bi to objasnila.

**Produkcija je jedino okruženje koje služi više od jednog tenanta**, pa je jedino koje ne može da
imenuje svoj backend jednom promenljivom. Svako drugo je vezano za jedan tenant i jedan backend:

| Okruženje | Backend |
| --------- | ------- |
| production | registry (`productionApiBaseUrl`), po tenantu — **prelazno, vidi D-081** |
| staging | `diligent-serenity-staging` |
| preview / qa | `diligent-serenity-features` |
| lokalno | `localhost:8001` |

Ostatak pravila važi u produkciji.

> **`apiBaseUrl` ne pripada tenantu nego okruženju (D-081).** Ovaj oblik — `tenant →
> productionApiBaseUrl` — postoji zato što danas stvarno postoje dva production backend-a. Kad ih
> bude jedan, polje se briše iz registra, a registar ostaje na onome što jeste njegovo:
> `{organizationSlug, domains, publicUrl}`. Na tenant površini se zove **samo** njegov
backend — Sanjin kontekst ne sme da dodirne Psiho bazu. Na platformskoj površini se pitaju svi
registrovani backend-i i memberships se spajaju, jer svaka baza drži samo svoje; 401/403 tamo znači
„ovaj backend te ne poznaje", a ne grešku. Kolabira u jedan poziv kad deljeni backend stigne.

#### Prazan tenant je prazan, ne founding tenant

Sanjina naslovna renderuje njeno ime i „Sajt je u pripremi." Provereno na build-u: **0 pojava**
„Psihointegritet" u renderovanom markupu, uključujući `<title>`, canonical i Open Graph.
Root layout i dalje nosi default-e founding tenanta (njegovih ~26 stranica su još u `app/(public)`),
pa tenant stranica **prepisuje svako polje**, `title` kroz `absolute` — inače bi template iz root-a
potpisao njenu stranicu tuđim imenom.

Payload je zasebna priča i zaveden je kao **D40**: ceo `next-intl` katalog se serijalizuje u flight
payload svake stranice na svakom hostu, i to je zatečeno ponašanje next-intl 4.x, ne B2 regresija.

#### Statika je ostala statika

```
● /s/sanja-neuer     5m revalidate       ƒ samo Proxy (Middleware)
.next/server/app/s/sanja-neuer.html      prerenderovan na disku
x-nextjs-cache: HIT  ·  s-maxage=300     po tenantu, zasebni ključevi
```

#### Cutover izveden 2026-09-07

Zaseban `sanja-neuer` Vercel projekat je **obrisan**. `sanjaneuer.com` i `www.sanjaneuer.com` su
prebačeni na projekat `psihointegritet` (budući PDC). Ništa jedinstveno nije izgubljeno:
`DEFAULT_ORGANIZATION_SLUG` i njen `apiBaseUrl` žive u domain registry-ju, Clerk ključevi u samom
Clerk-u, a **njen Railway backend i baza nisu dirani**.

> `www` je morao prvi — apex se nije dao skinuti dok je na njega postojao redirect.

> ### ⚠ DNS se NE sme upreti pre merge-a u `main`
>
> Domen je vezan za **production** target projekta, a production gradi `main`, koji **nema** host
> routing (provereno: `domain-registry.ts` ne postoji na `origin/main`). Upereni DNS pre merge-a
> znači **Psihointegritet sajt na `sanjaneuer.com`** — tačno ono što D-080 zabranjuje.
>
> Redosled: `staging` → `main` → tek onda A zapis `sanjaneuer.com → 76.76.21.21` na Namecheap-u.
> Danas su nameserveri još uvek `dns1/dns2.registrar-servers.com`, pa domen ne razrešava — ništa
> nije živo i ništa nije pokvareno.

---

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
- [x] `sanja-neuer` organizacija postoji u bazi, kreirana kroz bootstrap seam (ne kroz migraciju)
- [x] nema demo Psihointegritet podataka
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
