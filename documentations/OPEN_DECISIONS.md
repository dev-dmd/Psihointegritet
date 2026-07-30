# OPEN DECISIONS — Psihointegritet

Otvorene odluke. **Doneto ide u `PRODUCT_DECISIONS.md`** i briše se odavde.

**Gde piše:** master plan §13 (STOP lista) · §4 R0.1 · Proposal v1.1 §4 (Anjina lista)
**Pravilo (MP §0, tačka 5):** ako se udari u otvorenu stavku — **stati i pitati**. Ne pogađati proizvodne, pravne, cenovne ni kliničke odluke.

**Stanje 2026-07-26:** S1 rešen (D-042 — sva tri terapeuta su sertifikovana); S2/S13 rešeni. **S5 i S10 više ne blokiraju launch** (D-038): postojeći tekst je fallback, a tim ih dovršava kroz CMS. Content governance je zaključan kroz D-028…D-033; Booking arhitektonske invarijante kroz D-034…D-037, a BDS-007B/008/009B/010B su usvojeni kao konfigurabilni default-i (D-040). Pre-R2 tehničke i poslovne odluke koje stvarno ostaju otvorene vode se u `PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.1.md`.

## Zaključano van ovog registra

Sledeće više nisu otvorene dileme i ne treba ih ponovo uvoditi ovde: R1.4.i granica, petostepeni publication lifecycle, `request | slot_request | disabled`, zabrana `live`, R2/R5 finansijska granica, CI-only Content Health, approval capabilities, BDS-007A atomic contention hold, offer-scoped BookingMode, odvajanje `SlotHold`/`AppointmentRequest`/`Appointment` i `reschedule` kao zaseban zahtev. Izvor su D-028…D-037. Stvarni otvoreni Booking detalji ostaju BDS-002…BDS-006, BDS-007B, BDS-008, BDS-009B, BDS-010B, BDS-011/BDS-012, S4, S5, S7 i S12.

---

## 🟡 Ne blokira launch — vlasnik sadržaja dovršava kroz CMS

> **Promena 2026-07-26 (D-038):** ova sekcija je ranije nosila naslov „Blokira produkcijski launch". S5 i S10 su prebačeni ovde: postojeći tekst u repou je fallback koji se ne briše, a Anja i tim ga menjaju kroz CMS u admin panelu. Stavke ostaju u registru jer i dalje traže vlasnikovu akciju — samo više ne drže launch.
>
> **O-01 · S1 je zatvoren** i premešten u `PRODUCT_DECISIONS.md` kao **D-042**: sva tri terapeuta su sertifikovana, „pod supervizijom" se ne vraća ni za koga. Ostaje otvoreno samo izdavalac sertifikata i godina — podatak se ne prikazuje dok ga terapeut ne dostavi.

### O-03 · S5 — Pravni tekstovi i krizni disclaimer

> **Gde piše:** MP §13 S5 · MP §1 T11 · Proposal §4 #5 · **Blokira:** pravne stranice (R1.1), launch (R1.5)

**Pravac je definisan (D-008), pravna potvrda nije.** Ostaje tri stvari:

| #   | Otvoreno                                      | Zašto                                                                                                                                                                                                             |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Provera APR registracije po terapeutu**     | D-008 tvrdi da su terapeuti „samostalni preduzetnici registrovani u APR". To je **činjenična tvrdnja u pravnom tekstu** — ako neko od troje nije registrovan, tekst je neistinit. Proveriti za svakog, pre objave |
| 2   | **Krizni disclaimer (T11) nedostaje**         | MP T11: platforma **nije hitni/krizni servis**; tačna formulacija + lokalni resursi traže stručnu i pravnu potvrdu. D-008 ovo ne pokriva. Ovo je bezbednosna stavka, ne formalnost                                |
| 3   | **Da li je klauzula o odgovornosti izvršiva** | „Platforma nije odgovorna, terapeuti preuzimaju odgovornost" — pitanje za pravnika (potrošačko pravo, zdravstvene usluge). Mi je ne smemo formulisati (MP §0, tačka 8: _nikad ne izmišljati pravni tekst_)        |

