# OPEN DECISIONS — Psihointegritet

Otvorene odluke. **Doneto ide u `PRODUCT_DECISIONS.md`** i briše se odavde.

**Gde piše:** master plan §13 (STOP lista) · §4 R0.1 · Proposal v1.1 §4 (Anjina lista)
**Pravilo (MP §0, tačka 5):** ako se udari u otvorenu stavku — **stati i pitati**. Ne pogađati proizvodne, pravne, cenovne ni kliničke odluke.

**Stanje 2026-07-17:** S2/S13 rešeni, S5/S10 parcijalni, S1 otvoren + nove stavke Matching Engine-a (O-14/O-15) za potvrdu tima.

---

## 🔴 Blokira produkcijski launch

### O-01 · S1 — Tačno stručno zvanje svakog terapeuta
> **Gde piše:** MP §13 S1 · MP §1 T3 · Proposal §4 #1 · **Blokira:** objavu profila, R1.5, R0.2.d, R0.2.f, `/tim/[slug]`

**Traži se:** pisana potvrda **tačne formulacije zvanja za svakog od troje**.

**Zašto još stoji:** kontradikcija nije razrešena. Anja poručuje da su sve troje sertifikovani, ali:
- **Marjanova nova biografija i dalje sadrži „pod supervizijom"** (MP T3)
- U kodu **sva tri terapeuta** nose „pod supervizijom": [`homepage.ts:187`](../frontend/src/content/homepage.ts) („Socijalni radnik i geštalt psihoterapeutkinja pod supervizijom"), `:205` („Pedagog i geštalt psihoterapeutkinja pod supervizijom"), `:217` („Psiholog i geštalt psihoterapeut pod supervizijom")

**Potrebno po terapeutu (Anja, Marija, Marjan):**
1. Tačna formulacija zvanja za javnu objavu
2. Da li „pod supervizijom" stoji ili ne — **za svakog posebno**
3. Ko izdaje sertifikat, godina (ako ide u `therapist_credentials`)

**Dok ne stigne:** zvanja se drže **generički** — „geštalt psihoterapeutkinja" / „geštalt psihoterapeut", `content_status: draft`, bez sertifikata (MP §4 R0.2). To dopušta da se `/tim` i `/tim/[slug]` naprave, ali **ne i objave**.

> ℹ️ *Napomena 2026-07-17: na ovo pitanje je stigao odgovor „samo ekavica", što je jezička odluka (zabeležena kao D-001), ne odgovor na S1. S1 ostaje otvoren.*

**Stanje u kodu (2026-07-17):** `/tim` i `/tim/[slug]` su napravljeni. Zvanja su spuštena na generička u `content/therapists.ts`:

| Terapeut | Handoff je tvrdio | Objavljeno sada (`draft`) |
|---|---|---|
| Anja | „Socijalni radnik i geštalt psihoterapeutkinja **pod supervizijom**" | „Osnivačica Psihointegriteta · Socijalni radnik i geštalt psihoterapeutkinja" |
| Marija | „Pedagog i geštalt psihoterapeutkinja **pod supervizijom**" | „Pedagog i geštalt psihoterapeutkinja" |
| Marjan | „Psiholog i geštalt psihoterapeut **pod supervizijom**" | „Psiholog i geštalt psihoterapeut" |

⚠️ **Uz to je izmenjena Marjanova biografija.** Njegova prva rečenica doslovno glasi: *„Ja sam Marjan Janković, psiholog i geštalt psihoterapeut **pod supervizijom**, posvećen…"*. Fraza je uklonjena po MP §4 R0.2 („remove/neutralize any unconfirmed credential strings from staging copy"). To je **jedina izmena sadržaja u bilo čijoj biografiji** osim ekavice — i **vraća se u jednoj liniji** ako Anja potvrdi da „pod supervizijom" ipak stoji za njega.

---

### O-03 · S5 — Pravni tekstovi i krizni disclaimer
> **Gde piše:** MP §13 S5 · MP §1 T11 · Proposal §4 #5 · **Blokira:** pravne stranice (R1.1), launch (R1.5)

**Pravac je definisan (D-008), pravna potvrda nije.** Ostaje tri stvari:

| # | Otvoreno | Zašto |
|---|---|---|
| 1 | **Provera APR registracije po terapeutu** | D-008 tvrdi da su terapeuti „samostalni preduzetnici registrovani u APR". To je **činjenična tvrdnja u pravnom tekstu** — ako neko od troje nije registrovan, tekst je neistinit. Proveriti za svakog, pre objave |
| 2 | **Krizni disclaimer (T11) nedostaje** | MP T11: platforma **nije hitni/krizni servis**; tačna formulacija + lokalni resursi traže stručnu i pravnu potvrdu. D-008 ovo ne pokriva. Ovo je bezbednosna stavka, ne formalnost |
| 3 | **Da li je klauzula o odgovornosti izvršiva** | „Platforma nije odgovorna, terapeuti preuzimaju odgovornost" — pitanje za pravnika (potrošačko pravo, zdravstvene usluge). Mi je ne smemo formulisati (MP §0, tačka 8: *nikad ne izmišljati pravni tekst*) |

**Četiri stranice:** `/privatnost` · `/uslovi` · `/kolacici` · `/pravila-zakazivanja`
**Dok ne stigne:** stranice postoje kao placeholderi „u pripremi — pravna potvrda" (MP §5 R1.1).

