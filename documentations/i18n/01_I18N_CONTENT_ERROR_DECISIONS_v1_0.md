# Psihointegritet — I18N, sadržaj i greške: zaključane odluke v1.0

**Datum:** 2026-08-13
**Vlasnik odluka:** Milan Dražić (CTO)
**Status:** usvojeno 2026-08-13; promovisano u `PRODUCT_DECISIONS.md`, ADR-026 i aktivni I18N plan

## 1. Provereno stanje na `features` grani

Aktuelni kod ne koristi model `default_locale + supported_locales` na nivou organizacije.
Postoje:

```text
PLATFORM_DEFAULT_LOCALE = "en"
SUPPORTED_UI_LOCALES = ["en", "sr-Latn"]

organizations.ui_locale
organizations.default_content_locale
```

- `ui_locale` nije izbačen. On je trenutno aktivan sistemski jezik organizacije.
- `default_content_locale` postoji i trenutno se u delu koda još koristi kao jezik javne
  površine, iako I18N Completion plan predlaže da ostane samo početni locale novog CMS
  sadržaja.
- `SUPPORTED_UI_LOCALES` je globalna platformska mogućnost, ne DB kolona organizacije.
- `default_locale` kao DB polje ne postoji. Postoji samo platformska konstanta
  `PLATFORM_DEFAULT_LOCALE`.
- Organization-level `supported_locales` ne postoji i ne uvodi se u ovom milestone-u.

## 2. Odluka o locale modelu

### 2.1 Sadašnji model ostaje

Za sada jedan deployment predstavlja jednu organizaciju. `ui_locale` je jedini
organization-scoped jezik renderovanja:

```text
1. verifikovani organization context
2. organization.ui_locale
3. PLATFORM_DEFAULT_LOCALE kao poslednji bezbedni fallback
```

`ui_locale` upravlja:

- sistemskim UI-jem;
- javnim platformskim kontrolama i fallback sadržajem;
- workspace-om;
- klijentskim panelom;
- lokalizovanim workspace putanjama;
- Booking i Intake kontrolama;
- statusima, validacijama i korisničkim greškama;
- sistemskim emailovima i notifikacijama;
- `<html lang>`, formatiranjem i metadata fallbackom.

`default_content_locale` više nije render selector. On samo postavlja početnu locale oznaku
novom tenant-authored CMS sadržaju. Ne prevodi sadržaj i ne određuje kojim jezikom će admin
zaista pisati.

Ovo je D-077 Amandman 5. Istorijski completion plan ostaje u
`documentations/i18n/archive/I18N_COMPLETION_PLAN_v1_0.md`; aktivni plan je
`documentations/i18n/03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md`.

### 2.2 Zašto sada ne uvodimo `default_locale + supported_locales`

Taj model je potreban tek kada jedan tenant istovremeno objavljuje više javnih jezičkih
verzija i posetilac bira jezik. Tada su potrebni i:

- organization-level enabled/supported locales;
- aktivni request locale;
- locale-aware CMS revizije;
- lokalizovani javni URL-ovi;
- canonical i `hreflang` pravila;
- sitemap po jeziku;
- politika fallbacka između jezičkih verzija;
- public language switcher;
- novi SSG/ISR ugovor.

To je zaseban multilingual-public milestone. Ne uvodi se kroz ovaj i18n completion slice i
ne radi se usput kroz `proxy.ts`.

## 3. Tri jezička sloja

| Sloj | Primer | Ugovor |
| --- | --- | --- |
| Sistemski UI | dugmad, statusi, tabovi, validacije, greške | Uvek kompletno na `ui_locale` |
| Platformin fallback | Hero, banner, početne usluge, demo Kompas/Research | Uvek kompletno na `ui_locale` |
| Tenant CMS sadržaj | naslov, eyebrow, opis, CTA koje je admin uneo | Prikazuje se tačno kako je uneto, polje po polje |

Platforma garantuje da njene poruke i fallback nikada nisu delimično prevedeni. Tenant sme
da napravi mešan autorski sadržaj jer CMS ne utvrđuje jezik unosa i ne blokira ga.

## 4. CMS override je po polju

Postojeći slot-level ugovor `inherit/override/hidden` ostaje. Za pojedinačno polje usvaja se
backward-compatible evolucija sa tri namere:

```ts
type ContentFieldOverride<T> =
  | { mode: "inherit" }
  | { mode: "custom"; value: T }
  | { mode: "hidden" };
```

- postojeća primitivna vrednost ostaje `custom`;
- nedostajuće polje, `null` i postojeća prazna vrednost ostaju `inherit`;
- novi eksplicitni `hidden` wrapper skriva samo opciono display polje;
- required H1, obavezna accessibility polja, neophodni CTA/accessibility label i SEO
  fallback ne mogu biti `hidden`;
- slot-level `hidden` i dalje skriva celu toggleable sekciju.

Ugovor se evoluira unutar postojećeg JSON-a, uz centralni resolver i validatore. Ne uvodi se
nova DB kolona niti masovna migracija starih revizija. Ako format dobije schema version,
stari i novi oblik moraju ostati čitljivi istim resolverom.

### 4.1 Dozvoljeni mešani tenant sadržaj

Ako je `ui_locale = en`, engleski fallback Hero je potpun. Admin potom promeni samo:

```text
eyebrow = "Digitalni centar za mentalno zdravlje"
```

Naslov i opis ostaju iz engleskog fallbacka dok ih sam ne izmeni. To je dozvoljeno i ne
proizvodi upozorenje. Platforma ne pokušava da prepozna da je eyebrow na srpskom.

