# OPEN DECISIONS — Psihointegritet

Otvorene odluke. **Doneto ide u `PRODUCT_DECISIONS.md`** i briše se odavde.

**Gde piše:** master plan §13 (STOP lista) · §4 R0.1 · Proposal v1.1 §4 (Anjina lista)
**Pravilo (MP §0, tačka 5):** ako se udari u otvorenu stavku — **stati i pitati**. Ne pogađati proizvodne, pravne, cenovne ni kliničke odluke.

**Stanje 2026-07-22:** S2/S13 rešeni, S5/S10 parcijalni, S1 otvoren. Content governance je zaključan kroz D-028…D-033; BDS-007A je zaključan kroz D-034. Pre-R2 tehničke i poslovne odluke koje stvarno ostaju otvorene vode se u `PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.1.md`.

## Zaključano van ovog registra

Sledeće više nisu otvorene dileme i ne treba ih ponovo uvoditi ovde: R1.4.i granica, petostepeni publication lifecycle, `request | slot_request | disabled`, zabrana `live`, R2/R5 finansijska granica, CI-only Content Health, approval capabilities i BDS-007A atomic contention hold. Izvor su D-028…D-034. Stvarni otvoreni Booking detalji ostaju BDS-004…BDS-006, BDS-007B, BDS-008…BDS-012, BDS-015/BDS-016, S4, S5, S7 i S12.

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

> ℹ️ _Napomena 2026-07-17: na ovo pitanje je stigao odgovor „samo ekavica", što je jezička odluka (zabeležena kao D-001), ne odgovor na S1. S1 ostaje otvoren._

**Stanje u kodu (2026-07-17):** `/tim` i `/tim/[slug]` su napravljeni. Zvanja su spuštena na generička u `content/therapists.ts`:

| Terapeut | Handoff je tvrdio                                                    | Objavljeno sada (`draft`)                                                     |
| -------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Anja     | „Socijalni radnik i geštalt psihoterapeutkinja **pod supervizijom**" | „Osnivačica Psihointegriteta · Socijalni radnik i geštalt psihoterapeutkinja" |
| Marija   | „Pedagog i geštalt psihoterapeutkinja **pod supervizijom**"          | „Pedagog i geštalt psihoterapeutkinja"                                        |
| Marjan   | „Psiholog i geštalt psihoterapeut **pod supervizijom**"              | „Psiholog i geštalt psihoterapeut"                                            |

⚠️ **Uz to je izmenjena Marjanova biografija.** Njegova prva rečenica doslovno glasi: _„Ja sam Marjan Janković, psiholog i geštalt psihoterapeut **pod supervizijom**, posvećen…"_. Fraza je uklonjena po MP §4 R0.2 („remove/neutralize any unconfirmed credential strings from staging copy"). To je **jedina izmena sadržaja u bilo čijoj biografiji** osim ekavice — i **vraća se u jednoj liniji** ako Anja potvrdi da „pod supervizijom" ipak stoji za njega.

---

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

| ID        | Odluka                                         | Gde piše                   | Blokira                                |
| --------- | ---------------------------------------------- | -------------------------- | -------------------------------------- |
| O-11 · S4 | Model saglasnosti/zaštite za adolescente       | MP §13 S4 · T10            | Self-service za maloletnike (posle R2) |
| O-12 · S8 | Ko prima uplate i izdaje račune                | MP §13 S8 · Proposal §4 #9 | R5; izričito van R2 (D-031)            |
| O-13 · S9 | Provajder meeting linkova + rezervna procedura | MP §13 S9                  | R5                                     |

---

## Rezime za Anju

**Hitno — bez ovoga nema launcha:**

1. **Zvanja** — tačna formulacija za svakog od troje; da li „pod supervizijom" stoji (O-01)
2. **Kontakt** — email, telefon, mreže, adrese lokacija (O-06)
3. **Pravni tekstovi** — pravnik + krizni disclaimer + provera APR statusa (O-03)

**Uskoro:** tekst o lokacijama (O-02) · pregled upitnika (O-04) · prva radionica (O-05)
**Pre Faze 2:** pravila otkazivanja (O-08) · cena za studente (O-09) · Google kalendari (O-10)
