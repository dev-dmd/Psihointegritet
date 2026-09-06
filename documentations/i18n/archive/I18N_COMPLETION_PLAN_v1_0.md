# SUPERSEDED — Jedan jezik, jedan ishod — plan dovršetka dvojezičnosti

> Istorijski zapis od 2026-08-12. D-077 Amandman 5 ostaje važeći, ali detaljni redosled,
> CMS field ugovor i D-079 zamenjuje aktivni plan
> `documentations/i18n/03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md` i zaključane odluke
> od 2026-08-13. Ovaj dokument ne koristiti za novi rad.

**Verzija:** 1.0 · **Datum:** 2026-08-12 · **Vlasnik:** Milan Dražić (CTO)
**Odnos prema drugim dokumentima:** nastavak `I18N_MULTITENANT_PLAN_v1_0.md` (temelj,
D-077 + ADR-026). Ovaj dokument pokriva **dovršetak** — sve što još nije prevedeno, i
odluku koja to čini izvodljivim (Amandman 5). Radna evidencija ostaje u TODO §5H-i18n.

## Povod

Sidebar je engleski, sadržaj stranice srpski. **Nije regresija** — to su dva odvojena
nedovršena posla koja se sada vide zajedno:

1. **Selektor fallback sadržaja je slep.** `content/therapists.ts`, `services.ts` i
   `homepage.ts` **jesu** podeljeni na `en/` i `sr-Latn/`, ali biraju kroz
   `pickContent()` → `deploymentContentLocale()` → **statički registar iz build-a**.
   Zato `/workspace/therapists` pokazuje „Osnivačica" iako engleski fajl postoji.
   Treći put isti obrazac: proxy (Amandman 3), layout (Amandman 4), sada sadržaj.
2. **Inline srpski još nije prešao u `messages/`** — „Kompanije", „Klijenti",
   „Terapeuti", tabovi, opisi ispod naslova.

Obim je veći nego što je do sada prijavljivano, jer **ratchet meri manje nego što
misli**: skenira samo `.tsx`, pa 933 pogotka u `.ts` fajlovima i 254 niske u backendu
nikad nisu bile brojane.

| Sloj | Mereno | Napomena |
| --- | --- | --- |
| `.tsx` (u ratchet-u) | **1243** | 165 unosa, bez drift-a |
| `.ts` (nevidljivo) | **933** | `compass/fallback-registry.ts` sam nosi 142 |
| backend | **254** | 33 fajla, bez ijednog alata |

Odluke vlasnika (2026-08-12):
- **fallback prati `ui_locale`** — fallback je *naš* placeholder, ne tenant-ov tekst;
- **po polju**: popunjeno polje se čita kako je uneto, prazno ostaje placeholder na
  izabranom jeziku; mešana stranica je prihvaćena i to je vlasnikov izbor;
- **greške → kôd** (frontend bira reči), **email i dijagnostika → backend katalog**;
- redosled **po vidljivosti**.

Ishod: izbor jezika renderuje taj jezik svuda, bez izuzetka i bez redeploy-a.

---

## Odluka koja pojednostavljuje sve — D-077 Amandman 5

`default_content_locale` **prestaje da bude ulaz u renderovanje**. Ostaje kolona koja
se pečati na *nov* tenant sadržaj, ništa više.

**`ui_locale` je jedini jezik renderovanja** — panel, javni sajt, `<html lang>`,
fallback sadržaj, sistemske poruke, email.