### 4.2 Zabranjeno mešanje koje proizvodi platforma

Nije dozvoljeno da sistem zbog pogrešnog resolvera spoji:

- `en` sistemske kontrole i `sr-Latn` platformin fallback;
- `sr-Latn` fallback jednog modula i `en` fallback drugog modula;
- CMS zapis druge organizacije;
- CMS locale verziju koja nije izabrani aktivni zapis;
- raw backend poruku sa lokalizovanim frontend ekranom.

## 5. D-079 — korisničke greške i tehnička dijagnostika

Ovo treba upisati kao zasebnu proizvodno-arhitektonsku odluku, jer nije samo i18n detalj.

### 5.1 Korisnik dobija jasnu i prevedenu poruku

Klijent, terapeut i org admin ne vide:

- exception ime;
- HTTP status kao objašnjenje;
- endpoint;
- stack trace;
- SQL ili provider poruku;
- `correlationId`, `requestId`, `traceId` ili incident ID;
- vrednosti `unset`, `undefined`, `null` ili prazan kod;
- instrukciju da tehnički ID ručno šalju podršci.

Poruka mora da kaže:

1. šta korisnička radnja nije završila;
2. da li je njegov unos sačuvan ili ostao na ekranu — samo ako je to istina;
3. šta može sledeće da uradi;
4. alternativnu putanju kada postoji.

Primer:

```text
Ovu stranicu trenutno nije moguće otvoriti

Pokušajte ponovo za nekoliko minuta.

[Pokušaj ponovo] [Vrati se na pregled]
```

Ne koristiti generički naslov `Greška` kada se može imenovati šta nije uspelo.

### 5.2 Backend API vraća kod, parametre i status — ne korisničku prozu

Minimalni javni ugovor:

```ts
type ApiProblem = {
  type: string;
  status: number;
  code: string;
  params?: Record<string, string | number | boolean>;
  fieldPath?: string;
  fieldErrors?: Record<string, Array<{ code: string; params?: Record<string, unknown> }>>;
};
```

- `code` je stabilan i bira frontend poruku iz `messages/<locale>/errors`;
- `params` ne smeju sadržati kliničke podatke, slobodan tekst korisnika ili tajne;
- `title` i `detail` iz backend-a ne koriste se za prikaz krajnjem korisniku;
- nepoznat kod koristi kontrolisani `errors.unknownCode` na `ui_locale`;
- raw backend message se nikada ne prosleđuje kroz `error.message` u toast.

Ako je correlation ID potreban za povezivanje logova, ostaje u internom transportu ili
server-side incident zapisu, ali UI ga ne renderuje.

### 5.3 D-079A — strukturisani logging i postojeći Diagnostic Engine

U ovom milestone-u neočekivane greške idu u strukturisane server logove. Postojeći Diagnostic
Engine ostaje on-demand engine za provere integriteta i njegovi nalazi se lokalizuju; ne
pretvara se u lažni incident registry.

- tehnički evidence i trace ne prikazuju se tenant korisnicima;
- server log ostaje tehnički i nije korisnički katalog;
- `unset` nije validan identifikator i mora pasti na validaciji ili biti izostavljen;
- UI ne sme obećati „problem je evidentiran” jer incident nije perzistiran.

### 5.4 D-079B — Incident Registry, poseban pod-slice

Incident persistence, lifecycle, request/trace povezivanje, autorizacija, superadmin pregled,
retention, deduplikacija i acknowledgement/resolution pripadaju posebnom planu i verovatnoj
novoj migraciji. Ne implementiraju se kroz ovaj i18n milestone.

### 5.5 Backend-generated tekst se takođe lokalizuje

Tekst koji backend sam isporučuje čoveku — email subject/body, notification copy i
korisnički čitljive Diagnostic remediation poruke — bira katalog po organization
`ui_locale`.

API error response nije prevodilački katalog: on nosi kod. Frontend je odgovoran za UI
tekst. Backend katalog je potreban samo za kanale koje backend sam renderuje.

## 6. Obavezne dokumentacione izmene

Pre produkcionog koda uskladiti:

1. `PRODUCT_DECISIONS.md`
   - upisati D-077 Amandman 5;
   - upisati D-077 Amandman 6: potpuni platformin fallback + tenant override po polju;
   - dodati D-079: user-safe errors + Diagnostic-only technical evidence.
2. `adr/ADR-026-organization-locale-and-route-registry.md`
   - označiti povučene delove koji javni render vezuju za `default_content_locale`;
   - opisati novu semantiku obe DB kolone.
3. `documentations/i18n/archive/I18N_MULTITENANT_PLAN_v1_0.md`
   - ostaje istorijski zapis;
   - dodati supersession beleške za Amandmane 5 i 6.
4. `documentations/i18n/03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md`
   - jedini aktivni I18N implementacioni plan;
   - istorijski completion plan ostaje neizmenjen osim supersession zaglavlja.
5. `TODO.md`
   - stanje mora pratiti stvaran kod i commitove, bez paralelnog arhitektonskog narativa.

## 7. Stop pravilo

Ako implementator pronađe dokument višeg autoriteta koji se kosi sa ovim odlukama, ne sme
sam izabrati pobednika. Zaustavlja samo pogođeni slice i prijavljuje:

- tačne dokumente i odeljke;
- trenutno ponašanje koda;
- najmanje dve opcije;
- preporuku sa posledicama;
- da li konflikt zahteva novu migraciju ili ADR.
