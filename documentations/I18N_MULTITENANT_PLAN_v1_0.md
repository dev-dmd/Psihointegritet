# I18N MULTI-TENANT PLAN v1.0

**Datum:** 2026-08-11 · **Vlasnik:** Milan Dražić (CTO) · **Status:** plan, isporuka po slice-ovima
**Uvodi:** D-077 (nova odluka) · ADR-026 (sledeći slobodan broj; ADR-020 ne postoji)
**Menja:** D-067, O-27, T9 · **Ne dira:** D-055, ADR-023 granicu izolacije

---

## 1. Kontekst — zašto sada

Platforma je danas jednojezična u kodu, a ne po nameri. `next-intl@4.13.2` stoji u
`package.json` sa **nula import-a**, `<html lang="sr-Latn">` je zakucan u root layout-u,
`SYSTEM_CONTENT_LOCALE = "sr-Latn"` je modulska konstanta koja **diže izuzetak za svaki
drugi jezik**, a oko 186 `.tsx` fajlova nosi srpski tekst inline u JSX-u.

To je bilo tačno dok je postojao jedan tenant na jednom tržištu. Više nije: tim je od
2026-08-10 američki (D-074/075/076), a CTO je zaključao da platforma odmah postane
višejezična multi-tenant aplikacija.

**Nova pravila (zaključano):**

```
PLATFORM_DEFAULT_LOCALE = "en"
SUPPORTED_UI_LOCALES    = ["en", "sr-Latn"]
```

Jezik pripada **organizaciji**, ne URL-u i ne browseru. Postojeći Psihointegritet
migrira na `sr-Latn` i **ne sme imati nijednu vizuelnu ni sadržajnu regresiju**. Nove
organizacije dobijaju `en`.

**Platforma nikada ne prevodi sadržaj koji je tenant napisao** — naziv centra, nazive
usluga, biografije, članke, Kompas sadržaje, SEO tekstove, pravna dokumenta, poruke
administratora, unos korisnika.

---

## 2. Odluke koje se menjaju

