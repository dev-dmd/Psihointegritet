# SUPERADMIN CONTROL CENTER — PLAN v1.0

> **Status:** implementirano (2026-07-20) — čeka ručni smoke i commit · **Grana:** `features` · **Faza:** R2 preview — rute, autorizacija i multi-tenant struktura
> **Dizajn (obavezujući, 1:1):** `documentations/Admin panel dizajn za Next.js-handoff/admin-panel-dizajn-za-next-js/project/design_handoff_paneli/` — `README.md` (spec, 15 sekcija) + `Psihointegritet Superadmin.dc.html` (prototip) + `globals.css`/`tailwind.config.ts` (tokeni)
> **Odluke:** D-026 (superadmin pristup, privremeni izvor rola) · O-17, O-18 (otvoreno za tim)

---

## 1. Cilj faze

Funkcionalan **Superadmin Control Center, pretežno read-only**. Cilj NIJE poslovna logika (ona stiže poslednja — pravi moduli su R2/R4/R6), već potvrda da su:

1. sve `/superadmin/*` rute pravilno postavljene i **zaštićene na serveru**;
2. autorizacija po roli stvarna (ne sakrivanje linkova);
3. buduća multi-tenant struktura (tenant, feature gates, planovi) pravilno modelovana.

**Minimalna verzija (sada):** 4 prava taba — Pregled, Tenanti (+ profil), Feature Gates, Dijagnostika. Pretplate, Audit Log i Podešavanja postoje kao rute/navigacija sa oznakom „U pripremi". Svi podaci hardkodovani (mock iz prototipa). Bez brisanja tenanta, bez impersonacije, bez menjanja podataka klijenata, bez „Repair" akcija.

## 2. Role i pristup (odluke korisnika, finalne)

| Korisnik | Email | Metadata | Pristup |
|---|---|---|---|
| Milan Dražić | `milan.drazic@dmdevelon.website` | `{ "superadmin": true }` | `/superadmin/*` (jedini) |
| Milan Dražić (postojeći dev login) | `drazic.milan@gmail.com` | `{ "superadmin": true }` — ✅ dodeljeno 2026-07-20 | `/superadmin/*` (dok se dmdevelon nalog ne kreira) |
| Anja Stamenković | `anja.stamenkovic@psihointegritet.com` | `{ "roles": ["org_admin","therapist"], "org": "psihointegritet" }` | `/radni-prostor` (budući Control Center) |
| Marija Stamenković | `marija.stamenkovic@psihointegritet.com` | isto | isto |
| Marjan Janković | `marjan.jankovic@psihointegritet.com` | isto | isto |
| Klijenti | — | bez rola | `/nalog` |

- Superadmin je **globalni flag**, ne membership rola — vlasnici tenanta ga nikad ne vide (README §10).
- Sva tri člana tima nose **obe** role (`org_admin` + `therapist`) — model već podržava više rola po korisniku (`identity.ts`).
- Ne-superadmin na `/superadmin/*` → redirect: staff → `/radni-prostor`, ostali → `/nalog`, neulogovan → `/prijava`.

## 3. Privremeni izvor rola — Clerk publicMetadata (dokumentovana devijacija)

ARCHITECTURAL_RULES §10.2/§10.3: autorizacija živi u internom Postgres-u i stiže kroz backend `GET /api/v1/me` (M2.1). Taj backend još ne postoji, pa ova faza koristi **Clerk `publicMetadata`** kao privremeni izvor — **samo role, nikad domenski podaci**. Isti stil svesnog savijanja pravila kao D-024 (Resend iz Route Handlera).

**Šav za zamenu:** ceo kod zavisi isključivo od `src/lib/auth/identity-server.ts` (`getServerIdentity()`). Kada M2.1 stigne, menja se jedna linija (re-export Clerk adaptera → backend `/me` adapter); guards, layout, stranice i testovi ostaju netaknuti.

**Mehanizam čitanja:** `auth()` + `currentUser()` iz `@clerk/nextjs/server` (dedupe po requestu — layout + stranica = 1 API poziv). Namerno NE session-token claims (traži JWT template konfiguraciju po Clerk instanci + staleness do refresh-a) i NE env allowlist (drugi izvor istine). `publicMetadata` je `Record<string, unknown>` — uvek kroz zod parser (`parseRoleMetadata`), malformiran sadržaj degradira na „bez rola", nikad na povišen pristup.

