# ADR-026 — Jezik organizacije, rendering ugovor i registar ruta

**Status:** Accepted · **Datum:** 2026-08-11 · **Odluke:** D-077 (+ Amandmani 1 i 2)
**Menja:** D-067, O-27, T9 · **Ne dira:** D-055, ADR-023 granicu izolacije
**Plan isporuke:** `documentations/I18N_MULTITENANT_PLAN_v1_0.md`

---

## 1. Kontekst

Platforma je bila jednojezična u kodu, a ne po nameri: `next-intl` instaliran sa nula
import-a, `<html lang="sr-Latn">` zakucan, `SYSTEM_CONTENT_LOCALE` konstanta koja diže
izuzetak za svaki drugi jezik, 181 `.tsx` fajl sa srpskim inline. Tim je od D-074/075/076
američki, pa novo tržište mora biti konfiguracija, ne fork.

## 2. Odluka

**Jezik pripada organizaciji**, kroz dve odvojene kolone:

```
organization.ui_locale              → sistemski UI, validacije, statusi, email
organization.default_content_locale → locale koji se pečati na nov sadržaj
```

`PLATFORM_DEFAULT_LOCALE = "en"`, `SUPPORTED_UI_LOCALES = ["en", "sr-Latn"]`. Razrešavanje
ide isključivo iz verifikovane organizacije; **`Accept-Language` se ne koristi nigde**.

### 2.1 Ko bira jezik (Amandman 2)

| Uloga | Bira |
|---|---|
| superadmin | **svoj** jezik — lična platformska preferenca |
| org_admin | jezik organizacije i njenog javnog sajta |
| terapeut | ne bira, prati organizaciju |
| klijent | ne bira |

Superadmin uz to **sme da podesi jezik bilo koje organizacije** — kao ispravka kad
org_admin ne zna kako ili je pogrešio. Operatorska intervencija, ne svakodnevna radnja:
isti ugovor uz eksplicitan `organization_id`, gate na `is_superadmin`, i audit event koji
beleži da je promenu izvršio **operator, ne organizacija**. Bez toga org_admin vidi da mu
se jezik promenio i nema trag ko je to uradio.

Superadminov slučaj je **izuzetak od zabrane per-user override-a**, ne njeno ukidanje:
superadmin nije tenant površina, rute su mu locale-neutralne, i radi preko više
organizacija — nema „svoju" od koje bi nasledio jezik. Njegova preferenca **nikad ne curi
u tenant površinu**: kad gleda tuđi workspace, vidi `ui_locale` te organizacije.

## 3. Rendering ugovor (Amandman 1)

Prava odluka nije „SSG ili SSR za sve", nego **koji tip stranice sme da zavisi od request
host/header konteksta**.

| Površina | Rendering | Sme zavisiti od request-a |
|---|---|---|
| Javne informativne stranice | SSG | **Ne** |
| CMS sadržaj, Kompas taksonomija | ISR + on-demand revalidation | **Ne** |
| Booking / Intake | statički shell + dinamički deo | Ne za shell |
| Workspace, klijentski panel, superadmin | SSR/dynamic | Da |

**Dva imenovana resolvera, namerno odvojena** (`lib/tenant/`), da jedan zajednički ne bi
povukao javnu površinu u režim najstrožeg pozivaoca:

```
PublicDeploymentLocaleResolver → default_content_locale · bez request state-a
ActiveWorkspaceLocaleResolver  → ui_locale · request-time
```

Javna površina prati **`default_content_locale`**, ne `ui_locale`: organizacija čiji tim
radi na engleskom a objavljuje za srpske klijente inače dobija englesku dugmad oko srpskih
članaka i `<html lang>` koji protivreči tekstu.

**Sprovedeno statički**, u `scripts/check-frontend-architecture.mjs`: lista `ssgSafeModules`
pada na svaki `headers()`/`cookies()`/`draftMode()`. Statička provera a ne test, jer otkaz
nije izuzetak nego **tiho** gubljenje statike — jedini simptom je `○` koje postane `ƒ` u
build izlazu koji na zelenom PR-u niko ne čita.