| Odluka | Šta je govorila | Šta se menja |
|---|---|---|
| **D-067** (2026-08-04) | i18n osnova se **zapisuje, ne implementira**; „bez lokalizovanih ruta (`/sr/`, `/en/`)" | Implementacija se odmrzava. Zabrana **prefiksa** ostaje na snazi — amandman uvodi lokalizovane **segmente**, ne prefikse. Ostatak ugovora (locale na organizaciji, `getPlatformMessages(locale)`, backend vraća `code + params`) se sprovodi doslovno. |
| **O-27** | „konstanta se ne dira, `next-intl` se ne uključuje, nema `default_locale` kolone i nema koda" | **Zatvara se.** Odgovori: (1) jezik pripada **organizaciji**; (2) strani tenant dobija **prazan** sistemski katalog i piše svoj sadržaj od nule; (3) brana ostaje, ali se prevezuje sa modulske konstante na `organization.default_content_locale`. |
| **T9** | srpski (ekavica) kao platformski jezik | Srpski ostaje jezik **jednog tenanta**, ne platforme. Poslednja rečenica T9 („model ne sme blokirati kasnije locale") postaje aktivna, ne hipotetička. |
| **§5G / TODO** | „strano tržište = nov tenant, ne višejezičan sajt" | Ostaje tačno i postaje **implementaciona osnova** (vidi §4.1). Nijedan tenant ne postaje višejezičan. |

**Šta se izričito NE menja:**

- `organization_id` ostaje jedina granica izolacije (D-055, ADR-023). `tenant_id` se ne uvodi.
- **`translation_group` se ne dodaje — nikad.** Jedan `default_content_locale` po
  organizaciji čini tu kolonu trajno nepotrebnom. Ovo upisati u D-077 da se pitanje ne otvara ponovo.
- Ekavica/ijekavica **nisu** poseban platformski UI locale. Obe su sadržaj unutar `sr-Latn`,
  tačno onako kako ih autor napiše. Nema automatske konverzije.

---

## 3. C2 — jedina odluka koja mi treba pre ROUTE-I18N-4

Amandman kaže da engleska i srpska organizacija vide različite putanje **na istom host-u**.
To ima dva čitanja:

- **(a) Jedan deployment = jedna organizacija.** Isti kod, različit `ORG_SLUG`, različit
  `ui_locale`. Ovo je doslovno §5G i gradivo je danas, bez ijednog dodira tenancy sloja.
- **(b) Prava host-shared multi-tenancy.** To je ADR-023 §6.3 domain resolver + RLS +
  odvojene DB role — a ADR-023 u zaglavlju **izričito zabranjuje** da se to radi usput.

### ✅ ZAKLJUČANO 2026-08-11 (CTO): implementira se **C2(a)**

```
Sada:     jedan deployment = jedna organizacija
Ne sada:  jedan host-shared deployment = više organizacija
```

Host-shared multi-tenancy pripada ADR-023 §6.3, RLS rollout-u i **zasebnom odobrenom
milestone-u**. Ne uvodi se usput kroz i18n ni kroz `proxy.ts`.

Prava odluka **nije** „SSG ili SSR za sve", nego **koji tip stranice sme da zavisi od
request host/header konteksta** — to je rendering ugovor u §3.1.

> Ranija verzija ovog odeljka tvrdila je da App Router dozvoljava samo jedan `<html>` po
> aplikaciji. **Netačno** — Next.js podržava više root layout-a preko route grupa
> (provereno u isporučenoj dokumentaciji `next@16.2.12`). Ta greška ne menja odluku, ali
> menja *razlog*: (b) ne pada zato što je nemoguće, nego zato što traži ADR-023 posao.

---

## 3.1 Rendering ugovor (zaključan)

| Površina | Rendering | Sme li da zavisi od request host/header |
|---|---|---|
| Početna i javne informativne stranice | **SSG** | **Ne** |
| CMS članci, usluge, profili, Kompas oblasti/teme | **ISR + on-demand revalidation** | **Ne** |
| Booking stranica | statički shell + dinamički slotovi | Ne za shell |
| Intake/Matching tok | statički shell + API | Ne za shell |
| Workspace / admin / klijentski panel | **SSR/dynamic** | **Da** |
| Booking i klijentski podaci | API/request-time | **Da** |

SEO ne traži SSR. SSR jeste indeksabilan, ali je za javni CMS sadržaj ISR bolji zbog brzine,
CDN keširanja i troška. **Cache Components se ne uvode** radi ovog zadatka — nisu projektna
odluka.

**Dva imenovana resolvera, namerno odvojena** (`lib/tenant/`), da jedan zajednički ne bi
povukao javnu površinu u najstroži režim pozivaoca:

```
PublicDeploymentLocaleResolver   → default_content_locale · bez request state-a · SSG/ISR-safe
ActiveWorkspaceLocaleResolver    → ui_locale · request-time · dynamic
```

**Dozvoljeni izvori javnog locale-a:** deployment organization config · build-time env ·
keširani organization config sa statički poznatim organization ID-jem · parametar
statičke/ISR rute · eksplicitni locale argument server formatteru.

**Nedozvoljeni:** `Host` header · `X-Organization-*` header · browser cookie kao autoritet
tenant identiteta · `Accept-Language` kao autoritet organization locale-a.

Sprovodi se **statički**, u `scripts/check-frontend-architecture.mjs`: lista `ssgSafeModules`
pada na bilo kakav `headers()` / `cookies()` / `draftMode()` / `next/headers` import.
Provera je statička a ne test zato što otkaz nije izuzetak nego **tiho** gubljenje statike —
jedini simptom je `○` koje postane `ƒ` u build izlazu koji na zelenom PR-u niko ne čita.

### Zašto javna površina prati `default_content_locale`, a ne `ui_locale`

Javni sajt je pretežno tenant-authored sadržaj, a publika mu je klijent tenanta, ne osoblje.
Konfiguracija zbog koje ovo ima veze je stvarna: organizacija čiji tim radi na engleskom a
objavljuje za srpske klijente postavlja `ui_locale = "en"`, `default_content_locale = "sr-Latn"`.
Renderovanje javnog chrome-a iz `ui_locale` tu bi dalo engleska dugmad oko srpskih članaka i
`<html lang>` koji protivreči tekstu ispod sebe.

Cela javna površina zato renderuje na **jednom** jeziku — jeziku sadržaja. `ui_locale`
upravlja površinama čija je publika osoblje: workspace, klijentski panel, sistemske
validacije, statusi i sistemski email.

> **Ovo precizira D-077.** Originalni brief je naveo „javni platformski UI" pod `ui_locale`.
> Pod C2(a) rendering ugovorom to bi proizvelo mešanu javnu stranicu, pa javnom površinom
> upravlja `default_content_locale`.

### Promena javnog locale-a je release operacija, ne toggle

`ui_locale` se menja odmah — workspace je dinamičan. `default_content_locale` menja javni
sadržaj, canonical URL-ove, sitemap, metadata, pravna dokumenta, Kompas taksonomiju i javne
sistemske poruke, pa ide kao kontrolisana operacija: sačuvati novi locale → proveriti da
postoji spreman sadržaj → proveriti pravna dokumenta → revalidirati javne rute → regenerisati
sitemap i metadata → tek onda aktivirati → zadržati redirecte gde se menja canonical.

Dozvoljeno je da to zahteva on-demand revalidation svih javnih ruta ili nov deployment.
**Ne uvoditi per-request javni locale samo da bi promena izgledala trenutna.**

### Granica ROUTE-I18N-4

**Sme:** workspace route registry · `/workspace/...` i `/radni-prostor/...` · `localizedPath` ·
reverse matching · aktivna navigacija · redirect posle promene `ui_locale` · authenticated
organization locale.

**Ne sme:** host-shared tenant resolution · RLS · hostname → organization DB lookup · request
header locale za javne stranice · public SEO route migracija · promena javnog canonical-a ·
više organizacija u istom public rendering cache-u.

---

## 4. Arhitektura

### 4.1 Razrešavanje locale-a

Dvoslojno, jer `getRequestConfig` radi za **svaki** request koji renderuje prevedenu
komponentu — uključujući root layout. Dodirne li `cookies()`, `headers()` ili Clerk
`auth()`, javne stranice gube statički rendering.

**Sloj 1 (ovaj milestone) — deployment JE verifikovana organizacija.**

```
ORG_SLUG (validiran zod-om na startup-u)
  → statički registar organizacija
  → { uiLocale, defaultContentLocale, timeZone }
  → nepoznat slug: THROW (nikad tihi fallback na en)
```

Redosled razrešavanja, doslovno po zahtevu:

```
1. verifikovana aktivna organizacija iz org context-a
2. organization.ui_locale
3. PLATFORM_DEFAULT_LOCALE = en
```

Korak 3 je **fail-closed**, ne fallback: nepoznat slug u produkciji diže grešku. Razlog je
u §6, rizik 3 — tihi fallback bi ceo živi srpski sajt prebacio na engleski.

Za autentikovani workspace: `Identity.memberships[0].organizationId` se **poredi** sa
deployment slug-om u staff layout guard-u. Jeftina invarijanta koja „dve organizacije dele
host" pretvara iz tihog bug-a u glasnu grešku.

**`Accept-Language` se ne koristi nigde. Nikad.** Ni na frontendu ni na backendu.

**Sloj 2 (samo ako C2 padne na (b)) — imenovan, ne izgrađen.** `HttpOnly` cookie koji piše
proxy iz verifikovanog Clerk claim-a. Nova datoteka `lib/tenant/locale-cookie.ts`.

### 4.2 next-intl — samo kao sloj za poruke i formate

**Routing sloj next-intl-a se ne koristi.** Provereno u instaliranom paketu: `defineRouting`
/ middleware / `createNavigation` uvek razrešavaju u internu putanju sa locale-om i traže
`app/[locale]` segment čak i uz `localePrefix: "never"`, a locale detektuju iz cookie-ja i
`Accept-Language`. Oba su zabranjena.

Lokalizacija ruta je **naša** (§4.4). Ovo upisati u ADR da sledeći čitalac ne „popravi"
stvar uvodeći `pathnames`.

- `next.config.ts`: `createNextIntlPlugin({ requestConfig: "./src/i18n/request.ts" })`.
  `nextConfig` ostaje netaknut (`reactCompiler`, `typedRoutes`, `images`).
- **Ne koristiti `experimental.createMessagesDeclaration`** — čita JSON fajlove, a D-067
  nalaže TS rečnike (`messages/<locale>/*.ts`). Augmentaciju pišemo ručno.
- `i18n/request.ts` vraća `locale`, `messages`, **`timeZone` eksplicitno** (server radi UTC,
  browser `Europe/Belgrade` — bez ovoga oko ponoći render puca), `formats`, `onError`,
  `getMessageFallback`. `requestLocale` parametar se ignoriše: nema `[locale]` segmenta pa
  je uvek `undefined`.
- `getPlatformMessages(locale)` je **tipizirani statički switch**, ne `import()` po
  promenljivoj — bundler zadržava analizu, tip ostaje tačan.

### 4.3 Tipska sigurnost poruka

Engleski je kanonski oblik, srpski je **anotiran**:

```ts
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

// sr-Latn/workspace.ts
export const workspace: Widen<EnWorkspace> = { … };
```

- nedostaje ključ → anotacija pada
- višak ključa → excess-property provera nad svežim literalom
- **srpske vrednosti se nikad ne vezuju za engleski literal tip**, jer `Widen<>` svaki list
  spušta na `string`

Dve posledice koje određuju raspored fajlova: excess-property provera radi samo nad *svežim*
literalom, pa **svaki srpski namespace fajl nosi svoju anotaciju**; i nijedan ključ ne sme
biti opcion — opcion ključ ruši garanciju pariteta.

`AppConfig` augmentacija cilja **literalni** engleski tip (ne `Widen<>`), jer next-intl 4.x
izvodi tipove ICU argumenata iz vrednosti poruke. Ovo je jedino mesto gde se dva tipa
namerno razlikuju i zaslužuje komentar u `.d.ts`.

**CI provera pariteta** radi samo ono što tipovi ne vide: ICU placeholder paritet, potpunost
plural kategorija (`sr`: one/few/many/other), neprevedene vrednosti identične engleskim,
i namespace bez para. Plus detektor novog inline srpskog literala, kao **shrinking baseline**
u već postojećem `check-frontend-architecture.mjs` — mehanizuje TODO §5G pravilo 2 umesto
oslanjanja na disciplinu u review-u.

### 4.4 Route registry

Lokalizuju se **segmenti**, ne prefiksi. Jedna fizička stranica služi oba jezika:

```
Engleska org:  /workspace/settings          (kanonska interna ruta)
Srpska org:    /radni-prostor/podesavanja   (proxy rewrite → /workspace/settings)
```

Browser zadržava srpsku putanju; Next izvršava istu stranicu. Nema duplirane komponente,
hook-a, query-ja, guard-a ni backend poziva.

Ključne tačke dizajna:

- **`typedRoutes: true` je aktivan** i `.next/types/link.d.ts` re-deklariše `Route` kao strogu
  uniju stvarnih ruta. Statičke interne putanje u registru su zato **compile-checked** —
  tipo u `/workspace/settings` obara build. Dinamičke šablone `Route` ne može da izrazi, pa
  dobijaju zaseban tip + test bijekcije sa fajl sistemom.
- Tačno **jedan `as Route` cast** ostaje u celom repou — unutar `localizedPath()`, sa
  komentarom koji imenuje proxy ugovor. Time nestaje ~12 postojećih cast-ova, a grep pravilo
  zabranjuje nove van `lib/routes/`.
- `matchPlatformPath()` gradi trie po locale-u, **statičko pre dinamičkog, najduže prvo**
  (`compass/content/new` mora da pobedi `compass/content/[entryId]` — ista kolizija postoji
  već danas). Normalizuje trailing slash pre poređenja.
- **Query nije deo poređenja.** `?tab=` se prenosi doslovno. Vrednosti tabova ostaju
  locale-neutralni engleski identifikatori; `dostupnost` (`radno-vreme|slotovi|izuzeci`) se
  preimenuje jer je to jedini srpski string koji bi engleska organizacija ikad videla u URL-u.
- `isActive` prestaje da poredi zakucane string-ove. Sve **četiri kopije** (`workspace/sidebar`,
  `workspace/bottom-nav`, `superadmin/sidebar`, `superadmin/bottom-nav`) zamenjuje
  `isRouteActive(pathname, routeId)`; zakucani root special-case postaje deklarativni
  `match: "exact"` flag.
- `panel-errors.tsx` prelazi sa `href` na `routeId` ključ. Modul je **in-memory i per-session**
  („A refresh clears it" — njegov sopstveni docstring), pa **nema perzistiranog ključa za
  migraciju**. Ovo je preimenovanje, ne migracija.

### 4.5 Proxy: rewrite + 308

Redosled unutar postojećeg `clerkMiddleware`:

```
0. zapamti externalPath i search PRE svega; normalizuj trailing slash
1. /api/* → next() odmah. API rute se NIKAD ne lokalizuju.
2. match = matchPlatformPath(normalized)
3. uiLocale = deployment konstanta (Sloj 1)
4. match.pathLocale !== uiLocale → 308 na localizedPath(...) + search
5. match && uiLocale !== "en" → rewrite na internalPath(...) + search
6. isProtectedPath(externalPath) → Clerk gate, redirect_url = externalPath (PRE rewrite-a)
7. return response
```

**Zaštita od petlje** počiva na jednoj invarijanti:
`matchPlatformPath(localizedPath(id, p, L))` mora tačno da vrati `{id, p, L}`. To je
najvažnija invarijanta u celom dizajnu i dobija property test. Rewrite (korak 5) ne ulazi
ponovo u proxy — Next ga izvršava jednom po dolaznom request-u.

**308 se ne kešira javno** (`Cache-Control: private, no-store`): cilj zavisi od organizacije,
a deljeni CDN koji zapamti srpski 308 za englesku organizaciju je cross-tenant artefakt.

`PROTECTED_ROUTE_PREFIXES` se **izvodi iz registra**, nikad ne piše ručno — ručna lista je
način da se doda locale i zaboravi gate, a to je nezaštićena ruta, ne kozmetika.

### 4.6 Backend

- **Kolone:** `organizations.ui_locale`, `organizations.default_content_locale`, obe
  `String(16) NOT NULL server_default 'en'` + CHECK constraint na podržane vrednosti.
  **Bez `time_zone` i `currency`** — traže svoju odluku i sudaraju se sa
  `settings.intake_business_timezone` i literalom `" RSD"`; Pravila §25 zabranjuju prazne apstrakcije.
- **Migracija** `20260811_0026_organization_locales`: nullable → backfill postojećeg reda na
  `sr-Latn` → `NOT NULL` + `server_default 'en'` → CHECK. Asimetrija je namerna i nevidljiva
  za `alembic check`: **jedini** što je hvata je pytest koji ubaci golu `Organization(...)` i
  tvrdi `ui_locale == "en"`.
- **`modules/organizations/` danas ima samo `models.py`** — nema router, service ni schemas.
  Dodaje se `GET /api/v1/organizations/me` i `PATCH /api/v1/organizations/me/locales`
  (`RequireStaff` + org-admin gate, po postojećem `_require_org_admin` idiomu).
- **Audit:** nova tabela `organization_audit_events`, oblikovana po `intake_audit_events`
  (jedina od četiri postojeće koja ima `organization_id` + tipizirani `event_type` + JSON),
  ali **bez** Intake FK-a i sa kolonom ispravno nazvanom `details` (postojeća je mapira na
  DB kolonu `metadata`). Uvodi se kao **prva tabela budućeg centralnog recorder-a**, uz
  `shared/domain/audit.py`, da sledeći modul ne doda šestu.
- **`SYSTEM_CONTENT_LOCALE`** se preimenuje u `SYSTEM_CATALOG_LOCALE` („jezik na kom je
  isporučeni sistemski katalog napisan" — i dalje `sr-Latn`, i to ostaje tačno). Brana ne
  nestaje: prima `organization_locale` i poredi sa njim.
  **Seedovani `uuid5` PK-ovi se ne diraju** — `"sr-Latn"` u derivacionom stringu je istorija,
  ne šema; migracija je zamrznuta, a CI grep to čuva.
- **Organizacija čiji `default_content_locale != SYSTEM_CATALOG_LOCALE` dobija prazan
  sistemski katalog.** To je O-27 pitanje 2 i doslovno §5G („strani tenant piše svoj sadržaj
  od nule"). Alternativa — prevesti ~30 sistemskih slugova i njihove rute — je nedeljama posla bez vlasnika.
- **`code + params`:** `ApiProblem` dobija `params`; srpski fallback `"Zahtev nije uspeo."`
  se briše (frontend vlasnik reči); četiri modula koja još šalju gole string-ove
  (content/CMS, privacy, guidance/intake, compass-auth) dobijaju `StrEnum` kataloge kodova.
  Migracija je **modul po modul**, nikad big-bang.
- **Email:** `notification_outbox` **ne treba locale kolonu** — već nosi `organization_id`.
  Deep linkovi emituju **kanonsku englesku internu putanju** i puštaju proxy 308 da srpskog
  korisnika odvede na njegov URL. Jedan izvor istine, jedan skok više, nula duplikacije.

---

## 4.7 Zaključana pravila imenovanja ruta (ROUTE-I18N-1)

1. **Route ID je jedini stabilni identitet funkcije.** English i Serbian pathname su
   prezentacione vrednosti — kao što je labela prezentacija message key-ja.
2. **Query parametri se ne prevode.** `?tab=` vrednosti su stabilni kodovi zajednički obama
   jezicima. Isto važi za slugove, UUID-jeve i interne kodove.
3. **API rute se ne prevode** i nisu u registru.
4. **Superadmin rute se ne prevode** — platformska je površina, ne tenant. Registrovane su
   ipak, jer to briše četvrtu kopiju `isActive`.
5. **Jedna Next.js stranica služi obe putanje.** Nikad druga komponenta, loader ni backend
   poziv po jeziku.
6. **Pogrešan locale pathname dobija 308**, uz očuvane parametre i query.
7. **Postojeće srpske rute ostaju kompatibilne.**
8. **Javne rute se sada samo evidentiraju** (`PUBLIC_ROUTES`); menjaju se u zasebnom SEO
   slice-u, jer promena javne putanje pomera canonical, sitemap, redirect istoriju i CMS slugove.
9. **Planirana ruta se ne kreira dok njen ekran ne postoji.** Žive u `PLANNED_ROUTES`, bez
   `internal` putanje — pa se `localizedPath` ne može pozvati sa njima i ne može se
   napraviti link na 404.
10. **Tab ne postaje stranica** bez potrebe za deep linkom, permission granicom ili
    zasebnim data loaderom.

### Odstupanja od tabele, sa razlogom

- **Tab vrednosti ostaju stabilni engleski kodovi**, po tvojoj preporuci a ne po srpskoj
  koloni tabele — inače `?tab=` postaje jedini prevedeni query parametar u sistemu.
  Postojeće srpske vrednosti (`radno-vreme|slotovi|izuzeci`, `javni|match|dostupnost`) su
  registrovane **onakve kakve su danas**, jer ROUTE-I18N-1 ne menja ponašanje;
  preimenovanje u `working-hours|slots|exceptions` ide u ROUTE-I18N-3, sa starim vrednostima
  kao alijasima jedno izdanje.
- **`workspace.schedule`** je jedina ruta čija se srpska putanja menja (`/dostupnost` →
  `/raspored`). Dok se direktorijum ne preimenuje u ROUTE-I18N-3, `internal` i dalje pokazuje
  na `/dostupnost`, a `ROUTE_ALIASES` beleži 308.
- **`workspace.intakeMatching`** dobija srpski segment `/usmeravanje`, ne transliterovani
  `intake-matching` — workspace URL vidi osoblje, a srpska organizacija ne treba da čita
  engleski proizvodni termin u sopstvenoj adresnoj traci.
- **`/[documentSlug]` nije platformska ruta.** Slug pripada sadržaju i locale-u organizacije,
  pa nema prevedenu putanju.

---

## 5. Redosled isporuke

Ovo **nije jedan milestone**. Realno ~2.5–3 meseca fokusiranog rada; I18N-5 je najveći deo.

| Slice | Opseg | „Zeleno" znači | Veličina |
|---|---|---|---|
| **I18N-1** | Locale rečnik + org šav + **D-077, zatvaranje O-27** | typecheck + lint + vitest; ništa se ne renderuje drugačije | 1 dan |
| **I18N-2** | next-intl wiring, dinamički `<html lang>` | `lang="sr-Latn"` nepromenjen za živi tenant; build zelen; javne stranice i dalje statične | 1 dan |
| **I18N-3** | Alati za paritet | CI pocrveni na obrisan ključ i na nov inline srpski literal | 0.5 dan |
| **ROUTE-I18N-1** | Registry, **nula promene ponašanja** (`paths.en === paths["sr-Latn"]`) | sve četiri `isActive` kopije obrisane, postojeći testovi prolaze **nepromenjeni** | 2 dana |
| **ROUTE-I18N-2** | Migracija poziva: 25 fajlova / 60 pojava → `localizedPath()`; dva `window.location.href` | nula `/radni-prostor` literala van registra, provereno grep pravilom | 3 dana |
| **ROUTE-I18N-3** | Fizičko premeštanje 18 fajlova u `app/(staff)/workspace/**` | build regeneriše `.next/types`; typecheck hvata svaki propušten literal | 1 dan, veliki radijus |
| **ROUTE-I18N-4** | Proxy rewrite + 308 · **blokiran C2 odgovorom** | novi e2e: 308 u oba smera, `/api/*` nikad ne redirektuje, round-trip property test | 2 dana |
| **ROUTE-I18N-5** | QA engleske organizacije | isti e2e sa obrnutim očekivanjima + zaštita od petlje | 2 dana |
| **I18N-4** | Copy workspace **shell**-a | nav renderuje **bajt-identičan** srpski | 1 nedelja |
| **I18N-5** | Copy workspace **ekrana**, jedan PR po porodici ekrana | po PR-u: srpski na ekranu bajt-identičan | **3–4 nedelje — dugi štap** |
| **I18N-6** | Ujednačavanje formatiranja (datumi, plural, lista, valuta, cache tagovi) | postojeći testovi zadržavaju očekivanja (oni su gramatički orakl); `TZ=UTC` suite zelen | 1 nedelja |
| **I18N-7** | Backend (migracija, organizations API, audit, katalog, kodovi grešaka, email) | `alembic check` čist, downgrade/upgrade round-trip, pytest zelen | 2 nedelje |
| **ROUTE-I18N-6** | Javne marketing rute | **van opsega** | kasnije |

**Zavisnosti:** ROUTE-I18N-1..3 idu paralelno sa I18N-2..3 (različiti fajlovi) ·
ROUTE-I18N-4 čeka C2 · I18N-5 čeka I18N-4 (treba mu provider) · I18N-7 je nezavisan od
frontenda i može odmah posle D-077.

---

## 6. Rizici i test koji svaki hvata

| # | Rizik | Test |
|---|---|---|
| **1** | **Nezaštićena ruta.** `PROTECTED_ROUTE_PREFIXES` izgubi `/radni-prostor` ili ne dobije `/workspace`. Jedini rizik ovde sa bezbednosnom posledicom. | Unit test: za **svaku** rutu sa `protected: true`, **svaka** locale putanja pokrivena nekim prefiksom. E2E generisan **iz registra**, ne iz ručne liste — postojeći `workspace-auth.spec.ts` zakucava 9 putanja. |
| **2** | **Redirect petlja.** `matchPlatformPath` i `localizedPath` se raziđu za jedan karakter. | Property test round-trip-a preko svih `routeId × locale × params`; e2e sa `maxRedirects: 5` koji traži finalni 200. |
| **3** | **Živi srpski tenant tiho pređe na engleski.** Nedostaje `ORG_SLUG`, fallback na `en`. Najverovatniji produkcijski incident u planu — otkaz je tih, a fallback je *po dizajnu* pogrešan za jedini tenant koji postoji. | Fail-closed: zod validacija na startup-u + **throw** na nepoznat slug. Vitest za throw, e2e za `<html lang="sr-Latn">` na `/`. |
| **4** | **Hydration mismatch na datumima.** Oba topbar-a grade „danas" u Client Component-i; server je UTC, browser `Europe/Belgrade`. | Vitest koji renderuje oba topbar-a sa UTC serverom i beogradskim klijentom; `TZ=UTC` dodat u CI. |
| **5** | **CMS dokument tiho zasenčen.** org_admin napravi dokument sa slug-om `workspace` → 404 zauvek, bez greške igde. Danas je jedina zaštita **klijentska**, a lista ne sadrži nijedan platformski root. | `reserved-custom-document-slugs` se **izvodi** iz registra; test da svaki platformski root segment postoji u listi; backend pytest da `slug="workspace"` vraća 422. |
| **6** | **`server_default` asimetrija.** `alembic check` ne vidi da nove org moraju biti `en`. | pytest koji ubaci golu `Organization(...)` i tvrdi `en`. |

---

## 7. Van opsega

Ne implementira se sada, ali model ništa od ovoga ne sme da blokira: automatski AI prevod ·
translation management servis · locale prefiksi u URL-u · više paralelnih javnih jezika
unutar jednog tenanta · per-user language override · automatsko prebacivanje po browseru ·
automatska ekavica/ijekavica · prevod pravnih dokumenata · prevod tenant sadržaja ·
preimenovanje javnih ruta · `translation_group` · nov tenant/company model samo radi jezika.

**Poznati ograničenja koja se svesno ne diraju sada:**

- `uq_legal_revision_published` je UNIQUE samo na `document_id` — jedna objavljena revizija
  po dokumentu bez obzira na locale. Pod „jedan content locale po organizaciji" **to je
  trenutno tačno**; mora se promeniti tek ako organizacija ikad dobije dva jezika sadržaja.
- `taxonomy_term_routes.locale` nema kolonski default a učestvuje u dva unique indeksa.
  U redu je dok servis uvek prosleđuje vrednost — proveriti kad servisni default postane `None`.
- `templates.py` zakucava `https://psihointegritet.com`. To je stvaran bug za drugog tenanta,
  nezavisno od i18n. Rešava se u I18N-7.
