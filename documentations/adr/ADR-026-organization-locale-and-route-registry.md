# ADR-026 — Jezik organizacije, rendering ugovor i registar ruta

**Status:** Accepted · **Datum:** 2026-08-11 · **Poslednja izmena:** 2026-08-14
**Odluke:** D-077 (+ Amandmani 1–6)
**Menja:** D-067, O-27, T9 · **Ne dira:** D-055, ADR-023 granicu izolacije
**Aktivni plan isporuke:** `documentations/i18n/03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md`

---

## 1. Kontekst

Platforma je bila jednojezična u kodu, a ne po nameri: `next-intl` instaliran sa nula
import-a, `<html lang="sr-Latn">` zakucan, `SYSTEM_CONTENT_LOCALE` konstanta koja diže
izuzetak za svaki drugi jezik, 181 `.tsx` fajl sa srpskim inline. Tim je od D-074/075/076
američki, pa novo tržište mora biti konfiguracija, ne fork.

## 2. Odluka

**Jezik pripada organizaciji**, kroz dve odvojene kolone:

```
organization.ui_locale              → jedini organization-scoped render locale
organization.default_content_locale → locale koji se pečati na nov sadržaj
```

`PLATFORM_DEFAULT_LOCALE = "en"`, `SUPPORTED_UI_LOCALES = ["en", "sr-Latn"]`. Razrešavanje
ide isključivo iz verifikovane organizacije; **`Accept-Language` se ne koristi nigde**.

### 2.1 Ko bira jezik (Amandman 2)

| Uloga      | Bira                                                 |
| ---------- | ---------------------------------------------------- |
| superadmin | **svoj** jezik — lična platformska preferenca        |
| org_admin  | `ui_locale` organizacije; javni sajt ga takođe prati |
| terapeut   | ne bira, prati organizaciju                          |
| klijent    | ne bira                                              |

Superadmin uz to **sme da podesi jezik bilo koje organizacije** — kao ispravka kad
org_admin ne zna kako ili je pogrešio. Operatorska intervencija, ne svakodnevna radnja:
isti ugovor uz eksplicitan `organization_id`, gate na `is_superadmin`, i audit event koji
beleži da je promenu izvršio **operator, ne organizacija**. Bez toga org_admin vidi da mu
se jezik promenio i nema trag ko je to uradio.

Superadminov slučaj je **izuzetak od organization-scoped pravila**, ne njegovo ukidanje:
superadmin nije tenant površina, rute su mu locale-neutralne, i radi preko više
organizacija — nema „svoju" od koje bi nasledio jezik. Njegova preferenca **nikad ne curi
u tenant površinu**: kad gleda tuđi workspace, vidi `ui_locale` te organizacije.

Skladištenje lične superadmin preference još nije implementirano. Dok ne dobije svoj
odobreni user-storage slice, superadmin shell koristi postojeći platformski/deployment
fallback. Ovaj milestone ne uvodi user migraciju i ne širi superadmin i18n scope.

## 3. Rendering ugovor (Amandmani 1 i 5)

Prava odluka nije „SSG ili SSR za sve", nego **koji tip stranice sme da zavisi od request
host/header konteksta**.

| Površina                                | Rendering                      | Sme zavisiti od request-a |
| --------------------------------------- | ------------------------------ | ------------------------- |
| Javne informativne stranice             | SSG                            | **Ne**                    |
| CMS sadržaj, Kompas taksonomija         | ISR + on-demand revalidation   | **Ne**                    |
| Booking / Intake                        | statički shell + dinamički deo | Ne za shell               |
| Workspace, klijentski panel, superadmin | SSR/dynamic                    | Da                        |

**Dva imenovana načina čitanja organizacije ostaju odvojena** (`lib/tenant/`), da javna
površina zadrži SSG/ISR, a autentifikovana površina read-your-own-writes ponašanje:

```
PublicOrganizationLocaleResolver → ui_locale · tagovani cache · bez request state-a
ActiveWorkspaceLocaleResolver    → ui_locale · request-time/no-store
```

**Amandman 5 povlači ranije pravilo da javna površina prati `default_content_locale`.**
`ui_locale` je jedini organization-scoped render locale: javni sistemski UI, platformin
fallback, workspace, klijentski panel, Intake, Booking, Research, Kompas, validacije,
statusi, greške, sistemski email/notifikacije, `<html lang>` i metadata fallback svi koriste
istu vrednost. `default_content_locale` više nije render selector.