---

### O-06 · S10b — Kontakt podaci
> **Gde piše:** MP §13 S10 · Proposal §4 #3 · **Blokira:** `/kontakt`, Resend, JSON-LD, R1.5

**Rešeno (D-007):** struktura footera, brzi linkovi, **postojeći logo**.
**Delimično rešeno (D-016, 2026-07-18):** email adrese kreirane — po jedna za svakog od troje u timu, plus `info@psihointegritet.com`; Resend šalje sistemske/verifikacione mejlove sa `noreply@`. **Nijedna još nije upisana u kod ni u `.env.example`.**

**I dalje otvoreno:**

| # | Potrebno | Blokira |
|---|---|---|
| 1a | Da li `termini@` postoji kao posebna adresa za zahteve za termin, ili sve ide na `info@`? | R1.3.i — koja adresa prima obaveštenja o novim zahtevima |
| 1b | Upisati kreirane adrese u `.env.example` (FE i BE) i povezati u kod | R1.3.i |
| 2 | Telefon | `/kontakt`, footer |
| 3 | Linkovi ka društvenim mrežama | Footer |
| 4 | Adrese lokacija (Niš, Leskovac) | JSON-LD `LocalBusiness` (R1.4.d), `/o-nama` |

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

### O-14 · Routing matrica po terapeutu *(ažurirano 2026-07-20, matching v2 / D-025)*
- **Uzrasne granice** — privremena podela (CTO 2026-07-20): **Marija za maloletnu decu, Anja i Marjan za 18+** (`matching.ts` `worksWithMinors`). **Precizirati sa Anjom** ko radi sa kojim uzrastom (Do 7 / 7–12 / 13–17).
- Oblasti rada po terapeutu — potvrditi listu iz `matching.ts` `therapistMatchingConfig` (preneta 1:1 iz Anjinog dokumenta)

### O-15 · Operativna pravila (za R2, ali utiču na v1 tekst)
- Maksimalan broj novih klijenata po terapeutu (kapacitet) — sada nema ograničenja
- Koje složenije situacije zahtevaju ljudski pregled pre prikazivanja rezultata (sada: samo „oporavak nakon nasilja/kriznog iskustva" → tim)
- Ko može da preuzme nedodeljeni zahtev iz zajedničkog reda
- Formulacija sigurnosnog izlaza (nije dijagnoza / nije hitna služba) — **vezano za S5**, čeka pravnu i stručnu potvrdu

### O-16 · Preciziranja iz Anjinih odgovora (matching v2 / cenovnik, D-025)
- **„Tridesete — Vreme promene", roditelji** — napomena „roditelji imaju mogućnost dolaska po ceni jednog učesnika" **se prikazuje na sajtu** (CTO 2026-07-20), ali je nejasno da li dvoje roditelja dolazi po ceni jednog. **Precizirati formulaciju sa Anjom.**
- **Burnout: „Marjan +2 ako je vezano za zaposlenje ili kompanijski program"** — izostavljeno iz bodovanja (CTO 2026-07-20) jer upitnik nema signal o zaposlenju. **Precizirati sa Anjom** kako se uslov prepoznaje (novo pitanje? B2B kontekst?).
- Uzrasne granice po terapeutu — vidi O-14.

### O-17 · Clerk nalozi za tim (superadmin faza, D-026)
Anja, Marija i Marjan **nemaju Clerk naloge** (postoje samo mailbox-ovi). `npm run roles:assign` ih SKIP-uje dok se nalozi ne kreiraju kroz `/registracija` — tada ponovo pokrenuti skriptu da dobiju `org_admin`+`therapist` metadata. Do tada `/radni-prostor` za njih ne radi.

### O-18 · Dodela rola na produkcionoj Clerk instanci
Role su dodeljene samo na **dev** instanci (2026-07-20: `drazic.milan@gmail.com` → superadmin). Pri launchu obavezno pokrenuti `roles:assign` sa produkcionim `CLERK_SECRET_KEY` (i kreirati `milan.drazic@dmdevelon.website` nalog).

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

| ID | Odluka | Gde piše | Blokira |
|---|---|---|---|
| O-11 · S4 | Model saglasnosti/zaštite za adolescente | MP §13 S4 · T10 | Self-service za maloletnike (posle R2) |
| O-12 · S8 | Ko prima uplate i izdaje račune | MP §13 S8 · Proposal §4 #9 | R5 |
| O-13 · S9 | Provajder meeting linkova + rezervna procedura | MP §13 S9 | R5 |

---

## Rezime za Anju

**Hitno — bez ovoga nema launcha:**
1. **Zvanja** — tačna formulacija za svakog od troje; da li „pod supervizijom" stoji (O-01)
2. **Fotografije** — autentične, ili idemo na monogram inicijala (O-07)
3. **Kontakt** — email, telefon, mreže, adrese lokacija (O-06)
4. **Pravni tekstovi** — pravnik + krizni disclaimer + provera APR statusa (O-03)

**Uskoro:** tekst o lokacijama (O-02) · pregled upitnika (O-04) · prva radionica (O-05)
**Pre Faze 2:** pravila otkazivanja (O-08) · cena za studente (O-09) · Google kalendari (O-10)
