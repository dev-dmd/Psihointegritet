# Master prompt za Codex — I18N, demo sadržaj i user-safe greške

Radi na repozitorijumu `dev-dmd/Psihointegritet`, na aktuelnoj `features` grani.

## Način rada

Ovo je plan-first zadatak. U prvom prolazu ne menjaj produkcioni kod, šemu ni migracije.
Prvo analiziraj stvarno stanje, uskladi ga sa odlukama ispod i vrati precizan execution
plan. Sačekaj moje `ODOBRAVAM PLAN` pre implementacije.

Ako nešto nije jasno ili se kosi sa povezanim dokumentom:

1. ne nagađaj;
2. ne biraj tiho dokument koji pobeđuje;
3. navedi putanje i tačne odeljke/linije;
4. pokaži trenutno ponašanje koda;
5. ponudi najmanje dve opcije i preporuku;
6. jasno reci da li je blokiran ceo posao ili samo jedan slice;
7. postavi kratko pitanje vlasniku.

Nastavi read-only analizu nepogođenih delova, ali ne implementiraj konfliktni slice.

## Obavezno prvo pročitaj

- root `AGENTS.md` i/ili `CLAUDE.md`, ako postoje;
- `documentations/CLAUDE_CODE_MASTER_PLAN_v1_0.md`;
- `documentations/ARCHITECTUAL/ARCHITECTURAL_RULES_REVISED.md`;
- relevantna frontend arhitektonska pravila;
- `documentations/PRODUCT_DECISIONS.md`;
- `documentations/OPEN_DECISIONS.md`;
- `documentations/TODO.md`;
- `documentations/i18n/archive/I18N_MULTITENANT_PLAN_v1_0.md` (istorijski zapis);
- `documentations/i18n/archive/I18N_COMPLETION_PLAN_v1_0.md` (istorijski zapis);
- `documentations/adr/ADR-026-organization-locale-and-route-registry.md`;
- CMS, Kompas, Intake/Matching, Research, Booking i Diagnostic dokumente povezane iz njih;
- četiri handoff dokumenta iz ovog paketa.

Dokumentacija je vodič, ali stanje koda moraš proveriti. Ne pretpostavljaj da je TODO status
tačan ako ga commitovi i implementacija pobijaju.

## Proverena polazna činjenica — nemoj ponovo izmišljati locale model

Trenutno postoje:

```text
PLATFORM_DEFAULT_LOCALE = "en"
SUPPORTED_UI_LOCALES = ["en", "sr-Latn"]
organizations.ui_locale
organizations.default_content_locale
```

Ne postoji organization `default_locale`. Ne postoji organization `supported_locales`.
`ui_locale` nije izbačen.

Zaključan cilj ovog slice-a:

- `organization.ui_locale` je jedini organization-scoped aktivni render locale;
- `default_content_locale` samo pečati locale na nov tenant-authored CMS sadržaj;
- `SUPPORTED_UI_LOCALES` ostaje globalni registar onoga što platforma ume da renderuje;
- ne uvodimo više istovremenih javnih jezika jednog tenanta;
- ne uvodimo `default_locale + supported_locales` niti novu locale migraciju;
- ne koristimo `Accept-Language`, browser cookie ili host header kao autoritet jezika;
- jedan deployment i dalje predstavlja jednu organizaciju.

Ako stvarni HEAD sadrži kasniju odluku koja ovo menja, zaustavi se i pokaži dokaz pre bilo
kakve izmene.

## Poslovni cilj

Potencijalni tenant mora jasno da vidi da platforma radi potpuno na engleskom i srpskom.
Promena jezika ne sme promeniti samo sidebar ili rutu dok Hero, banner, Kompas, Intake,
Research, termini ili greške ostaju na drugom jeziku.

Platforma garantuje:

- kompletan sistemski UI na `ui_locale`;
- kompletan platformin fallback na `ui_locale`;
- iste strukturne ključeve za `en` i `sr-Latn`;
- odsustvo raw backend i tehničkih poruka u korisničkom UI-ju.

Tenantov CMS sadržaj je druga odgovornost:

- override radi po pojedinačnom polju;
- tenantov tekst se prikazuje tačno kako je unet;
- ne radimo language detection;
- ne upozoravamo da je admin uneo srpski tekst dok mu je UI na engleskom;
- ne prevodimo automatski;
- tenant sme privremeno ili trajno imati mešani autorski Hero;
- nedostajuće, `null` i postojeće prazno polje koristi potpuni fallback aktivnog `ui_locale`;
- hidden polje se ne prikazuje.

Mešani tenantov autorski sadržaj je dozvoljen. Mešanje koje proizvodi platformin pogrešan
resolver nije dozvoljeno.

## Jedan izvor istine za fallback

Nemoj praviti jedan gigantski `data.ts`. Napravi tipizovani content registry sa jednom
javnom ulaznom tačkom i domenskim fajlovima.

Predloženi paketi:

```text
psihointegritet          kompletan bilingual demo/stvarni fallback
mental-health-starter   neutralan bilingual starter za novu organizaciju
blank                   struktura bez izmišljenih tvrdnji
```

