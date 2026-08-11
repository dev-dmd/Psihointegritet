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

**`translation_group` se ne dodaje — nikad.** Jedan `default_content_locale` po organizaciji
čini tu kolonu trajno nepotrebnom.

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
  na I18N-7, ne isti posao.
- **Klijentski panel** je premešten na `/account`, ali njegovi ekrani po dizajnu još nisu
  izgrađeni; `account.programs` je nova ruta koju tabela nije imala.
