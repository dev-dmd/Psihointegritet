# Izvestaj za ChatGPT Work mode — javni website flow

**Datum:** 2026-07-21  
**Repo:** Psihointegritet digitalni centar  
**Svrha:** dati ChatGPT Work mode-u tacan presek: sta je zamisljeno, sta stvarno postoji u kodu, sta nedostaje i sta treba definisati pre sledece implementacije user-flow-a.

---

## 1. Najkraci zakljucak

Projekat trenutno ima vrlo dobar frontend prototip javnog sajta, matching drawer-a, B2B konfiguratora, ankete, superadmin panela i radnog prostora za tim. Medjutim, **glavni website flow iz `MAIN_USER_WEBSITE_FLOW.md` jos nije zakljucan niti implementiran kao ruta-po-ruta korisnicko kretanje**.

Najveca rupa za ovu fazu je:

1. ne postoji centralna ruta `/zakazi` koja prima kontekst iz usluge, terapeuta ili matching-a;
2. ne postoji `/pronadji-podrsku` kao posebna stranica;
3. nema posebnih SEO stranica za pojedinacne usluge, oblasti podrske, roditelje, adolescente, cenovnik, kontakt, pravne strane i hitnu podrsku;
4. backend jos nema prave inquiry/booking domene, tabele ni endpoint-e;
5. nekoliko vaznih proizvodnih odluka je i dalje otvoreno: zvanja terapeuta, pravni tekstovi/krizni disclaimer, kontakt/adrese, maloletnici, radionice, adolescentske/student cene.

Drugim recima: imamo funkcionalan demo i dobar temelj, ali za sledeci korak treba prvo napraviti **precizan IA + CTA + booking-context ugovor**.

---

## 2. Dokumenti koji su uzeti kao osnova

Prvo je procitan `documentations/MAIN_USER_WEBSITE_FLOW.md`. On definise novu ciljnu mapu sajta i pravilo da pocetna samo orijentise, dok svaka vazna namera ima svoju SEO rutu.

Zatim su provereni:

- `documentations/TODO.md` — live status, ali ima par zastarelih redova u odnosu na kod;
- `documentations/CLAUDE_CODE_MASTER_PLAN_v1_0.md` — obavezujuci redosled R0/R1/R2;
- `documentations/ARCHITECTURAL_RULES_REVISED.md` — frontend/backend granice;
- `documentations/PRODUCT_DECISIONS.md` — najnovije odluke D-025/D-026/D-027;
- `documentations/OPEN_DECISIONS.md` — otvorene blokade;
- `documentations/PSIHOINTEGRITET_INTAKE_MATCHING_ENGINE_v0.1.md`;
- `documentations/CONTROL_CENTER_PLAN_v1_0.md`;
- `documentations/SUPERADMIN_CONTROL_CENTER_PLAN_v1_0.md`;
- stvarni kod u `frontend/src/app`, `frontend/src/features`, `frontend/src/content` i `backend/src/psihointegritet`.

---

## 3. Zamisao projekta i arhitektura

### Produkt zamisao

Psihointegritet treba da bude javni digitalni centar, ne samo prezentacioni sajt. Korisnik treba da moze:

- da brzo razume koje vrste podrske postoje;
- da vidi terapeute, cene, trajanje, format i lokacije bez slanja mejla;
- da krene iz tri stanja: "ne znam sta mi treba", "znam uslugu", "znam terapeuta";
- da dobije vodjeni izbor bez email barijere;
- da posalje zahtev za termin, pri cemu zahtev nije automatska potvrda;
- da kompanija prodje B2B konfigurator i posalje strukturisan upit.

Glavna ideja iz `MAIN_USER_WEBSITE_FLOW.md`:

```text
Pocetna -> orijentacija
Detaljne stranice -> objasnjenje i SEO
Booking -> pamti prethodni kontekst
```

### Tehnicka arhitektura

- `frontend/`: Next.js 16, React 19, Tailwind 4, Clerk, Resend demo route handlers, Playwright/Vitest.
- `backend/`: FastAPI modularni monolit, SQLAlchemy async, Alembic, PostgreSQL, Redis, Railway.
- `documentations/`: arhitektura, planovi, odluke, status.