**Bootstrap:**
- Skripta: `frontend/scripts/set-clerk-roles.mjs` (`npm run roles:assign`, `--dry-run` opcija). Idempotentna (PATCH metadata je shallow-merge); nalog koji ne postoji → `SKIP` log (timski nalozi možda još nisu kreirani — O-17).
- Ručna alternativa: Clerk Dashboard → Users → korisnik → Metadata → Public.
- Pri launchu obavezno pokrenuti i na **produkcionoj** Clerk instanci (O-18).

## 4. Fajlovi — auth sloj (korak 1, ✅ implementirano)

| Fajl | Radnja | Sadržaj |
|---|---|---|
| `src/lib/auth/clerk/public-metadata.ts` | novo | zod parser `parseRoleMetadata(unknown)` → `{superadmin, roles, org}`; deli ga server adapter i klijent hook |
| `src/lib/auth/clerk/server-identity.ts` | novo (`server-only`) | `getClerkServerIdentity()` — `auth()` + `currentUser()` + parser → `Identity` |
| `src/lib/auth/identity-server.ts` | novo (`server-only`) | **šav**: re-export kao `getServerIdentity`; TODO(identity-backend) za M2.1 |
| `src/lib/auth/guards.ts` | novo (`server-only`) | `requireSuperadmin()` / `requireStaff()` / `requireSuperadminApi()` (za buduće endpoint-e: identity ili null → 404) |
| `src/lib/auth/routes.ts` | izmena | + `WORKSPACE_URL`, `SUPERADMIN_URL` |
| `src/lib/auth/clerk/use-identity.ts` | izmena | stub (`isSuperadmin: false`) → čitanje metadata kroz isti parser; IdentityCard pokazuje prave role |
| `src/app/(staff)/radni-prostor/page.tsx` | izmena | `await requireStaff()` — **D7 fix** |
| `frontend/scripts/set-clerk-roles.mjs` | novo | dodela metadata za 4 naloga (tabela §2) |
| `src/proxy.ts` | **ne dira se** | ostaje authentication-only sloj (nikad autorizacija) |

Testovi (vitest, ✅ 20/20): `public-metadata.test.ts` (oblici, garbage → fallback), `server-identity.test.ts` (mock Clerk servera), `guards.test.ts` (redirect matrica).

## 5. Rute — `(superadmin)` grupa (korak 2)

Nova top-level route grupa sa **posebnim layoutom** (bez javnog chrome-a):

```
src/app/(superadmin)/superadmin/
├── layout.tsx                    # await requireSuperadmin() + shell (Sidebar/Topbar/BottomNav) + GatesProvider
│                                 # metadata: { title: {default/template "· Superadmin"}, robots: noindex }
├── page.tsx                      # Pregled platforme
├── tenants/page.tsx              # Tenanti
├── tenants/[tenantId]/page.tsx   # Profil tenanta; tenantId !== "psihointegritet" → notFound()
├── features/page.tsx             # Feature Gates
├── diagnostics/page.tsx          # Dijagnostika
├── billing/page.tsx              # U pripremi (Pretplate i potrošnja)
├── audit-log/page.tsx            # U pripremi (Audit Log)
└── settings/page.tsx             # U pripremi (Podešavanja)
```

**Bezbednosno pravilo (obavezno):** SVAKA stranica počinje sa `await requireSuperadmin()` — layout guard nije dovoljan jer se layout ne re-izvršava na soft navigaciji. Sakrivanje linkova nikad nije autorizacija. Svaki budući `/api/superadmin/*` route handler koristi `requireSuperadminApi()` (nije superadmin → 404, ruta nevidljiva). Stari `src/app/(staff)/superadmin/page.tsx` se briše u istom koraku (duplikat rute = build fail).

## 6. Navigacija i shell (korak 4 — 1:1 iz prototipa)