**Cache Components se ne uvode** radi ovog zadatka.

## 4. C2 — jedan deployment = jedna organizacija

Host-shared multi-tenancy pripada ADR-023 §6.3, RLS rollout-u i **zasebnom odobrenom
milestone-u**. Ne uvodi se usput kroz i18n ni kroz `proxy.ts`. `DEFAULT_ORGANIZATION_SLUG`
je verifikovani identitet organizacije, isto ime kao backend `settings.default_organization_slug`.

Šav ka (b) je imenovan i testiran, bez spekulativne implementacije. `ActiveWorkspaceLocaleResolver`
baca `OrganizationMismatchError` ako se članstvo i deployment raziđu — to je tripwire za dan
kad neko pokuša host-shared bez ADR-023 posla.

## 5. Registar ruta

**Route ID je jedini stabilni identitet ekrana.** Engleski i srpski pathname su prezentacione
vrednosti. Fizičke rute su engleske (`/workspace/**`, `/account/**`); srpske spoljašnje
putanje stižu kroz **proxy rewrite**, a pogrešan locale dobija **308**.

Zaključana pravila: query parametri se ne prevode · API rute se ne lokalizuju · superadmin
rute se ne lokalizuju · jedna Next.js stranica služi obe putanje · planirana ruta se ne
kreira dok njen ekran ne postoji · tab ne postaje stranica bez deep-link/permission/loader
potrebe · javne rute se sada samo evidentiraju.

**`PROTECTED_ROUTE_PREFIXES` se izvodi iz registra**, nikad ne piše ručno: proxy poredi
spoljašnju putanju, pa je ručna lista način da se doda locale i zaboravi auth gate — to je
nezaštićen Control Center, ne kozmetika.

**Nikad ne redirektuj na putanju na kojoj si već.** Ovo je zatvorilo stvarnu beskonačnu
petlju koju je našao round-trip property test: `/superadmin` je locale-neutralan, matcher je
vraćao `pathLocale: "en"` na srpskoj organizaciji, a cilj redirekta bio je bajt-identičan
zahtevu.

## 6. Sadržaj vs poruke — granica

| | Ide u | Prevodi se |
|---|---|---|
| Sistemski UI (nav, statusi, validacije, email) | `src/messages/` | da |
| Tenant-authored sadržaj | CMS | **nikad** |
| **Fallback** sadržaj (`src/content/`) | `src/content/<locale>/` | **da — kao placeholder** |

Fallback se prevodi jer nije tenantov: pokazuje adminu čemu polje služi i na **kojoj dužini**,
što je važno jer CMS ograničava broj znakova po sistemskom polju da se dizajn ne naruši.
`content:check` drži oba locale-a pod istim granicama — engleski je po pravilu duži.

Izbor fallback locale-a je **build-time konstanta** (`content/locale.ts`), ne per-request:
sadržaj čita 51 modul, većinom Server Components koje se prerenderuju.

**Identitetska polja su bajt-identična u oba fajla** — slug, ime, slika, cena, trajanje,
href, `bookingServiceSlugs`. Ona ne govore ništa nego pokazuju na rute, fajlove i iznose;
prevedena bi vodila u nepostojeće. Razlikuje se samo proza.

**`translation_group` se ne dodaje — nikad.** Jedan `default_content_locale` po organizaciji
čini tu kolonu trajno nepotrebnom.

## 6.1 Kako podešavanje jezika stvarno deluje

Ekran upisuje u bazu, ali razrešavanje locale-a ne sme da čita per-request — inače pada
statika. Lanac je zato:

```
ekran → PATCH → baza + audit → javni GET /public/organizations/{slug}/locales
      → tagovano data-cache čitanje (uz fallback na registar) → render
      ↑ revalidateTag na izmenu
```

**Javni read je namerno uzak** — dva locale koda i ništa više, oba ionako vidljiva svakome
ko otvori sajt. Postoji jer frontend mora da zna jezik **u build vremenu**, bez sesije.

**Nedostupan backend vraća `null` i registar odgovara sam.** Build prerenderuje ~100
stranica i inače bi padao kad god API nije gore — što se već desilo jednom, na
`/kompas/oblasti`.