Vazno arhitektonsko pravilo: **business CRUD pripada FastAPI backend-u**. Next Route Handlers u `frontend/src/app/api` trenutno postoje kao svesno dokumentovan demo izuzetak za anketu, B2B upit i demo booking email. Za produkciju se to mora premestiti u backend module `inquiries`, `notifications` i kasnije `booking`.

---

## 4. Sta je stvarno uradjeno

### 4.1 Javne stranice koje postoje

Postoje sledece javne rute:

| Ruta | Stvarno stanje |
|---|---|
| `/` | Homepage sa 11 sekcija: hero, trust strip, razlozi, support paths, terapeuti, usluge, prvi korak, radionice teaser, resursi, FAQ, final CTA |
| `/tim` | Tim stranica |
| `/tim/[slug]` | 3 SSG profila: `anja-stamenkovic`, `marija-stamenkovic`, `marjan-jankovic` |
| `/usluge` | Katalog usluga, paketi individualnog rada, grupni programi, ostale oblasti podrske |
| `/znanje` | Resource/knowledge najava, "u pripremi" |
| `/rad-sa-kompanijama` | B2B stranica sa CTA za konfigurator |

Postoje i auth/panel rute:

| Ruta | Stvarno stanje |
|---|---|
| `/prijava`, `/registracija` | Clerk auth |
| `/nalog`, `/nalog/termini`, `/nalog/podesavanja` | Client skeleton |
| `/radni-prostor/*` | Control Center preview, role-based, read-only/mock |
| `/superadmin/*` | Superadmin preview, role-based, read-only/mock |

### 4.2 Stranice iz novog flow dokumenta koje ne postoje

Nedostaju:

- `/pronadji-podrsku`;
- `/usluge/[slug]`;
- `/podrska-roditeljima`;
- `/podrska-adolescentima`;
- `/oblasti-podrske`;
- `/oblasti-podrske/[slug]`;
- `/radionice`;
- `/radionice/[slug]`;
- `/cene`;
- `/o-nama`;
- `/zakazi`;
- `/kontakt`;
- `/hitna-podrska`;
- `/pravne/privatnost`;
- `/pravne/uslovi-koriscenja`;
- `/pravne/kolacici`;
- `/pravne/pravila-zakazivanja`.

Napomena: master plan ranije pominje ravne pravne rute `/privatnost`, `/uslovi`, `/kolacici`, `/pravila-zakazivanja`, dok novi flow predlaze `/pravne/*`. To treba eksplicitno odluciti.

### 4.3 Navigacija

Header trenutno koristi:

- `Pronadji podrsku` -> `/#podrska`;
- `Terapeuti` -> `/tim`;
- `Usluge` -> `/usluge`;
- `Radionice` -> `/#radionice`;
- `Znanje i resursi` -> `/znanje`;
- `O nama` -> `/#onama`;
- CTA `Zakazi termin` otvara guidance chooser drawer.

Ovo nije jos ciljna navigacija iz flow dokumenta. Nema dropdown `Podrska`, nema `/cene` u headeru, a nekoliko linkova su jos anchor-i jer prave rute ne postoje.

Footer trenutno nije u skladu sa novim flow-om:

- jos prikazuje `kontakt@psihointegritet.rs`;
- prikazuje samo `Nis · online i uzivo`, bez Leskovca;
- nema pravne linkove;
- nema novu footer podelu: Podrska / Psihointegritet / Informacije / Kontakt;
- ne koristi `info@psihointegritet.com`, iako dokumenti kazu da ne treba koristiti `kontakt@`.

### 4.4 Sadrzaj i katalog usluga

U `frontend/src/content/services.ts` postoji kanonski katalog:

- Individualna psihoterapija — 60 min, 4.000 RSD;
- Bracno savetovanje — 90 min, 5.500 RSD;
- Roditeljsko savetovanje — 60 min, 5.000 RSD.

Postoje i:

- paketi individualnog rada: 5 seansi / 15.000 RSD, 10 seansi / 38.000 RSD;
- grupni programi: 7 programa, uglavnom "Cena ce biti objavljena naknadno"; samo "Tridesete — Vreme promene" ima cenu.