**Desktop sidebar** (fiksni 264px, coffee `#3A2E28`): logo „Psihointegritet" + warm tačka; pill „Superadmin" (shield, warm); nav: **Pregled · Tenanti (badge 1) · Feature Gates · Dijagnostika · Pretplate (Uskoro)**; caption „Sistem": **Audit Log (Uskoro) · Podešavanja (Uskoro)**; footer: SA čip „Platform tim" + mono `produkcija · eu-central` + odjava.
**Topbar** (sticky, blur `rgba(250,248,243,0.88)`): datum (`sr-Latn-RS`), zeleni pill „Svi sistemi operativni", mono `v0.4.2 · produkcija`.
**Mobilni (<1024px):** sidebar skriven, bottom nav 4 stavke: **Pregled · Tenanti · Dijagnostika · Gates**; sadržaj max-width 1160px.

## 7. Ekrani (korak 5 — verbatim sadržaj iz prototipa)

1. **Pregled platforme** (`/superadmin`): 8 stat kartica (Aktivni tenanti 1 · Aktivni korisnici 24 · Terapeuti 3 · Klijenti 20 · Termini danas 5 · Zahteva čeka 3 · Neuspele email poruke 2 · Sistemsko upozorenje 1) · „Platform Health" lista (Frontend/Backend API/PostgreSQL/Redis/QStash/Resend/Clerk; Resend = „Degradiran · retry aktivan") · „Poslednja aktivnost" feed (kreiran tenant, dodat terapeut, uključen gate, neuspešan email, deployment).
2. **Tenanti** (`/superadmin/tenants`): jedan tenant row-card — Psihointegritet / slug `psihointegritet` / psihointegritet.com / vlasnik Anja Stamenković / status Aktivan / Plan „Partner / Development" / Trial do 30. sep 2026. / 3 terapeuta · 20 klijenata / 214 termina / kreiran 12. maj 2026. / poslednja aktivnost — + dashed „Novi tenant" placeholder.
3. **Profil tenanta** (`/superadmin/tenants/psihointegritet`): header (avatar, ime, status, domen, „Otvori tenant control panel →" ka `/radni-prostor`); tabovi **Pregled / Funkcionalnosti / Potrošnja** + disabled „Korisnici · uskoro" i „Pretplata · uskoro"; Osnovni podaci (KV), Aktivni engine-i (6 chipova), Interna beleška — vidi samo superadmin, Potrošnja (8 read-only pločica: 1.240 AI zahteva, 312 emailova, 1,2 GB storage, 24 korisnika, 214 termina, 18,4k API poziva, 1.032 background jobs, 0 neuspelih).
4. **Feature Gates** (`/superadmin/features`): registar 9 gate-ova (Intake & Matching ✅ Partner · Booking Engine ✅ Core · Company Programs ✅ Partner · Research Drawer ✅ Core · Research Analytics ✅ Partner (override „Ručno uključen · 1. jul") · Marketing Engine 🔒 U pripremi Growth · Blog Engine 🔒 U pripremi Growth · Loyalty Engine ⛔ Growth · White-label domen ✅ Partner (override psihointegritet.com)). **Demo promena:** toggle → ConfirmModal („Potvrda promene", staro → novo, „Razlog promene — obavezno", amber napomena o Audit Logu) → upis u „Poslednja aktivnost" (ko/kada/staro→novo/razlog). **In-memory** — refresh resetuje; pravi Audit Log stiže sa backendom.
5. **Dijagnostika** (`/superadmin/diagnostics`): akcije „Pokreni proveru" (spinner „Provera u toku…"), „Kopiraj tehničke podatke" (clipboard + toast), „Označi kao pregledano" (toast); kartice Servisi / „Aplikacija — poslednja 24h" (poslednji booking 09:41 uspešan, poslednji email 08:12 neuspešan-retry, 2 neuspela emaila, API greške 3 (0,2%), spore operacije 1, neobrađeni Intake zahtevi 2) / „Tenant health — Psihointegritet" (domen ✓, SSL ✓, backend 124 ms ✓, DKIM ⚠, gates 6/9, poslovi ✓) + amber „Nalaz". Automatske popravke — kasnije.
6. **U pripremi** (`/superadmin/billing`, `/audit-log`, `/settings`): dashed kartice sa opisom šta stiže.

## 8. Tehnički detalji

- **Tokeni** (dodaju se u `src/app/globals.css` `@theme`, namespaced — javni sajt netaknut): `--color-panel-canvas #faf8f3`, `--color-line(-strong)`, `--color-ink-70/55/45`, badge parovi ok/wait/soft/amber/neutral/danger/dark, radiusi tile 14 / stat 18 / card 20 / panel 22 / modal 24, `--shadow-panel-card/modal`, `--container-panel 1160px`. Fontovi: postojeći `--font-newsreader` + `--font-instrument-sans` (handoff pominje `--font-instrument` — razlika u imenu je poznata).
- **Deljene panel primitive** `src/components/panel/` (koristiće ih i budući Control Center i Klijent panel): StatusBadge (dot + tekst, nikad samo boja), StatCard, TabPills, KV, Toggle (`role="switch"`), ConfirmModal (Headless UI Dialog), EmptyDashedCard.
- **Superadmin komponente** `src/features/superadmin/`: `types.ts` (Tenant, FeatureGate `on|off|coming_soon` + minPlan `Core|Partner|Growth`, AuditEntry, …), `data.ts` (svi mock podaci), `gates-context.tsx` (useReducer; provider u layoutu → Pregled feed vidi promene), `components/*` (sidebar, topbar, bottom-nav, health-list, activity-feed, gates-table, tenant-row-card, tenant-profile-tabs, diagnostics-actions, …).
- **Health je 100% statičan u v1** — vrednosti iz prototipa; „Pokreni proveru" je spinner demo.

## 9. Testovi

- **Vitest**: auth sloj (✅ 20/20) + gates-context (toggle → activity zapis; `coming_soon` zaključan) + confirm-modal (dugme disabled bez razloga) + status-badge (tekst po varijanti). ASCII naslovi testova (srpski navodnici lome parser).
- **Playwright** `tests/e2e/superadmin-auth.spec.ts` (bez Clerk secrets): svih 9 zaštićenih putanja → 3xx ka `/prijava` (`request.get` sa `maxRedirects: 0`); + browser test da `/superadmin` završava na Clerk formi. Ulogovani flow se testira ručno (Milan / nalog bez metadata / odjavljen).
- **Gates**: typecheck · lint · format · vitest · build · e2e (workers 2) — svi zeleni pre završetka.

## 10. Šta se NE radi sada

Brisanje tenanta · impersonation · menjanje podataka klijenata · pravi Audit Log · prava naplata/pretplate · automatske popravke u dijagnostici · pravi health kolektori · Control Center UI (`/radni-prostor` ostaje guarded skeleton) · Klijent panel UI · backend (M2.1/M2.7 kasnije).

## 11. Follow-up (posle ove faze)

1. **Control Center** (`/radni-prostor`) po `Psihointegritet Control Center.dc.html` — sledeća faza.
2. **Klijent panel** po `Psihointegritet Klijent Panel.dc.html`.
3. Backend M2.1: `GET /api/v1/me` → zamena šava u `identity-server.ts`; brisanje metadata čitanja; Clerk webhook sync.
4. Backend M2.7: pravi diagnostic kolektori (`GET /superadmin/diagnostics`, `POST /superadmin/diagnostics/run`) → zamena mock health-a.
5. `@clerk/testing` (testing tokens) za ulogovane e2e tokove.
6. Opciona optimizacija: session token claims umesto `currentUser()` poziva.
7. R6: pravi Feature Gates registar, pretplate, potrošnja, Audit Log.

## 11a. Bug nađen tokom ručnog smoke-a (2026-07-20) — `redirect_url` nedostajao u `proxy.ts`

**Simptom:** login sa superadmin nalogom (`drazic.milan@gmail.com`, metadata potvrđena tačna preko Clerk API-ja) je uvek završavao na `/nalog`, nikad na `/superadmin`.

**Uzrok:** `src/proxy.ts` je gradio `unauthenticatedUrl` kao goli `/prijava`, bez parametra koji Clerk čita da zna gde da vrati korisnika posle logina. Clerk-ov `<SignIn/>` bez tog parametra pada na `signInFallbackRedirectUrl` = `/nalog` (postavljeno u `auth-provider.tsx`, postojalo pre ove faze) — **bez obzira na ulogu**, jer se `requireSuperadmin()` guard nikad ne stigne ni pozvati (korisnik je već preusmeren pre nego što dođe do `/superadmin`).

**Ovo nije bio bug u proveri role** — `parseRoleMetadata`, `getClerkServerIdentity`, `requireSuperadmin` su ispravno vraćali `isSuperadmin: true`. Problem je bio korak pre toga: pogrešna URL koju je Clerk video pri redirektu na sign-in. Pogađao je **sve** zaštićene rute (`/nalog`, `/radni-prostor`, `/superadmin`), ne samo superadmin.

**Fix:** `proxy.ts` sada dodaje `?redirect_url=<originalna-putanja>` na `/prijava` URL pre `auth.protect()`. Clerk taj parametar prepoznaje (`@clerk/shared` router — `PRESERVED_QUERYSTRING_PARAMS`) i posle uspešnog logina vraća korisnika tačno tamo odakle je došao; `requireSuperadmin()` tek onda odlučuje da li sme dalje.

**Testovi:** `superadmin-auth.spec.ts` prošireni — svaka od 9 ruta proverava da `location` header sadrži i `/prijava` i tačan `redirect_url=<enkodovana-putanja>`; browser test proverava isto kroz `page.url()`.

## 11b. Redirect posle direktnog logina po roli (2026-07-20)

Popravka u §11a rešava slučaj kad korisnik pokuša da otvori zaštićenu rutu dok je odjavljen. Ne rešava drugi slučaj: **direktan login** (npr. sa `/prijava` bez prethodnog pokušaja pristupa nekoj ruti) — tu nema `redirect_url`, pa Clerk uvek koristi statičan `signInFallbackRedirectUrl` = `/nalog`, bez obzira na ulogu.

**Rešenje:** `/nalog` postaje pametna landing stranica. Nova funkcija `resolveLandingRoute(identity)` u `guards.ts` je jedini izvor mapiranja:

| Rola | Odredište |
|---|---|
| `isSuperadmin: true` | `/superadmin` (globalni flag, pobeđuje bilo koju membership rolu) |
| `org_admin` i/ili `therapist`, bilo koja kombinacija | `/radni-prostor` |
| `client` ili bez rola | `/nalog` (ostaje) |

`/nalog/page.tsx` na svakom otvaranju poziva `getServerIdentity()` i, ako `resolveLandingRoute()` vrati nešto drugo osim `/nalog`, radi `redirect()` pre renderovanja. Direktni pristup zaštićenoj ruti i dalje ide preko §11a fix-a (`redirect_url`) i ne prolazi kroz `/nalog` uopšte.

**Namerno nema posebne rute po kombinaciji uloga** (npr. „admin i terapeut" nasuprot „samo terapeut") — app model ima **jedan** radni prostor (`/radni-prostor`, budući Control Center); unutra će nav/sekcije zavisiti od toga koje role korisnik nosi (dizajn handoff §7 — segmentovani „Vlasnik/Terapeut" pill unutar istog panela, gde „Vlasnik" u handoff-u odgovara `org_admin` u kodu). „Njegovi klijenti" (spisak klijenata konkretnog terapeuta) je buduća stranica unutar tog panela, ne zaseban top-level redirect. „Tenant poseban admin" nema zasebnu rutu — to je i dalje `org_admin`, isto odredište `/radni-prostor` (link „Otvori tenant control panel" sa profila tenanta već vodi tamo).

**Testovi:** `guards.test.ts` — `resolveLandingRoute` za sve kombinacije (superadmin+staff, admin samo, terapeut samo, admin+terapeut, klijent, bez rola). Ulogovani flow i dalje ručni smoke (nema Clerk testing tokena).

## 12. Redosled koraka (repo zelen posle svakog)

| # | Korak | Status |
|---|---|---|
| 1 | Auth šav + guardovi + testovi + roles skripta | ✅ 2026-07-20 |
| 2 | `(superadmin)` grupa: layout guard + 8 stranica + e2e auth spec + brisanje starog page.tsx | ✅ 2026-07-20 |
| 3 | Tokeni + panel primitive + testovi | ✅ 2026-07-20 |
| 4 | Shell 1:1 (Sidebar/Topbar/BottomNav) + vizuelna provera | ✅ 2026-07-20 (vizuelno: ručni smoke, rute su auth-gated) |
| 5 | Ekrani (data.ts, gates-context, svi tabovi) | ✅ 2026-07-20 |
| 6 | Dokumentacija (D-026, TODO, O-17/O-18) + svi gate-ovi + smoke | ✅ 2026-07-20 (gates zeleni; smoke na Milanovom nalogu) |