**Posle čuvanja ide `router.refresh()`.** Jezik živi u server stablu — labele navigacije,
`<html lang>` i svaki href iz `localizedPath` — pa ažuriranje samo query keša ostavlja sve
to renderovano na starom jeziku dok korisnik ručno ne osveži.

## 6.2 Zašto proxy ne preusmerava na locale (Amandman 3, 2026-08-12)

Lanac iz §6.1 ima jednog učesnika koji u njemu **ne može da učestvuje**: `proxy.ts`.

Radi na edge-u, ne sme da uvozi `server-only` (`org-context.ts`), i ne sme da gađa backend
pre svake stranice. Vidi, dakle, isključivo **statički registar zapečen u build**. Živa
vrednost je u bazi — tamo je ostavlja org_admin sa ekrana podešavanja.

Dok se to dvoje slaže, ništa se ne primećuje. Kad se raziđe, proxy 308-uje **svaki link koji
je aplikacija upravo iscrtala**. Izmereno na QA-u, sa organizacijom prebačenom na `en`:

```
GET /workspace/settings   → 308 → /radni-prostor/podesavanja   (proxy: registar, sr-Latn)
GET /                     → <html lang="en">                    (render: baza, en)
```

Ista instalacija, dva odgovora. Prevođenje ekrana to nije moglo da nadjača — proxy radi prvi.

**Rešenje je da proxy prestane da bude autoritet nad URL-om.** Prihvata oba pisanja
registrovane rute i rewrite-uje ih na kanonsku internu putanju. Jezik URL-a više ne odlučuje
proxy nego linkovi koje aplikacija gradi iz žive vrednosti — a to je jedini sloj koji je i
vidi.

Cena je kanonizacija, koja je SEO argument, a ove rute su iza logina i nose `noindex`. Javne
marketing rute se još ne lokalizuju; kad se budu, kanonizacija je njihov posao — u sloju koji
ume da pročita živu vrednost, ne u ovom.

**Šire pravilo, vredno pamćenja:** kad dva sloja čitaju istu vrednost iz dva izvora — jedan
iz build-a, drugi iz baze — nije pitanje **da li** će se razići, nego kada. Sloj koji vidi
manje ne sme da nadjačava sloj koji vidi više.

## 7. Posledice

- `next-intl` se koristi **samo kao sloj za poruke i formate**; njegov routing sloj traži
  `app/[locale]` i detektuje locale iz cookie-ja/`Accept-Language` — oboje zabranjeno.
- `AppConfig` augmentacija radi **samo za `Messages`**; `Locale` ne stiže do `getLocale()`
  jer je `AppConfig` samo re-export. Sužavanje je izolovano u `i18n/locale-boundary.ts`
  (server) i `i18n/use-ui-locale.ts` (klijent).
- Engleski katalog je kanonski, prevodi su anotirani `Widen<>` — vrednosti slobodne, oblik
  fiksan. `AppConfig["Messages"]` mora ostati **literalni** engleski tip, inače ICU provera
  argumenata tiho nestaje.
- Ostaje **jedan `as Route` cast** (u `localizedPath`) i **jedan cast poruka** (u
  `getPlatformMessages`), oba dokumentovana na mestu.

## 8. Šta ostaje otvoreno

- **`seoDescription` 170 → 200** je privremen. Nije dizajnerska nego SEO granica; steže samo
  zato što `seo.description` koristi `cardExcerpt`. Prava popravka je dati mu svoj izvor.
- **Superadminova lična preferenca** treba skladište na korisniku i svoj resolver — dodatak
  na I18N-7, ne isti posao. Šav je označen sa `TODO(superadmin-locale)` u superadmin layout-u.
- **Prazan panel posle prijave u dev modu** (QA radi) — nije dijagnostikovano; verovatno isti
  koren kao „učita se tek posle refresh-a", u `currentUser()` koji vrati `null` na prvom
  zahtevu posle Clerk handshake-a.
- **Klijentski panel** je premešten na `/account`, ali njegovi ekrani po dizajnu još nisu
  izgrađeni; `account.programs` je nova ruta koju tabela nije imala.