Vazna neuskladjenost: `MAIN_USER_WEBSITE_FLOW.md` jos razmatra "Psihoterapijsko savetovanje" kao posebnu uslugu, ali najnovija odluka D-025 ga je uklonila kao zasebnu cenovnu stavku. Ipak, metadata za `/usluge` ga jos pominje u description-u. To treba ocistiti nakon odluke.

### 4.5 Terapeuti

Postoje 3 profila sa pravim fotografijama:

- Anja Stamenkovic;
- Marija Stamenkovic;
- Marjan Jankovic.

Slugovi su puni SEO slugovi:

- `/tim/anja-stamenkovic`;
- `/tim/marija-stamenkovic`;
- `/tim/marjan-jankovic`.

Blokada: tacna zvanja terapeuta nisu pisano potvrdjena. U kodu su zvanja neutralizovana/genericka, a `OPEN_DECISIONS.md` drzi S1 kao launch blokadu.

### 4.6 Guided selection / matching

Postoji `GuidanceDrawer` i `matching.ts` v2:

- deterministic matching;
- odgovori se ne cuvaju;
- nema prikaza skorova;
- rezultat daje preporucenu uslugu i terapeuta;
- prikazuje razloge obicnim jezikom;
- postoji alternativa;
- postoji "zelim da tim pregleda moj zahtev";
- postoji inline demo booking forma.

Trenutni flow:

```text
CTA "Zakazi termin" -> chooser drawer
Hero/sekcije -> quiz drawer
Rezultat -> Zatrazite termin -> inline forma
```

Sta nije uradjeno:

- nema posebne rute `/pronadji-podrsku`;
- nema URL flow-a `/zakazi?service=...&therapist=...`;
- browser Back i shared URL kontekst nisu reseni kao route-level booking;
- nema backend perzistencije;
- B2B grana iz matching-a je dokumentovana u TODO/provider komentaru, ali u stvarnom kodu trenutno nije povezana kroz `GuidanceDrawer`.

### 4.7 Demo booking

Postoji `BookingRequestForm` i `/api/booking-request`.

Radi:

- ime i email;
- therapist slug ili `null` za ceo tim;
- salje email terapeutu/timu preko Resend;
- salje potvrdu korisniku;
- jasno kaze da zahtev nije potvrda termina;
- moze da prilozi strukturisan sazetak matching odgovora bez internih skorova.

Ne radi kao produkcijski booking:

- nema `/zakazi` rute;
- nema izbora usluge kao nezavisnog polja;
- nema telefona;
- nema preferred date/time osim read-only "dogovara se";
- nema saglasnosti na booking pravila;
- nema baze, statusa, retry/outbox-a, rate limiting-a, honeypot-a;
- nije FastAPI endpoint.

### 4.8 B2B konfigurator

Postoji B2B konfigurator kao drawer otvoren sa `/rad-sa-kompanijama`.

Radi:

- 4 pitanja: broj zaposlenih, ciljevi, teme, format;
- deterministic preporuka modela;
- sve cene su "Cena po ponudi";
- kontakt forma;
- `/api/company-inquiry` salje structured email timu i auto-reply kompaniji.

Ogranicenja:

- nije backend;
- nema perzistenciju;
- nije jos pun B2B prodajni flow iz `MAIN_USER_WEBSITE_FLOW.md`;
- u `companies-page.tsx` komentar jos kaze "No form yet", ali u stvarnosti forma postoji u drawer-u.

### 4.9 Anketa / Research drawer

Postoji floating `?` koji otvara anketu.

Radi:

- 4 pitanja;
- optional komentar;
- `?survey=online-experience` deep link auto-otvara;
- `/api/survey` salje email na `info@psihointegritet.com` ili env override;
- bez baze i bez zdravstvenih podataka.

### 4.10 Superadmin i Control Center

Postoji ozbiljan R2 preview:

- `/superadmin/*`: superadmin panel, protected server-side, mock/read-only;
- `/radni-prostor/*`: staff Control Center, role-based, mock/read-only;
- privremeni izvor rola je Clerk `publicMetadata`;
- pravi izvor rola kasnije mora biti backend `GET /api/v1/me`;
- timski nalozi jos nisu kreirani/dodeljeni u produkciji.