Time otpada dvostruki resolver koji je i napravio ovu klasu grešaka. Amandman 1
(„javnom površinom upravlja `default_content_locale`") se **povlači**. Amandman 4
(release gate) ostaje relevantan za budući CMS *sadržaj*, ne za jezik.

Ne dira SSG: `i18n/request.ts` već čita `getDeploymentOrganization()` kroz tagovani
keš i build ostaje 102/102 — menja se jedno polje, ne mehanizam.

Skalira na `es`/`de`/`ru` dodavanjem jednog foldera po jeziku, bez izmene kôda.

---

## Arhitektura — dva sloja, jedan prekidač

| Sloj | Šta drži | Gde | Tenant sme da pregazi |
| --- | --- | --- | --- |
| **Sadržaj** | naslovi, biografije, usluge, cene, FAQ, demo redovi panela | `content/<locale>/` | **Da**, po polju, kroz CMS |
| **Sistem** | dugmad, tabovi, statusi, greške, toast-ovi, email subject | `messages/<locale>/` | **Ne, nikad** |

Oba bira **isti** `ui_locale`. Granica je proverljiva i ima jedan razlog: tenant sme da
pregazi svoj sadržaj, a nikad reč „Sačuvaj". Spajanje bi značilo da CMS izmena može da
obriše dugme.

Jedna ulazna tačka po jeziku, kako je traženo:

```
src/content/en/index.ts        → sve stranice + fallback tekstovi, engleski (kanon)
src/content/sr-Latn/index.ts   → isto, srpski, Widen<>-anotiran prema kanonu
src/content/registry.ts        → { en, "sr-Latn" } + tip FallbackContent
```

Čitanje:

```ts
const c = await getFallbackContent();  // Server Component, ostaje SSG/ISR
const c = useFallbackContent();        // Client Component, čita locale iz provider-a
```

`getFallbackContent()` → `getDeploymentOrganization("cached").uiLocale` javno,
`"live"` na autentifikovanom (šav postoji od Amandmana 4).

**Identitet ostaje bez locale-a.** `findTherapist(slug)`, `findService(slug)`, `href`-ovi,
cene i id-jevi su bajt-identični u svim jezicima; finderi rade nad kanonskim skupom i
vraćaju lokalizovani zapis.

---

## Faze

Svaka faza je zaseban commit sa zelenom kapijom, redom po vidljivosti.

### Faza A — selektor progleda (~20 fajlova, odmah vidljivo)

- `content/locale.ts` → `registry.ts` + `server.ts` + `use-content.ts`; briše se
  `pickContent`/`deploymentContentLocale`
- `i18n/request.ts` i `lib/tenant/public-locale.ts` razrešavaju `ui_locale`
- `lib/content-governance/provider-resolver.ts:21` — hardkodovan `?locale=sr-Latn` u
  CMS fetch-u, ista greška, ide ovde
- 4 već podeljena modula prelaze na novi selektor
- **Ratchet dobija `.ts`** i anchor se koriguje sa 1311 na stvarnih 1243+933

Efekat: terapeuti, usluge, početna i demo redovi panela odmah prate prekidač.

### Faza B — preostalih 5 sadržajnih modula (~144 niski)

`company` (298 LOC) · `programs` (106) · `homepage-offers` (66) ·
`site-navigation` (57) · `site-settings` (33).

Postupak kao za `homepage`: obilazak linija do terminatora, **nikad regex** — regex je
jednom pojeo ceo fajl. Identitetska polja se diff-uju skriptom pre commita.

### Faza C — ostatak `features/workspace/data.ts` (~145 niski)

`appointmentRequests`, `waitlist`, `clients`, `unassignedRequests`, `companyPipeline`,
`companies`, `serviceCatalog`, `matchingPreferences`, `availabilityLayers`,
`seedLegalDocuments` → `content/<locale>/workspace-demo.ts`, iza `workspaceDemo(locale)`.

Pokriva „Novi upit→Ponuda poslata→Pilot program→Aktivna" iz prijave.

### Faza D — ekrani panela (637 niski)

`features/workspace/**` — `PageHeader` naslovi i opisi, tabovi, prazna stanja.
Namespace `screens.*` po ekranu. Uključuje 76 niski u `availability/` i
17 toast poziva od kojih je danas **jedan jedini** preveden.

### Faza E — javne stranice (259 niski)

`components/sections/**` (167) + `app/(public)/**` (92), namespace `public.*`.
Uz njih **11 `metadata` export-a sa srpskim** — SEO naslovi i opisi.

### Faza F — Kompas (796 niski, najveća površina)

`features/compass/` (226, od čega `fallback-registry.ts` sam 142),
`kompas-sadrzaj/` (242), `screen-kompas/` (139), `guidance/` (146),
`app/(public)/kompas/_components/` (41). Namespace `compass.*`.
`fallback-registry.ts` je *sadržaj*, ne sistem — ide u `content/<locale>/`.

### Faza G — Booking (~170 niski)

`features/booking/` (46+), `booking-widget/` (45), `availability/` je već u D,
`components/booking/TherapistBookingWidget.tsx`. Namespace `booking.*`.
Usput: isti toast tekst postoji u dva widgeta — spaja se u jedan ključ.

### Faza H — backend, email i greške (254 niske)

Po odluci, dva različita mehanizma:

**Greške → kôd.** `ApiProblem` prestaje da nosi srpsku rečenicu; dobija `params` polje
(danas ga nema, iako ga `messages/en/errors.ts` dokumentuje). Frontend bira reči iz
`messages/errors`, namespace koji **već postoji, preveden je, i nema nijednog korisnika**.
`taxonomy-error-copy.ts` (jedina postojeća mapa kôd→reči) se ugasi u korist kataloga.
6 API klijenata koji rade `detail ?? title` prelaze na kôd.

**Email i dijagnostika → backend katalog** po `organization.ui_locale`:
`infrastructure/email/{templates,layout,dispatcher}.py` (subject-i su danas duplirani
u dva fajla — spajaju se), `modules/diagnostics/collectors/booking.py` (16 niski),
i `app/api/company-inquiry/route.ts` na frontendu koji šalje sopstveni srpski email.
Backend dobija i svoj ratchet — danas ga nema.

**Nije obuhvaćeno:** push/VAPID nema kôda nigde (D-016: notifikacije su email-only,
O-22 otvoreno) — ništa se ne prevodi jer ništa ne postoji.

---

## Verifikacija

Kapija posle svake faze, sve mora biti zeleno:

```
npx tsc --noEmit
npx eslint src --max-warnings=0
npx prettier --check src
npm run architecture:check      # ratchet pada, nikad ne raste
npx vitest run
npm run build                   # mora ostati 102/102 statične stranice
npm run content:check           # 0 error u OBA jezika
```

Dokaz da prekidač radi — isti env, menja se samo baza:

```bash
curl -s https://qa.psihointegritet.com/ | grep -o 'lang="[^"]*"'
curl -s https://qa.psihointegritet.com/tim | grep -c "Osnivačica"   # en → 0
```

Nove brane, svaka vezana za grešku koja se stvarno desila:

1. **Ratchet skenira `.ts` i backend.** Danas ne skenira nijedno, pa je 933+254 niske
   bilo nevidljivo — brojka je izgledala bolje nego što stanje jeste.
2. **Nijedan modul ne sme da čita locale sadržaja iz registra** — statička provera, po
   uzoru na postojeću zabranu `headers()`/`cookies()` u `ssgSafeModules`.
3. **Parity test se proširuje sa `messages/` na `content/`** — isti ključevi u svim
   jezicima, identitetska polja bajt-identična, ICU placeholderi se poklapaju.
4. Postojeće ostaju: provider dobija eksplicitan `locale`, paneli koriste
   `resolveWorkspaceLocale()`, nijedna Server Component u panelu ne čita poruke.

---

## Dokumentacija

**Prvi korak, pre ijedne izmene kôda:** ovaj plan ulazi u repo kao zaseban dokument

```
documentations/I18N_COMPLETION_PLAN_v1_0.md
```

sa punim sadržajem — kontekst, izmerene brojke, Amandman 5, arhitektura dva sloja,
svih osam faza, kapija i brane. Iz **TODO.md §5H-i18n** ide link na njega, uz
ispravljene brojke (`.tsx` 1243 · `.ts` 933 · backend 254) i tabelu faza sa statusom,
da se stanje čita iz jednog mesta.

Uz Fazu A: **D-077 Amandman 5** (jedan locale renderovanja) i **ADR-026 §6.4** (zašto je
dvostruki resolver dao tri odvojena bug-a u tri dana).

Svaka faza pri zatvaranju ažurira svoj red u tabeli faza i brojke u TODO-u — isti ritam
kao do sada: gotova faza, dokumentacija u istom commit-u, pa sledeća.
