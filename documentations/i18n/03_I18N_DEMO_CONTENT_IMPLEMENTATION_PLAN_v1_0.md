# Psihointegritet — i18n, CMS sadržaj i bezbedne greške: aktivni plan v1.0

**Status:** u toku — **I18N Foundation & Safe Error Transport completed 2026-08-13**;
kompletan I18N milestone nije završen.
**Autoritet:** D-077 Amandmani 5–6, D-079, ADR-026
**Istorija:** raniji planovi su u `documentations/i18n/archive/` i nisu aktivni autoritet.

## Ishod

Na istom deploymentu promena `organization.ui_locale` između `en` i `sr-Latn` menja
platformski UI, kompletan platformski fallback, workspace, klijentski panel, sistemske
poruke, email i user-safe greške. `organization.default_content_locale` samo pečati locale
na novi tenant CMS sadržaj. Tenantov CMS override ostaje po polju i prikazuje se tačno kako
je unet.

## Implementacioni checkpoint — 2026-08-13

**I18N Foundation & Safe Error Transport — completed.** Završeni su organization locale
resolveri, CMS creation stamp, locale-aware public reads i fallback registry, kao i code-only
API problem transport bez backend proze i tehničkih identifikatora u tenant response body-ju.

Ovaj checkpoint ne zatvara kompletan I18N milestone. Otvoreni su three-state field override,
centralna user-safe error prezentacija, uklanjanje poslednjeg legacy `pickContent` selektora,
content paketi, preostali platformski UI, backend email/notification katalozi, dijagnostika,
D-079B plan i završni QA.

### Integracioni gate posle checkpoint-a

Proveren 2026-08-13 pre narednog funkcionalnog slice-a:

- puni frontend Vitest: 76 fajlova, 624 testa prošla, 1 preskočen;
- Next.js production build: 106 statičkih stranica generisano;
- izolovani PostgreSQL migration chain: fresh upgrade, downgrade, ponovni upgrade i
  `alembic check` prolaze;
- offline SQL za `e4a91c62d8f7 -> f1a7c9d2e4b6` generiše samo `DROP DEFAULT`;
- CMS create bez locale-a koristi verifikovani `organization.default_content_locale`;
- postojeći published entry/revision zadržava locale, status, slot podatke i SEO kroz
  upgrade/downgrade migracije;
- automatizovani smoke test potvrđuje `en -> sr-Latn -> en` navigaciju odmah nakon save-a,
  bez ručnog refresh-a;
- integraciona regresija server/client granice u Kompas support bloku pronađena je punim
  suite-om i popravljena zasebnim commitom `dffe8b9`.

## Zaključane granice

- Ne uvode se organization `default_locale` ni `supported_locales`.
- Ne uvode se javni language switcher, lokalizovani javni URL-ovi, `canonical`, `hreflang`
  ni sitemap po jeziku.
- Superadminova lična preferenca ostaje dokumentovan izuzetak; ovaj milestone ne uvodi
  user migraciju. Do posebnog slice-a koristi deployment/platform fallback.
- Ne menjaju se Intake/safety, Booking, Kompas ili CMS poslovna semantika.
- Nestalo dugme za unos usluga je zaseban Services CRUD & Booking Setup UX task.
- D-079B Incident Registry je plan, ne lažna persistence implementacija.

## Faza 1 — dokumentacioni autoritet

- Promovisati D-077 Amandmane 5–6 i D-079.
- Uskladiti ADR-026, ovaj aktivni plan, TODO, OPEN_DECISIONS i master-plan reference.
- Arhivirane planove jasno označiti kao istorijske.
- Dodati README i gap manifest za `documentations/PLATFORM-CONTENT/`.

**Gate:** prvi commit je documentation-only; nijedan aktivni dokument ne sme tvrditi da
`default_content_locale` bira render locale.

## Faza 2 — locale/content osnova i creation stamp

- `ui_locale` postaje jedini organization-scoped render locale.
- Javno čitanje ostaje tagovano i SSG/ISR-safe; workspace ostaje live/no-store.
- Zameniti module-scope `pickContent()` centralnim registry-jem.
- Ukloniti hardkodovani `?locale=sr-Latn` i hardkodovane locale cache tagove.
- Backend create use-case učitava verifikovanu organizaciju i, ako zahtev nema locale,
  upisuje `organization.default_content_locale`.
- Eksplicitan locale je dozvoljen samo posle validacije prema podržanim locale vrednostima.
- Auditovati sve write putanje. Tek kad svaka eksplicitno upisuje locale i testovi to dokažu,
  zasebna CMS migracija uklanja `content_entries.locale` server default `sr-Latn`. Ako taj
  gate ne prođe, odlaže se samo uklanjanje default-a.