**Četiri stranice:** `/privatnost` · `/uslovi` · `/kolacici` · `/pravila-zakazivanja`
**Dok ne stigne:** stranice postoje kao placeholderi „u pripremi — pravna potvrda" (MP §5 R1.1).

---

### O-06 · S10b — Kontakt podaci

> **Gde piše:** MP §13 S10 · Proposal §4 #3 · **Blokira:** `/kontakt`, Resend, JSON-LD, R1.5

**Rešeno (D-007):** struktura footera, brzi linkovi, **postojeći logo**.
**Delimično rešeno (D-016, 2026-07-18):** email adrese kreirane — po jedna za svakog od troje u timu, plus `info@psihointegritet.com`; Resend šalje sistemske/verifikacione mejlove sa `noreply@`. **Nijedna još nije upisana u kod ni u `.env.example`.**

**I dalje otvoreno:**

| #   | Potrebno                                                                                  | Blokira                                                  |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1a  | Da li `termini@` postoji kao posebna adresa za zahteve za termin, ili sve ide na `info@`? | R1.3.i — koja adresa prima obaveštenja o novim zahtevima |
| 1b  | Upisati kreirane adrese u `.env.example` (FE i BE) i povezati u kod                       | R1.3.i                                                   |
| 2   | Telefon                                                                                   | `/kontakt`, footer                                       |
| 3   | Linkovi ka društvenim mrežama                                                             | Footer                                                   |
| 4   | Adrese lokacija (Niš, Leskovac)                                                           | JSON-LD `LocalBusiness` (R1.4.d), `/o-nama`              |

---

### ~~O-07 · Autentične fotografije terapeuta~~ — ✅ REŠENO 2026-07-17 (D-009)

Prave fotografije stigle u dizajn handoff-u i ugrađene u `public/images/therapists/`. Tri stock portreta obrisana iz repoa.

---

## 🟠 Blokira pojedine funkcije

### O-02 · S2b — Tekst o lokacijama

> **Gde piše:** MP §13 S2 · Proposal §4 #2 · **Blokira:** `/o-nama`, adrese na profilima

**Rešeno (D-006):** ime — **Marjan Janković**, slug `marjan-jankovic`.
**Otvoreno:** konačan tekst o lokacijama. Poznato iz T8: Anja — Niš; Marija — Leskovac; Marjan — Leskovac. Nedostaju **adrese i formulacija** (kabinet? koji grad se prikazuje na profilu? rade li i online i uživo na obe lokacije?).

### O-04 · S11 — Pregled pitanja vođenog izbora

> **Gde piše:** MP §13 S11 · Proposal §4 #6 · **Blokira:** sign-off R1.2

Tim treba da pregleda upitnik (trenutni kviz je nacrt): 5 koraka, `features/guidance/quiz.ts`. Bez dijagnostike, bez čuvanja odgovora (T13). Uz to R1.2.d traži **„zašto je prikazano"** po preporuci — sada postoji samo jedna generička rečenica.

### O-05 · S6 — Prva radionica

> **Gde piše:** MP §13 S6 · Proposal §4 #10 · **Blokira:** objavu radionice sa prijavom

Datum, voditelj, cena, kapacitet, pravila prijave/otkazivanja. Dok ne stigne: `/radionice` je **informativna + „Prijavite interesovanje"**, bez datuma i bez prijave.

---

## 🟠 Matching Engine — potvrda tima (blokira sign-off R1.2, ne launch)

> **Gde piše:** spec „Početna routing matrica" · MP §13 S11 · **Blokira:** R1.2.j sign-off
> Engine je hardcoded v1 (`matching.ts`) sa konzervativnim pravilima. Tim treba da potvrdi ili ispravi:

### O-14 · Routing matrica po terapeutu _(ažurirano 2026-07-20, matching v2 / D-025)_