Tenant-authored CMS tekst se ne prevodi i može biti mešan po poljima; takvo autorsko
mešanje ne menja locale platforminog UI-ja niti `<html lang>` ugovor.

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
vrednosti. Fizičke rute su engleske (`/workspace/**`, `/account/**`); obe spoljašnje varijante
stižu kroz **proxy rewrite** bez locale-kanonizujućeg 308 preusmerenja (Amandman 3).

Zaključana pravila: query parametri se ne prevode · API rute se ne lokalizuju · superadmin
rute se ne lokalizuju · jedna Next.js stranica služi obe putanje · planirana ruta se ne
kreira dok njen ekran ne postoji · tab ne postaje stranica bez deep-link/permission/loader
potrebe · javne rute se sada samo evidentiraju.

**`PROTECTED_ROUTE_PREFIXES` se izvodi iz registra**, nikad ne piše ručno: proxy poredi
spoljašnju putanju, pa je ručna lista način da se doda locale i zaboravi auth gate — to je
nezaštićen Control Center, ne kozmetika.

Superadmin rute ostaju locale-neutralne. Javne marketing rute, public language switcher,
`hreflang` i multilingual sitemap nisu deo ovog milestone-a.

## 6. Sadržaj vs poruke — granica

|                                                | Ide u                   | Prevodi se               |
| ---------------------------------------------- | ----------------------- | ------------------------ |
| Sistemski UI (nav, statusi, validacije, email) | `src/messages/`         | da                       |
| Tenant-authored sadržaj                        | CMS                     | **nikad**                |
| **Fallback** sadržaj (`src/content/`)          | `src/content/<locale>/` | **da — kao placeholder** |

Fallback se prevodi jer nije tenantov: pokazuje adminu čemu polje služi i na **kojoj dužini**,
što je važno jer CMS ograničava broj znakova po sistemskom polju da se dizajn ne naruši.
`content:check` drži oba locale-a pod istim granicama — engleski je po pravilu duži.

Izbor fallback locale-a ide kroz centralni content registry i tagovano, SSG/ISR-safe čitanje
organization `ui_locale`. Komponente ne biraju locale u module scope-u i ne importuju
konkretan content pack.

**Identitetska polja su bajt-identična u oba fajla** — slug, ime, slika, cena, trajanje,
href, `bookingServiceSlugs`. Ona ne govore ništa nego pokazuju na rute, fajlove i iznose;
prevedena bi vodila u nepostojeće. Razlikuje se samo proza.

`translation_group`, organization `default_locale` i organization `supported_locales` ne
uvode se u ovom milestone-u. Više istovremenih javnih jezika jednog tenanta zahteva poseban
multilingual-public ugovor.

## 6.1 CMS field override (Amandman 6)

Postojeći slot-level `inherit/override/hidden` ostaje. Field vrednost je backward-compatible:

- postojeća primitivna vrednost je `custom`;
- nedostajuće polje, `null` i postojeća prazna vrednost su `inherit`;
- novi eksplicitni wrapper omogućava `hidden` samo za opciona display polja;
- required H1, accessibility polja, neophodni CTA/accessibility label i SEO fallback ne mogu
  biti `hidden`;
- slot-level `hidden` ostaje za celu toggleable sekciju.

Ugovor se evoluira u postojećem JSON-u, sa centralnim resolverom i validatorom, bez nove DB
kolone i bez masovne migracije starih published revizija. Platforma ne radi language
detection, automatski prevod ni upozorenje o jeziku tenantovog teksta.

## 6.2 Kako podešavanje jezika stvarno deluje

Ekran upisuje u bazu, ali razrešavanje locale-a ne sme da čita per-request — inače pada
statika. Lanac je zato:

```
ekran → PATCH → baza + audit → javni GET /public/organizations/{slug}/locales
      → tagovano data-cache čitanje (uz fallback na registar) → render
      ↑ revalidateTag na izmenu
```

**Javni read je namerno uzak** — postojeći odgovor nosi dva locale koda i ništa više, oba
ionako vidljiva svakome ko otvori sajt. Render koristi samo `ui_locale`;
`default_content_locale` ostaje u odgovoru radi kompatibilnosti dok se svi potrošači ne
auditiraju. Endpoint postoji jer frontend mora da zna jezik pri SSG/ISR renderu, bez sesije.