Komponente ne smeju direktno birati locale niti importovati konkretan pack.

DB override ima prednost po polju. Postojeći slot-level `inherit/override/hidden` ostaje.
Primitivno field polje je `custom`; nedostajuće, `null` i postojeće prazno je `inherit`; novi
wrapper omogućava `hidden` samo za opciona display polja. Evoluiraj postojeći JSON ugovor bez
nove DB kolone i bez masovne migracije starih revizija.

## Koji sadržaj smeš sam da napraviš

Smeš:

- prevesti i dovršiti sistemske poruke;
- napisati jasne user-safe error poruke;
- napraviti neutralan starter copy vođen SEO, CTA, funnel, pristupačnošću i semantičkim HTML
  pravilima za centre mentalnog zdravlja, savetovališta, terapeute i life-coach prakse;
- prevesti postojeći potvrđeni platformin fallback kao draft;
- napraviti CMS help text, field purpose, character limit i preview smernice;
- napraviti jasno označene showcase fixtures koji nisu stvarni poslovni/klinički podaci.

Ne smeš izmišljati kao finalno:

- biografije, zvanja, licence i kvalifikacije imenovanih terapeuta;
- cene, pravila, lokacije ili availability;
- klinička i safety pravila;
- pravne saglasnosti;
- stručne Kompas članke i preporuke;
- stvarna Research pitanja bez poslovnog/stručnog approval-a.

Za Intake, Research i Kompas prvo koristi postojeće odobrene stable ID-jeve i semantiku.
Možeš prevesti wording, ali ne menjaj značenje. Ako nedostaje stručni izvor, napravi strukturisan
draft ili showcase primer označen `approval pending`, pa prijavi šta vlasnik treba da dostavi
u `documentations/PLATFORM-CONTENT/`.

## Backend greške — obavezna promena ugovora

Klijent, terapeut i org admin ne smeju videti tehničke detalje ni ID greške.

Ne prikazuj:

- `correlationId`, digest, trace ili incident ID;
- `unset`, `undefined`, `null`;
- exception/SQL/provider tekst;
- raw backend `title`, `detail` ili `error.message`;
- instrukciju da terapeut ručno šalje support code.

Backend API vraća stabilan `code`, bezbedne `params`, status i strukturisane field errors.
Frontend bira jasnu poruku iz `messages/<locale>/errors` prema `ui_locale`.

Backend-generated email, notification i korisnički čitljiva Diagnostic remediation poruka
moraju imati backend katalog na oba jezika. Server logs i superadmin Diagnostic evidence smeju
biti tehnički.

Unexpected failure mora biti automatski evidentiran server-side kada infrastruktura za to
postoji. UI ne sme tvrditi da je evidentiran ako zapis nije uspeo.

U ovom milestone-u evidence znači strukturisani server log. Incident Registry je D-079B,
poseban naredni pod-slice; postojeći Diagnostic Engine se ne koristi kao zamena za njega.

Primer prihvatljivog UI-ja:

```text
Ovu stranicu trenutno nije moguće otvoriti

Pokušajte ponovo za nekoliko minuta.

[Pokušaj ponovo] [Vrati se na pregled]
```

## Važne scope granice

I18n/content slice ne menja:

- UI/UX workflow unosa usluga;
- UI/UX workflow termina i dostupnosti;
- Booking state machine;
- Intake matching/safety semantiku;
- Kompas lifecycle, taxonomy i publish pravila;
- CMS page-builder workflow;
- payments, Notify Me, Calendar ili RLS.

Nestalo dugme i forma na `/workspace/services` evidentiraju se kao poseban Services CRUD UX
task. Ne vraćaju se usput.

Kompas workflow jeste pretrpan i moraće da bude maksimalno pojednostavljen, ali to je sledeći
namenski slice posle i18n osnove. Posle njega ide CMS Page & Section Editing UX. U ovom poslu
smeš samo izdvojiti tekstove i napraviti arhitektonske šavove koji te buduće UX izmene
olakšavaju.

## Šta očekujem u prvom odgovoru

Vrati:

1. HEAD SHA i proveru radnog stabla;
2. tabelu `dokument tvrdi / kod radi / cilj odluke`;
3. inventar svih locale i content izvora;
4. inventar svih backend i frontend error putanja;
5. predloženu konačnu strukturu fajlova;
6. precizne faze i commitove;
7. listu migracija — očekivanje je da locale DB migracija nije potrebna;
8. rizike po SSG/ISR, CMS, Intake, Kompas, Research i Booking;
9. pitanja koja stvarno blokiraju implementaciju;
10. acceptance test matricu za `en` i `sr-Latn`.

Ne odgovaraj samo opštim planom. Navedi konkretne postojeće fajlove, funkcije i kontradikcije.

## Posle odobrenja plana

Implementiraj redom iz `documentations/i18n/03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md`, u malim
commitovima. Posle svakog slice-a pokreni relevantne testove, ažuriraj TODO i napiši tačno:

- šta je stvarno završeno;
- šta je ostalo;
- da li je nešto demo, feature-flagged ili produkciono;
- da li je vizuelno provereno na desktopu i mobilnom;
- da li oba jezika daju kompletan platformin prikaz.