- ✅ **Uzrasne granice — POTVRĐENO od Anje (2026-07-20):** Marija radi sa svim uzrastima dece (0–18 i 18+); Anja i Marjan samo sa decom **16+**. Implementirano u `matching.ts` (`minChildAge`: Marija 0, Anja/Marjan 16); uzrasni bracket „13–17" podeljen na „13–15" / „16–17" da bi granica bila precizna. Maloletnici (<18) i dalje uz roditelja/staratelja (MINOR_NOTE).
- Oblasti rada po terapeutu — potvrditi listu iz `matching.ts` `therapistMatchingConfig` (preneta 1:1 iz Anjinog dokumenta)

### O-15 · Operativna pravila (za Pre-R2 Booking Decision Spec, utiču i na v1 tekst)

- Maksimalan broj novih klijenata po terapeutu (kapacitet) — sada nema ograničenja
- Koje složenije situacije zahtevaju ljudski pregled pre prikazivanja rezultata (sada: samo „oporavak nakon nasilja/kriznog iskustva" → tim)
- Ko može da preuzme nedodeljeni zahtev iz zajedničkog reda
- Formulacija sigurnosnog izlaza (nije dijagnoza / nije hitna služba) — **vezano za S5**, čeka pravnu i stručnu potvrdu

### O-16 · Preciziranja iz Anjinih odgovora (matching v2 / cenovnik, D-025)

- ✅ **„Tridesete — Vreme promene", roditelji — POTVRĐENO (2026-07-20):** cena od 3.500 RSD je **po susretu, ne po roditelju** — oba roditelja/staratelji dolaze zajedno po ceni jednog učesnika (mama + tata = 3.500, ne 2×3.500). Napomena ažurirana na sajtu (`services.ts` `groupPrograms` „tridesete" `note`).
- **Burnout: „Marjan +2 ako je vezano za zaposlenje ili kompanijski program"** — izostavljeno iz bodovanja (CTO 2026-07-20) jer upitnik nema signal o zaposlenju. **Precizirati sa Anjom** kako se uslov prepoznaje (novo pitanje? B2B kontekst?).
- ✅ Uzrasne granice po terapeutu — potvrđeno, vidi O-14.

### O-19 · Uzrasno i lokacijsko pitanje nisu u Anjinom upitniku _(za Anju i tim)_