**Nedostupan backend vraća `null` i registar odgovara sam.** Build prerenderuje ~100
stranica i inače bi padao kad god API nije gore — što se već desilo jednom, na
`/kompas/oblasti`.

**Posle čuvanja menja se history pa ide tačno jedan `router.refresh()`.** Jezik živi u
server stablu — labele navigacije, `<html lang>` i svaki href iz `localizedPath` — pa
ažuriranje samo query keša ostavlja sve to renderovano na starom jeziku. Ako se lokalizovani
pathname menja, klijent prvo poziva
`window.history.replaceState(window.history.state, "", target + search + hash)`, čime čuva
query parametre i sinhronizuje `usePathname`, a zatim u jednom transition-u poziva
`router.refresh()` da dobije novo Server Component stablo i `NextIntlClientProvider`.

`router.replace()` bez refresh-a nije dovoljan jer App Router čuva shared layout. Kombinacija
`router.replace()` + `router.refresh()` je zabranjena jer uvodi dve konkurentne router
operacije. `window.location.reload/replace`, timeout i `requestAnimationFrame` nisu deo
ugovora.

## 6.3 Zašto proxy ne preusmerava na locale (Amandman 3, 2026-08-12)

Lanac iz §6.2 ima jednog učesnika koji u njemu **ne može da učestvuje**: `proxy.ts`.

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

## 6.4 Dve vrednosti, različite odgovornosti (Amandmani 4 i 5)

| Podešavanje              | Vlasnik                    | Primena                                                       |
| ------------------------ | -------------------------- | ------------------------------------------------------------- |
| `ui_locale`              | org_admin                  | Jedini organization-scoped render locale; odmah, bez deploy-a |
| `default_content_locale` | organization konfiguracija | Creation stamp novog tenant CMS zapisa; ne bira render        |
| Postojeći sadržaj        | CMS zapis                  | **Nikada** se ne prevodi automatski                           |

Iz toga slede dva odvojena čitanja iste vrednosti:

```
javna površina    → getDeploymentOrganization("cached").uiLocale  → tagovani keš
workspace/panel   → getDeploymentOrganization("live").uiLocale    → no-store
```

Vrednost je ista; razlikuje se samo freshness. Javnom sajtu tagovani keš čuva statiku, dok
workspace koristi `no-store`. `default_content_locale` se čita u backend create use-case-u
kada frontend ne prosledi eksplicitan, podržan locale.

Uz to, `revalidateTag` sa **imenovanim profilom** je stale-while-revalidate: prvi read posle
upisa sme da vrati staru vrednost. Za podešavanje koje korisnik mora odmah da vidi to nije
prihvatljivo, pa mutacija koristi `{ expire: 0 }`. (Čisto rešenje je Server Action sa
`updateTag`; ovo je prelazno i tako je zapisano.)

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
- Backend API nosi stabilan error `code`, status, bezbedne `params` i field error kodove;
  frontend presentation mapper bira user-safe tekst. Raw `title`, `detail`, `Error.message`,
  correlation/digest/trace/incident ID nisu korisnički tekst.

## 8. Šta ostaje otvoreno

- **`seoDescription` 170 → 200** je privremen. Nije dizajnerska nego SEO granica; steže samo
  zato što `seo.description` koristi `cardExcerpt`. Prava popravka je dati mu svoj izvor.
- **Superadminova lična preferenca** treba skladište na korisniku i svoj resolver — dodatak
  na I18N-7, ne isti posao. Šav je označen sa `TODO(superadmin-locale)` u superadmin layout-u.
- **D-079B Incident Registry** je poseban pod-slice sa persistence/lifecycle/retention i
  verovatnom migracijom. Do tada neočekivane greške idu u strukturisane server logove, a UI
  ne tvrdi da je incident evidentiran.
- **Prazan/spor panel posle prijave** korigovan je u I18N-STAB-1: server identity koristi
  isključivo React request-scoped `cache()`, organization i identity bootstrap počinju
  paralelno, a `currentUser()` je samo fallback kada `/api/v1/me` nema email ili displayName.
  Persistent auth cache nije uveden; Faza 10 ručni/browser QA i dalje ostaje otvoren.
- **Klijentski panel** je premešten na `/account`, ali njegovi ekrani po dizajnu još nisu
  izgrađeni; `account.programs` je nova ruta koju tabela nije imala.