Ovo je korisno za demonstraciju operativnog pravca, ali ne resava javni website flow i produkcijski booking.

### 4.11 Backend

Backend ima dobar temelj:

- `GET /health`;
- `GET /api/v1/health`;
- CORS allowlist;
- problem-details error envelope;
- Alembic harness;
- DB session setup;
- OpenAPI export script;
- prazne module za buduce domene.

Ali nema:

- nijedan pravi domenski model;
- nijednu migraciju u `versions/`;
- `inquiries`;
- `appointment_requests`;
- `email_deliveries`;
- `organizations` seed;
- booking engine;
- notification engine;
- identity `/me`;
- rate limiting;
- production inquiry/appointment endpoints.

---

## 5. Neuskladjenosti koje treba ispraviti ili odluciti

1. **`TODO.md` je delimicno zastareo.** Na primer, pise da nema metadata API-ja, ali javne rute `/tim`, `/tim/[slug]`, `/usluge`, `/znanje`, `/rad-sa-kompanijama` imaju metadata/canonical. Pise i da B2B stranica nema formu, ali konfigurator postoji kao drawer.
2. **Pravne rute nisu usaglasene.** Novi flow predlaze `/pravne/*`; stari master plan pominje ravne `/privatnost`, `/uslovi`, `/kolacici`, `/pravila-zakazivanja`.
3. **`/zakazi` ne postoji.** Trenutno je zakazivanje inline drawer forma, a flow dokument trazi centralnu rutu koja prima kontekst.
4. **`/zakazivanje` se jos pojavljuje u content-u** kao stari link (`clientLink.href`), iako spec trazi `/zakazi`.
5. **B2B iz matching-a nije stvarno povezan.** Provider komentar kaze da matching moze da otvori B2B konfigurator, ali `GuidanceDrawer` trenutno nema `useCompany/openCompany`.
6. **Footer ima pogresan/stari kontakt.** Treba `info@psihointegritet.com`, ne `kontakt@psihointegritet.rs`, i treba dodati Leskovac + pravne linkove.
7. **Terminologija usluga mora biti zakljucana.** D-025 uklanja "Psihoterapijsko savetovanje" kao zasebnu cenovnu stavku, ali novi flow ga jos navodi kao potencijalnu posebnu uslugu.
8. **Cena za adolescente/studente nije zakljucana.** Ne sme se izmisliti.
9. **Pravni i krizni tekstovi nisu potvrdjeni.** Ne sme se pisati kao finalni copy bez pravnika/Anje.
10. **Backend mora preuzeti demo route handlers** pre produkcijskog R1 intake/booking-a.

---

## 6. Sta fali bas za ovu fazu definisanja tacnog user flow-a

Ovo je lista stvari koje treba odluciti u Work mode-u pre pisanja sledeceg koda.

### 6.1 Zakljucati finalnu R1 mapu ruta

Predlog iz `MAIN_USER_WEBSITE_FLOW.md` je dobar, ali treba oznaciti sta je:

- `R1 launch must-have`;
- `R1.5/fast-follow`;
- `R2+`;
- blokirano otvorenom odlukom.

Posebno odluciti:

- da li pravne strane idu pod `/pravne/*` ili ostaju ravne rute;
- da li `/radionice` ide u R1 kao katalog "u pripremi" ili ceka potvrdu prve radionice;
- da li `/hitna-podrska` ide odmah kao bezbednosna stranica ili ceka pravni/strucni copy;
- da li `/podrska-roditeljima` i `/podrska-adolescentima` idu pre `/oblasti-podrske`.

### 6.2 Zakljucati navigaciju i CTA sistem

Treba definisati:

- desktop header;
- mobile menu;
- footer strukturu;
- sticky CTA pravila;
- kada CTA otvara drawer, a kada vodi na rutu;
- kako se ponasa CTA na stranici `/zakazi`.

Predlog:

- Header: `Podrska` dropdown, `Terapeuti`, `Radionice`, `Za kompanije`, `Cene`, CTA `Zakazi termin`.
- Mobile: svi bitni linkovi + sticky `Zakazi termin`.
- Footer: Podrska / Psihointegritet / Informacije / Kontakt.

### 6.3 Definisati booking context contract

Najvazniji proizvodni ugovor:

```text
/zakazi
/zakazi?service=individualna-psihoterapija
/zakazi?therapist=anja-stamenkovic
/zakazi?service=bracno-savetovanje&therapist=anja-stamenkovic
```

Treba odluciti:

- koji su tacni query parametri: `service`, `therapist`, `format`, mozda `source`;
- da li matching rezultat ide u URL ili ostaje samo client memory;
- sta se desava ako je service/therapist kombinacija nevalidna;
- da li korisnik moze da promeni terapeuta/uslugu u formi;
- da li forma u R1 trazi telefon;
- sta je minimalni payload za backend appointment request;
- koje polje nosi saglasnost na booking pravila;
- kako se tekst "ovo nije potvrda termina" prikazuje na svakoj povrsini.

### 6.4 Razdvojiti Service, SupportArea i AudiencePage

Trenutno se u UI mesaju:

- usluga = sta moze da se zakaze;
- oblast podrske = zbog cega korisnik trazi podrsku;
- ciljna grupa = roditelji/adolescenti/kompanije.

Work mode treba da definise model:

```text
Service: individualna, bracno, roditeljsko...
SupportArea: anksioznost, burnout, odnosi, gubitak...
AudiencePage: roditelji, adolescenti...
Program: radionica/grupni program
Therapist: profil + usluge + oblasti + lokacija
```

Bez toga ce se kartice, SEO stranice i booking prefill duplirati i razilaziti.

### 6.5 Definisati sta je minimum za svaku novu javnu stranicu

Za svaku rutu treba dati template:

- H1;
- opis;
- kome je namenjeno;
- cena/trajanje/format ako je booking strana;
- terapeuti;
- FAQ;
- CTA;
- SEO title/description;
- status: aktivno / u pripremi / blokirano.

### 6.6 Backend R1 intake granica

Ako se ide ka produkcijskom flow-u, potrebno je definisati minimum backend-a:

- `POST /api/v1/public/inquiries`;
- `POST /api/v1/public/appointment-requests`;
- tabele `organizations`, `contact_inquiries`, `appointment_requests`, `email_deliveries`;
- Resend email service;
- rate limiting + honeypot;
- zapis da zahtev nije potvrda termina;
- bez logovanja slobodnog zdravstvenog teksta.

---

## 7. Predlozeni prioritet za naredni Work mode

Ne bih odmah trazio "napravi sve stranice". Prvo treba zatvoriti flow dokument kao implementacioni ugovor.

Predlozeni redosled:

1. **Route map odluka:** finalna tabela svih ruta: postojece, dodati sada, kasnije, blokirano.
2. **CTA matrix:** za svaku stranicu i karticu: label, destinacija, prefill context, fallback.
3. **Booking flow spec:** `/zakazi` koraci, query params, editable izbor, validation, success, email/DB payload.
4. **Service/SupportArea taxonomy:** kanonski slugovi i veze usluga-terapeut-oblast.
5. **Header/footer spec:** desktop/mobile/footer final.
6. **Implementation slices:** prvo navigacija + `/pronadji-podrsku` + `/zakazi`, zatim `/usluge/[slug]` i `/cene`, zatim support/audience pages.

---

## 8. Prompt za ChatGPT Work mode

Kopirati sledece u ChatGPT Work mode:

```text
Radimo na projektu Psihointegritet digitalni centar.

Cilj ovog Work mode-a nije odmah kodiranje, nego da zakljucamo tacan javni website user-flow za sledecu implementacionu fazu.

Kontekst:
- Frontend je Next.js 16, backend je FastAPI modularni monolit.
- Javni sajt vec ima: /, /tim, /tim/[slug], /usluge, /znanje, /rad-sa-kompanijama.
- Postoje drawer demo tokovi: guided matching, demo booking email, B2B konfigurator, research anketa.
- Ne postoji centralna /zakazi ruta.
- Ne postoji /pronadji-podrsku kao posebna ruta.
- Ne postoje /usluge/[slug], /cene, /oblasti-podrske, roditelji/adolescenti, kontakt, pravne, hitna-podrska.
- Backend trenutno ima samo health endpoint-e i infrastrukturni temelj; nema inquiries/booking domene.

Obavezna pravila:
- Pocetna stranica sluzi za orijentaciju, ne za kopiranje svih detaljnih stranica.
- Header treba da vodi na prave rute, ne na anchor-e, osim lokalno na homepage.
- Zakazivanje je request-first: zahtev nije potvrda termina.
- Korisnik ne mora da salje mejl da bi saznao cenu, trajanje, format i kome je usluga namenjena.
- Ne izmisljati pravne tekstove, krizni disclaimer, zvanja terapeuta, adolescentske cene, datume radionica ili klinicke tvrdnje.
- Backend je vlasnik produkcijskog inquiry/booking CRUD-a; Next Route Handlers su samo demo izuzetak.
- Koristiti srpski latinicu, ekavicu kao default; Anjin licni bio/citati mogu ostati ijekavica.

Zelim da napravis sledece:

1. Finalnu R1 route map tabelu:
   - ruta
   - svrha
   - korisnicka namera
   - status: postoji / dodati sada / kasnije / blokirano
   - primarni CTA
   - booking context ako postoji
   - otvorene odluke

2. Finalni header, mobile menu i footer:
   - label
   - URL
   - da li je dropdown/anchor/route
   - sta se menja u odnosu na trenutno stanje

3. CTA matrix:
   - homepage sekcije
   - service kartice
   - therapist profili
   - matching rezultat
   - B2B stranica
   - footer
   Za svaki CTA navedi label, destinaciju i query parametre.

4. Spec za /zakazi:
   - URL parametri
   - koraci forme
   - sta je prefilled
   - sta korisnik moze promeniti
   - validation
   - success state
   - email/backend payload
   - obavezna poruka da zahtev nije potvrda termina
   - sta se ne sme cuvati/logovati.

5. Model razdvajanja:
   - Service
   - SupportArea
   - AudiencePage
   - Program
   - Therapist
   - FAQ
   Definisi minimalna polja i relacije za staticki content sada, a backend/CMS kasnije.

6. Implementation order za naredni kod:
   - male, reviewable faze
   - koje fajlove/oblasti dirati
   - koji testovi treba da postoje
   - sta je acceptance za svaku fazu.

Na kraju daj:
- listu blokada za Anju/pravnika/tim;
- listu brzih defekata u trenutnom kodu koje treba popraviti;
- kratak "definition of done" za ovu fazu javnog website flow-a.
```

---

## 9. Brzi defekti koje vredi popraviti posle flow odluke

- `frontend/src/content/homepage.ts` ima `clientLink.href = "/zakazivanje"`; spec trazi `/zakazi`.
- `frontend/src/app/(public)/usluge/page.tsx` metadata pominje "psihoterapijsko savetovanje", iako je D-025 uklonio tu uslugu kao zasebnu cenovnu stavku.
- `frontend/src/components/sections/site-footer.tsx` ima stari email `kontakt@psihointegritet.rs` i ne pominje Leskovac.
- `frontend/src/components/sections/site-footer.tsx` nema pravne linkove.
- `frontend/src/features/company/company-context.tsx` komentar kaze da matching drawer otvara B2B, ali stvarni `GuidanceDrawer` to ne radi.
- `frontend/src/components/sections/companies/companies-page.tsx` komentar kaze "No form yet", ali konfigurator forma postoji u drawer-u.
- `backend/src/psihointegritet/db/migrations/versions/` ne postoji kao trackovana migraciona istorija; deploy sa `alembic upgrade head` je rizik na fresh clone-u.

---

## 10. Verifikacija uradjena tokom ovog izvestaja

Pokrenuto lokalno:

```text
frontend: npm run test -> 12 test fajlova, 82 testa prosla
backend: uv run pytest -> 5 testova proslo
```

Nisu pokretani full build, lint, format check ni Playwright e2e tokom ove analize.