Anjin dokument (`odgovor-za-matching-anketa.pdf`) ima **tačno 5 pitanja** — nema pitanja o uzrastu deteta ni o lokaciji (Niš/Leskovac). Oba su CTO dodatak iz v2 spec-a („5 pitanja + 2 uslovna"). Uzrasno pitanje se u kodu okida **samo za izbor „Roditelj i dete" (Pitanje 2)**, ne za razlog „Roditeljstvo"/„Odnos sa adolescentom" (Pitanje 1). Posledica: ako roditelj traži savetovanje **sam** za temu deteta, uzrast se ne pita i uzrasno pravilo (O-14) se ne primenjuje. **Odluka odložena — Anja i tim da prokomentarišu** da li ostaviti tako (A: uzrast samo kad dete učestvuje), proširiti (B: pitati uzrast i za te razloge), ili ukloniti uzrast/lokaciju i vratiti se na 5 pitanja (C). Do tada ostaje varijanta A.

### O-17 · Clerk nalozi za tim (superadmin faza, D-026) — ✅ REŠEN za dev instancu (2026-07-29)

Sve troje sad imaju Clerk nalog na `development` instanci (Marjan se registrovao poslednji, 2026-07-29). Obe strane zatvorene:
- **Backend:** `provision_staff.py --person <ime>` provisioning-ovan za sve troje na `features`/`staging` (`org_admin`+`therapist`, `roster.py` ima sva tri ID-a).
- **Frontend:** `npm run roles:assign` pokrenut (`set -a; . ./.env.local; set +a; npm run roles:assign`) — Clerk publicMetadata dodeljena, potvrđeno da Marjan ima role na Clerk-u.

Ostaje samo **O-18** — ništa od ovoga nije urađeno na produkcionoj Clerk instanci (nalozi ni role).

### O-18 · Dodela rola na produkcionoj Clerk instanci

Role su dodeljene samo na **dev** instanci (2026-07-20: `drazic.milan@gmail.com` → superadmin). Pri launchu obavezno pokrenuti `roles:assign` sa produkcionim `CLERK_SECRET_KEY` (i kreirati `milan.drazic@dmdevelon.website` nalog).

### O-20 · LGBTQIA+ podrška kao javna oblast i terapeutska capability _(novo 2026-07-23, iz `content-architecture.md` / `PRODUCT_CONTEXT.md` v0.3)_

> **Blokira:** objavu LGBTQIA+ javnog hub-a/sekcije i prikaz capability oznake na profilu terapeuta; ne blokira launch — Intake/Matching ne-diskriminatorno ponašanje (PRODUCTION_INTAKE §2.1) ne zavisi od ovoga.

Psihointegritet želi eksplicitno da prikaže da prima LGBTQIA+ osobe bez stigme, kao ravnopravnu javnu oblast/cross-cutting kontekst (ne posebna usluga ili cena). Otvoreno za Anju i tim:

1. Koji terapeut javno potvrđuje LGBTQIA+ profesionalnu capability oznaku na svom profilu (nijedan capability se ne prikazuje bez eksplicitne potvrde terapeuta).
2. Da li se pravi zaseban javni hub/sekcija za LGBTQIA+ podršku odmah u R1.1, ili samo kao peti+ podnaslov u okviru postojećih pet oblasti podrške.
3. Tačan javni tekst (poruka o inkluzivnosti na landing stranici, opciono neutralno pitanje „Kako želite da vam se obraćamo?" u Intake-u — da li se uopšte uvodi u R1).

**Dok ne stigne:** ne prikazivati LGBTQIA+ kao capability ni kod jednog terapeuta i ne objavljivati zaseban hub; ne-diskriminatorna pravila (nema obaveznog pitanja o orijentaciji/rodnom identitetu, ista cena/status) već važe kao opšti proizvodni princip bez obzira na ovu odluku.

---

### O-21 · Kompas — obim, vlasnik i granice novog proizvoda _(novo 2026-07-26)_

> **Gde piše:** PRODUCT_CONTEXT v0.3 §11.5 · content-architecture.md §6 · **Blokira:** bilo kakav Kompas kod ili javnu najavu sa funkcijom

**Šta znamo:** CTO je 2026-07-26 potvrdio da je Kompas **novi, zaseban proizvod** — nije novo ime za postojeći Vođeni izbor / Intake & Matching tok. U dokumentaciji postoji samo kao stavka access-tier liste („osnovni Kompas" u besplatnom sloju; „napredni Kompas" kao U pripremi). Integracija sa Content/Programs/Booking engine-ima dolazi **tek kada Booking ugovor bude stabilan** (posle R2).

**Traži se od CTO/tima:**

1. ~~Definicija proizvoda: šta Kompas radi, za koga, čime se razlikuje od Vođenog izbora~~ → **napredak 2026-07-29, vidi ispod**
2. Granica osnovni vs napredni tier
3. Vlasnik, release (R-mapa) i odnos prema Engines arhitekturi (novi engine ili deo postojećeg)

> **Napredak 2026-07-29 (CTO).** Kompas je **discovery i recommendation sloj iznad istog kataloga sadržaja** — ne novi katalog. Prvi izbor korisnika: „Želim stručnu podršku" · „Želim da razumem šta mi se dešava" · „Tražim koristan sadržaj" · „Tražim podršku za roditeljstvo" · „Tražim podršku za odnos" · „Tražim sadržaj za kompaniju ili tim". Grana **informacije** pretražuje članke, video, PDF vodiče, preporuke knjiga, programe i radionice; grana **stručna podrška** vodi na usluge, terapeute, način rada i prelazak na zahtev za termin. Zakazivanje ostaje globalno dostupno ali ne agresivno — sekundarni CTA na stručnom sadržaju („Potrebna vam je stručna podrška?") i povratak iz booking toka na sadržaj („Još nisam spreman da zakažem — želim prvo da pogledam materijale").
>
> **Time je tačka 1 suštinski odgovorena, ali O-21 ostaje otvoren** na tačkama 2 i 3, i na jednoj novoj: Kompas pretpostavlja **zajedničku taksonomiju** preko svih tipova sadržaja (`audience`, `topics`, `goals`, `contentType`, `supportLevel`, `ageGroup`, `format`, `accessLevel`, `estimatedTime`, `relatedServices`, `relatedTherapists`) — a to je zasebna otvorena stavka, **O-24**. Bez nje Kompas nema po čemu da pretražuje.

**Dok ne stigne:** nikakav placeholder kod, ruta, model ni javna najava sa rokom (anti-placeholder pravila iz master plana §3 i PRODUCT_CONTEXT §11.5). Pominjanje u access-tier listi ostaje kakvo jeste.

---

### O-23 · „Dnevna soba" — obim i granice novog klijentskog prostora _(novo 2026-07-29)_

> **Gde piše:** nigde — **0 pogodaka u celom repou**. **Blokira:** bilo kakav kod, model ili ruta za Dnevnu sobu

**Šta znamo:** CTO je 2026-07-29 opisao Dnevnu sobu kao lični prostor korisnika sa: Sačuvano · Nastavi čitanje/gledanje · Moje kupovine · Moja pretplata · Preporučeno · Moji termini · privatne kolekcije. Predložen početni model `SavedItem { userId, contentId, listType, progress, savedAt, lastOpenedAt }`, uz izričitu nameru da se **ne** pravi slobodan „my space" sa drag-and-drop organizacijom dok se ne proveri da li ljudi uopšte čuvaju sadržaj i vraćaju mu se.

**Zašto je ovo otvorena stavka a ne zadatak:** Dnevna soba je **nova produktna površina koju nijedan dokument ne opisuje**. Najbliži postojeći pojmovi su „lični prostor" i „članski deo", oba pomenuta samo kao *okidač za registraciju* odnosno stavka u „U pripremi" listi, uz izričito pravilo da ta oznaka „ne aktivira praznu funkcionalnost". Po istoj logici po kojoj je Kompas dobio O-21, i ovo traži odluku pre koda.

**Uz to, tri od sedam sekcija su već blokirane drugim kapijama:**

| Sekcija | Stanje |
|---|---|
| „Sačuvano", „Nastavi čitanje", „Preporučeno", privatne kolekcije | Traže katalog sadržaja iz kog se čuva — dakle posle ADR-019 (članci) i O-24 (taksonomija) |
| **„Moje kupovine", „Moja pretplata"** | 🚫 **D-031 / BDS-014 / `PUB-003`** — finansijski domen je R5 |
| **„Moji termini"** | 🚫 **R2 Booking Engine** — ne postoji |

**Traži se od CTO:**

1. Da li je Dnevna soba zaseban proizvod (kao Kompas) ili deo klijentskog panela iz R2 M2.4
2. Vlasnik i release
3. Da li v1 sme da bude samo „Sačuvano" + „Nastavi čitanje" — jedini deo koji ne udara ni u jednu kapiju

**Dok ne stigne:** bez modela, rute i placeholder koda. `SavedItem` se ne piše dok ne postoji katalog iz kog se čuva — inače je to tabela sa stranim ključem ka tipu sadržaja koji još ne postoji.

---

### O-24 · Zajednička taksonomija sadržaja — unifikacija pre proširenja _(novo 2026-07-29)_

> **Gde piše:** `CONTENT_MODEL_MATRIX_v0.1.md` §8 · `content-architecture.md` §6 · **Blokira:** Kompas (O-21), filtriranje kataloga, Dnevnu sobu (O-23)

**Problem 1 — tražene ose nisu u dozvoljenoj listi.** CTO traži `audience`, `topics`, `goals`, `contentType`, `supportLevel`, `ageGroup`, `format`, `accessLevel`, `estimatedTime`, `relatedServices`, `relatedTherapists`. `CONTENT_MODEL_MATRIX_v0.1.md` §8 je iscrpna dozvola šta R3 CMS sme da doda modelu — `revisionId`, `createdBy`, `updatedBy`, `publishedAt`, audit i scheduling polja — i izričito kaže da se javni field name-ovi, CTA registry, template registry i ograničenja **ne smeju menjati bez nove produktne odluke**. Nijedna tražena osa nije na toj listi. Uz to `contentType` **već postoji kao javno ime polja** (`ContentBase.type: ContentType`) i ne sme dobiti drugo značenje.

**Problem 2 — postojeća taksonomija je učetvorostručena i već je driftovala.** Isti pojam `areas` postoji na četiri mesta:

| Gde | Oblik | Primer |
|---|---|---|
| `frontend/src/content/therapists.ts` | prikazni tekst, veliko slovo | `"Anksioznost i depresija"` |
| `frontend/src/features/guidance/matching.ts` | matching predikat, malo slovo | `"anksioznost"` |
| `backend/.../modules/guidance/matching.py` | isto, druga kopija | `"anksioznost"` |
| `therapist_matching_profiles.areas` (JSON kolona) | seedovano migracijom `20260722_0001` | isto |

⚠️ **Drift je već nastupio:** `matching.py:160` nosi `"zavisnost"` u Anjinim `areas`, a frontend nema **nijedan** pogodak na tu reč. Migracija `20260722_0001:478` ju je upisala i u bazu. Trenutno je bezopasno samo zato što nijedan `REASON_AREAS` ključ ne mapira na nju. **Za matching ne postoji parity fixture** — `contracts/fixtures/` sadrži samo `legal-publication.v1.json`.

**Traži se:**

1. **Od tima/Anje:** mapiranje prikaznih čipova na stabilne ID-jeve. Mapiranje sme biti **više-na-jedan** — `"Anksioznost i depresija"` je jedan čip koji stoji za dve matching teme, i to je jedini način da preživi bez vidljive izmene teksta. **Ovo nije refaktor:** re-keying menja rečenice razloga koje korisnik vidi u rezultatu vođenog izbora, a te su pod D-025 (najviše 3, običan jezik, bez skorova).
2. **Od Anje, činjenično:** da li `"zavisnost"` treba da bude u Anjinim oblastima? Ona nosi `addiction_related_support` u `serviceCapabilities` na obe strane, ali `"zavisnost"` u `areas` samo na Python strani. Jedno od to dvoje je greška.
3. **Od CTO:** da li se nove ose uopšte uvode sada. Danas imamo šest terapeuta, devet usluga i nijedan članak — nema kolekcije dovoljno velike da traži filtriranje.

**Dok ne stigne:** ne dodavati nijednu novu osu. Prvo unifikacija `areas` u kontrolisani rečnik sa `contracts/fixtures/taxonomy.v1.json` koji čitaju obe strane — bez toga bi svaka nova osa bila **peta** kopija, a postojeće tri nemaju nikakvu zaštitu od drifta.

---

### O-22 · Web push — pravilo o sadržaju notifikacije _(novo 2026-07-29)_

> **Gde piše:** MP §11 (privatnost) · MP §6.2 M2.5 (koji poznaje samo email) · **Blokira:** slanje bilo koje push notifikacije; ne blokira launch

**Šta znamo:** VAPID ključni par je postavljen 2026-07-29 uz DNS/SSL rad. Infrastruktura, dakle, postoji — ali push notifikacije **nisu opisane ni u jednom obavezujućem dokumentu** i nikad nisu prošle kroz proizvodnu odluku.

**Zašto ovo nije implementaciona sitnica:** push se pojavljuje na **zaključanom ekranu**, vidljiv svakome ko pogleda telefon. Notifikacija „Vaš termin kod Anje Stamenković sutra u 17h" otkriva **podatak o lečenju** — kategoriju podataka koju MP §11 tretira kao najosetljiviju. Isti tekst je bezopasan u mejlu iza lozinke i štetan na zaključanom ekranu.

**Traži se od CTO (uz pravni pogled kad stigne O-03):**

1. **Pravilo o payload-u.** Predlog: nikad ime terapeuta, nikad naziv usluge, nikad klinički sadržaj u vidljivom tekstu — samo neutralno („Podsetnik na zakazani termin") + deep link koji traži prijavu. Detalj se čita tek u aplikaciji.
2. **Koji događaji uopšte idu na push** naspram onih koji ostaju samo email (podsetnik na termin, promena termina, odgovor tima na zahtev).
3. **Saglasnost i opt-out** — push je zaseban pristanak, ne izvodi se iz pristanka na email; gde se povlači.
4. Da li push uopšte ulazi u R2 M2.5 ili je zaseban milestone.

**Dok ne stigne:** ključevi stoje u env-u, **ne šalje se nijedna notifikacija**, nema `web-push` zavisnosti ni service worker registracije za push. Bez koda unapred (MP §3).

---

## 🟡 Pre Faze 2

### O-08 · S7 — Pravila otkazivanja

> **Gde piše:** MP §13 S7 · Proposal §4 #7 · **Blokira:** seed `cancellation_policies` (M2.3)

Nacrt iz materijala: otkazivanje 24 h ranije; kasnije se naplaćuje; kašnjenje skraćuje termin. Treba **potvrda** — ovo se seeduje u bazu i ulazi u pravnu stranicu.

### O-09 · S3 — Cena za adolescente/studente

> **Gde piše:** MP §13 S3 · Proposal §4 #4 · **Blokira:** proširenje prikaza cena

Iznos, kriterijumi, kod kojih terapeuta, online/uživo. Važeće cene (D-025, Anjini odgovori 2026-07-18): individualna 60 min — 4.000 RSD; bračno savetovanje 90 min — 5.500 RSD; roditeljsko savetovanje 60 min — 5.000 RSD („psihoterapijsko savetovanje" uklonjeno iz kataloga). Sajt **mora** reći da su okvirne.

### O-10 · S12 — Google Calendar

> **Gde piše:** MP §13 S12 · Proposal §4 #8 · **Blokira:** M2.6 (paket 2B)

Koji kalendar po terapeutu, koji scope-ovi. Free/busy only, nikad naslovi (T15).

---

## ⚪ Kasnije

| ID        | Odluka                                         | Gde piše                   | Blokira                                |
| --------- | ---------------------------------------------- | -------------------------- | -------------------------------------- |
| O-11 · S4 | Model saglasnosti/zaštite za adolescente       | MP §13 S4 · T10            | Self-service za maloletnike (posle R2) |
| O-12 · S8 | Ko prima uplate i izdaje račune                | MP §13 S8 · Proposal §4 #9 | R5; izričito van R2 (D-031)            |
| O-13 · S9 | Provajder meeting linkova + rezervna procedura | MP §13 S9                  | R5                                     |

---

## Rezime za Anju

**Bez ovoga nema launcha:** ništa — launch više ne čeka nijednu stavku iz ovog registra (D-038, D-042).

**Prvo posle launcha, kroz CMS u admin panelu:**

1. **Tekstovi saglasnosti** — obaveštenje o obradi podataka i potvrda da zahtev nije termin. Dok nisu objavljeni, Intake ostaje zatvoren za slanje (D-039, ADR-014)
2. **Kontakt** — email, telefon, mreže, adrese lokacija (O-06)
3. **Pravni tekstovi** — pravnik + krizni disclaimer + provera APR statusa (O-03)
4. **Sertifikati** — izdavalac i godina po terapeutu; zvanja su potvrđena (D-042), sertifikat kao podatak nije

**Uskoro:** tekst o lokacijama (O-02) · pregled upitnika (O-04) · prva radionica (O-05)
**Pre Faze 2:** pravila otkazivanja (O-08) · cena za studente (O-09) · Google kalendari (O-10)

**Traži Anjinu potvrdu pre CMS taksonomije (O-24):** mapiranje prikaznih oblasti na stabilne ID-jeve — menja rečenice razloga u vođenom izboru, pa nije tehnička odluka · i jedno činjenično pitanje: da li „zavisnost" pripada Anjinim oblastima rada (danas stoji u bazi i na backendu, ali ne i na sajtu)