**Gate:** promena `ui_locale` menja `<html lang>`, sistemske poruke i fallback; promena
`default_content_locale` ne menja postojeći render i utiče samo na nov CMS zapis.

## Faza 3 — CMS field override

Postojeći slot-level `inherit | override | hidden` ostaje. Field ugovor je kompatibilan:

```ts
type ContentFieldOverride<T> =
  | { mode: "inherit" }
  | { mode: "custom"; value: T }
  | { mode: "hidden" };
```

- postojeća primitivna vrednost je `custom`;
- nedostajuće polje, `null` i postojeći prazan tekst znače `inherit`;
- eksplicitni wrapper uvodi field-level `hidden`;
- `hidden` je dozvoljen samo za opciona display polja;
- required H1, accessibility polja, neophodni CTA/accessibility label i SEO fallback ne
  mogu biti skriveni;
- nema nove DB kolone ni masovne migracije sadržaja.

**Gate:** testovi pokrivaju primitive/missing/null/empty/hidden i zabranjena skrivanja.

## Faza 4 — centralni error contract (D-079A)

- Jedan transportni ugovor: stabilan `code`, bezbedne `params` i HTTP status.
- Jedan frontend mapper i `en`/`sr-Latn` error katalozi.
- UI nikad ne prikazuje backend `title`, `detail`, raw `error.message`, Pydantic/provider
  tekst, correlation/digest/trace/incident ID, `unset`, `undefined` ili `null`.
- Network poruka jasno kaže šta nije završeno i šta korisnik može sledeće da uradi, bez
  tvrdnje da je unos sačuvan ili ostao na ekranu ako to nije poznato.
- Neočekivane greške idu u strukturisane server logove; postojeća dijagnostika se kasnije
  lokalizuje. `global-error.tsx` ne prikazuje digest i koristi samostalan platform fallback.

**Gate:** adapter i render testovi dokazuju da tehnički tekst ne može do korisnika.

## Faza 5 — content paketi

- `psihointegritet`: stvarni/demo sadržaj za oba locale-a, sa source statusom.
- `mental-health-starter`: neutralan SEO/CTA/accessibility starter bez izmišljenih
  kvalifikacija, cena, lokacija ili kliničkih tvrdnji.
- `blank`: prazna struktura, CMS uputstva i kvalitetni empty states.
- Runtime ne čita dokumente iz `documentations/PLATFORM-CONTENT/`.
- Showcase podaci su jasno označeni i ne ulaze u stvarne Research/analytics agregate.

**Gate:** deep-key i stable-identity parity; nedostajuća stručna odobrenja blokiraju samo
status `approved`, ne registry, starter ili označen showcase.

## Faza 6 — platformski UI i domeni

Prevesti javni UI, workspace, account, metadata/aria/empty/loading state, zatim Intake,
Research, Kompas i Booking prezentacioni copy. Ne menjati stable ID-jeve, scoring, safety,
lifecycle, taxonomy, availability ili Booking state machine.

**Gate:** kompletna `en` i `sr-Latn` key/ICU parity; bez novih inline korisničkih rečenica.

## Faza 7 — backend email i notifications

- Jedan backend katalog za `en` i `sr-Latn`, biran prema `ui_locale`.
- Subject, HTML i text verzija dolaze iz istog izvora.
- Linkovi koriste postojeći workspace/account route registry ili zajednički helper; ne
  dupliraju se ručne Python mape putanja.
- Tenant-authored tekst se ne prevodi.

**Gate:** parity i snapshot testovi za oba locale-a i obe email reprezentacije.

## Faza 8 — postojeća dijagnostika (D-079A)

- Lokalizovati korisničke/admin labele postojećeg Diagnostic Engine-a.
- Tehnički evidence ostaje samo u logovima, Diagnostic Engine-u i superadmin površini.
- Ne tvrditi da postoji incident ako nema persistence zapisa.

## Faza 9 — D-079B Incident Registry plan

Zaseban odobren plan definiše persistence model, lifecycle, retention, pristup, redaction,
event ingestion, migraciju i operativni ownership. Ova faza ne implementira improvizovanu
tabelu ni lažni incident ID.

## Faza 10 — puni gate i vizuelni QA

```text
frontend: tsc, eslint, prettier, architecture check, vitest, build, content:check
backend: ruff/format, pyright, pytest, alembic offline/check po postojećem ugovoru
```

Vizuelno proveriti oba jezika i reprezentativne javne, workspace, account, email i error
tokove. I18n se ne označava završenim pre tog pregleda.

## Commit i izveštaj po slice-u

Jedan uski slice po commitu. Posle svakog se prijavljuju commit, promenjeni ugovori,
migracije, testovi i realni status; zatim se bez čekanja nastavlja sledeći odobreni slice.
