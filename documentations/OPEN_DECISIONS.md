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

> **Gde piše:** PRODUCT_CONTEXT v0.3 §11.5 · content-architecture.md §6 · D-053 · ADR-022 · **Blokira još samo:** tier/release obećanje, ne backend registra

**Šta znamo:** CTO je 2026-07-26 potvrdio da je Kompas **novi, zaseban proizvod** — nije novo ime za postojeći Vođeni izbor / Intake & Matching tok. D-053/D-054/D-056 i ADR-022 Amandmani 1–2 zaključavaju backend registar, panel, CMS reference, javni v1 tok, anonimni access i Intake granicu. K3B core, K4 Engine, K5 storage granica, kanonske/list stranice i K6A „Brzi unos” su završeni; finalni `/kompas`, vidljivi Intake most i feedback ostaju iza svojih K5/K6 kapija.

**Preostalo od CTO/tima:**

1. ~~Definicija proizvoda: šta Kompas radi, za koga, čime se razlikuje od Vođenog izbora~~ → **napredak 2026-07-29, vidi ispod**
2. Granica osnovni vs napredni tier
3. ~~Release (R-mapa)~~ → **rešeno 2026-08-03, D-059**

> **Napredak 2026-07-29 (CTO).** Kompas je **discovery i recommendation sloj iznad istog kataloga sadržaja** — ne novi katalog. Prvi izbor korisnika: „Želim stručnu podršku" · „Želim da razumem šta mi se dešava" · „Tražim koristan sadržaj" · „Tražim podršku za roditeljstvo" · „Tražim podršku za odnos" · „Tražim sadržaj za kompaniju ili tim". Grana **informacije** pretražuje članke, video, PDF vodiče, preporuke knjiga, programe i radionice; grana **stručna podrška** vodi na usluge, terapeute, način rada i prelazak na zahtev za termin. Zakazivanje ostaje globalno dostupno ali ne agresivno — sekundarni CTA na stručnom sadržaju („Potrebna vam je stručna podrška?") i povratak iz booking toka na sadržaj („Još nisam spreman da zakažem — želim prvo da pogledam materijale").
>
> Tačka 1 je odgovorena. Zajednička taksonomija, koja je ranije bila O-24 blokada, zatvorena je D-052 + D-053/ADR-022. O-21 sada nosi samo tačke 2 i 3.

> **Usvojeno 2026-07-31 — D-053 / ADR-022:** `KOMPAS_TODO.md` razdvaja Kompas topic grupe/teme od D-052 Intake routing oblasti. V1 ose su `topicGroupId`, `topicIds`, jedna sistemska vrednost `journeyIntent`, `goalIds`, `audienceIds`, izvedeni/kontrolisani `contentFormat` i postojeći `accessPolicy`; tagovi/sinonimi ostaju samo pretraga. Kompas je u v1 deterministički content recommendation servis u `modules/content`, bez novog therapist scoring-a i bez obaveznog AI-ja. Implementacija ide backend registar → panel → CMS → javni Kompas.

> **Usvojeno 2026-08-03 — D-059:** basic Kompas **pripada R3 Content obimu**, ali ima **nezavisnu produkcionu aktivaciju preko feature flag-a**. Ne pravi se veštački nov proizvodni release; flag se pali tek kada postoje minimalni urednički podaci, admin prihvatni testovi i zeleni javni E2E. Tačka 3 je time zatvorena.

**O-21 ostaje otvoren samo** za basic/advanced granicu (tačka 2). K0 kapija, K1–K3, K3B core, K4 v1, K6A i Kompas v1 vertikala (D-058/ADR-025) su prošli; tačne Anjine kategorije su podaci registra, ne promena Engine ugovora.

---

### O-23 · „Dnevna soba" — obim i granice novog klijentskog prostora _(novo 2026-07-29)_

> **Gde piše:** nigde — **0 pogodaka u celom repou**. **Blokira:** bilo kakav kod, model ili ruta za Dnevnu sobu

**Šta znamo:** CTO je 2026-07-29 opisao Dnevnu sobu kao lični prostor korisnika sa: Sačuvano · Nastavi čitanje/gledanje · Moje kupovine · Moja pretplata · Preporučeno · Moji termini · privatne kolekcije. Predložen početni model `SavedItem { userId, contentId, listType, progress, savedAt, lastOpenedAt }`, uz izričitu nameru da se **ne** pravi slobodan „my space" sa drag-and-drop organizacijom dok se ne proveri da li ljudi uopšte čuvaju sadržaj i vraćaju mu se.

**Zašto je ovo otvorena stavka a ne zadatak:** Dnevna soba je **nova produktna površina koju nijedan dokument ne opisuje**. Najbliži postojeći pojmovi su „lični prostor" i „članski deo", oba pomenuta samo kao *okidač za registraciju* odnosno stavka u „U pripremi" listi, uz izričito pravilo da ta oznaka „ne aktivira praznu funkcionalnost". Po istoj logici po kojoj je Kompas dobio O-21, i ovo traži odluku pre koda.

**Uz to, tri od sedam sekcija su već blokirane drugim kapijama:**

| Sekcija | Stanje |
|---|---|
| „Sačuvano", „Nastavi čitanje", „Preporučeno", privatne kolekcije | Traže stvarni katalog sadržaja — O-24 ugovor je rešen, ali K1–K4 i ADR-019 još nisu implementirani |
| **„Moje kupovine", „Moja pretplata"** | 🚫 **D-031 / BDS-014 / `PUB-003`** — finansijski domen je R5 |
| **„Moji termini"** | 🚫 **R2 Booking Engine** — ne postoji |

**Traži se od CTO:**

1. Da li je Dnevna soba zaseban proizvod (kao Kompas) ili deo klijentskog panela iz R2 M2.4
2. Vlasnik i release
3. Da li v1 sme da bude samo „Sačuvano" + „Nastavi čitanje" — jedini deo koji ne udara ni u jednu kapiju

**Dok ne stigne:** bez modela, rute i placeholder koda. `SavedItem` se ne piše dok ne postoji katalog iz kog se čuva — inače je to tabela sa stranim ključem ka tipu sadržaja koji još ne postoji.

---

### O-24 · Zajednička taksonomija sadržaja — unifikacija pre proširenja _(✅ rešeno D-052 + D-053/ADR-022, 2026-07-31)_

> **Gde piše:** `CONTENT_MODEL_MATRIX_v0.1.md` §8 · `content-architecture.md` §6 · **Ranije blokiralo:** Kompas registar i filtriranje kataloga

**Problem 1 — tražene ose nisu u dozvoljenoj listi.** CTO traži `audience`, `topics`, `goals`, `contentType`, `supportLevel`, `ageGroup`, `format`, `accessLevel`, `estimatedTime`, `relatedServices`, `relatedTherapists`. `CONTENT_MODEL_MATRIX_v0.1.md` §8 je iscrpna dozvola šta R3 CMS sme da doda modelu — `revisionId`, `createdBy`, `updatedBy`, `publishedAt`, audit i scheduling polja — i izričito kaže da se javni field name-ovi, CTA registry, template registry i ograničenja **ne smeju menjati bez nove produktne odluke**. Nijedna tražena osa nije na toj listi. Uz to `contentType` **već postoji kao javno ime polja** (`ContentBase.type: ContentType`) i ne sme dobiti drugo značenje.

**O-24a — Intake & Matching drift je rešen D-052.** Frontend, backend i postojeći DB profili koriste pet stabilnih ID-jeva; `contracts/fixtures/taxonomy.v1.json` čitaju parity provere sa obe strane. „Zavisnost" je potvrđena Anjina uža capability oznaka i stvarna opcija upitnika, uz postojeći timski handoff. Javni čipovi u `content/therapists.ts` ostaju slobodan prezentacioni tekst i namerno nisu matching izvor.

**Ishod:**

1. ✅ **Od tima/Anje:** pet Intake oblasti i Anjina primarna stručnost za zavisnost potvrđeni su i sprovedeni kroz D-052.
2. ✅ **O-24b — usvojen D-053/ADR-022:** odvojene managed topic group/topic/audience/goal ose, zaključane system journey/format/access vrednosti, revision-bound content metadata, org-scoped tenant granica i eksplicitni topic → Intake most. Postojeći `ContentBase.type` ostaje jedino značenje polja `contentType`.

O-24 više nije otvorena arhitektonska blokada. Implementacija se prati u `KOMPAS_TODO.md` K1–K3. Anjine konačne grupe/teme/sinonimi su stručni registry podaci, ne nova produkt odluka.

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

### O-25 · Cross-organization pristup za platformskog operatera _(novo 2026-08-01)_

> **Gde piše:** ADR-023 §6.5, §12 · D-051 · D-055 · **Blokira:** treći RLS PR (polise) samo ako se do tada pojavi druga organizacija; danas ne blokira ništa

**Šta znamo:** D-051 daje platformskom superadminu pun staff kapacitet (`org_admin` + `therapist`) **unutar tenant-a**, kroz `internal_users.is_superadmin` i `resolve_staff_actor`. Danas **ne postoji nijedan cross-organization put** — svako razrešavanje organizacije ide kroz `settings.default_organization_slug = "psihointegritet"` i postoji tačno jedna organizacija. Dakle trenutno nema šta da se auditira.

**Zašto je ipak otvorena stavka:** čim postoji druga organizacija, „superadmin vidi sve" prestaje da bude bezopasno. ADR-023 zaključava da runtime konekcija **nikad** nema `BYPASSRLS` i da se svakodnevne polise ne šire na `organization_id IN (...)`, pa cross-organization pristup mora dobiti eksplicitan, zaseban put — a taj put niko još nije opisao.

**Traži se od CTO:**

1. Da li platformski operater uopšte sme da čita operativne podatke druge organizacije, ili samo agregate i dijagnostiku.
2. Ako sme — kroz šta: impersonation/support sesija sa vremenskim ograničenjem, namenska procedura, ili poseban servisni tok.
3. Šta se beleži: ko, kada, zašto, kojoj organizaciji, i koliko dugo se taj zapis čuva.
4. Da li se to gradi kao proširenje D-051 ili kao zaseban `PlatformRole` model — ADR-023 §12 preporučuje proširenje, da ne postoje dva paralelna modela uloga.

**Dok ne stigne:** superadmin ostaje ograničen na `default_organization_slug`, bez cross-organization koda, bez `BYPASSRLS`, bez „vidi sve" polise. Prva organizacija koja se doda **pre** ove odluke mora se tretirati kao blokada, ne kao sitnica.

**Smer koji je već potvrđen (CTO, 2026-08-01), ostaje da se razradi:** ne uvoditi `BYPASSRLS` u normalnu aplikaciju · napraviti eksplicitnu support/platform-admin sesiju · **zahtevati razlog pristupa** · auditovati organizaciju, korisnika, vreme i akcije · po mogućnosti vremenski ograničiti pristup.

---

### O-26 · Ponašanje globalnih taxonomy termina prema organizaciji _(novo 2026-08-01)_

> **Gde piše:** ADR-023 §7.3.1 · D-053/ADR-022 · `RLS_MIGRATION_INVENTORY_v0.1.md` §3 · **Blokira:** organizacijsko prilagođavanje sistemskih termina; ne blokira RLS rollout

**Šta znamo:** `taxonomy_terms` i `taxonomy_term_revisions` su mešane tabele — 17 od 19 odnosno 17 od 17 redova su **globalni sistemski termini** (D-053 system ose i D-052 `support_area` seed), vidljivi svakoj organizaciji. ADR-023 §7.3 zaključava da runtime te redove **sme da čita, ali ne sme da kreira, menja ni briše**. To je bezbednosno dovoljno i ne čeka ovu odluku.

**Šta nije odlučeno** — šest situacija koje će se pojaviti čim postoji druga organizacija:

1. Šta se dešava kad organizacija hoće **drugu javnu labelu** za globalan termin.
2. Ko i kako **arhivira** globalan termin koji koristi više organizacija.
3. Da li organizacija sme da **kopira** globalan termin u sopstveni managed termin, i šta se tada dešava sa referencama.
4. Šta znači **`UPDATE`/`DELETE` globalnog termina** iz platformskog toka — ko ga odobrava.
5. Da li postoji **organization override** globalnog termina i, ako postoji, kao zaseban red ili kao polje.
6. Šta se prikazuje kad override postoji a globalni termin se u međuvremenu promeni.

**Predloženi smer (nije usvojen):** organizacija **ne menja globalan termin direktno**, nego dobija zaseban povezan override zapis — globalni sistemski termin + opciona organization-specific prezentaciona konfiguracija. Tako promena Anjine javne labele ne menja termin svim budućim klijentima platforme, a sistemski registar ostaje jedan.

**Dok ne stigne:** bez override modela, bez kolone za organizacijsku labelu, bez koda. Zabrana upisa iz §7.3 je jedina važeća polovina ugovora.

---

### O-27 · Jezik sistemskog kataloga po organizaciji _(novo 2026-08-04)_

> **Gde piše:** TODO §5G · **Blokira:** prvi tenant van srpskog tržišta; danas ne blokira ništa

**Odlučeno je okruženje, ne rešenje.** CTO je 2026-08-04 zaključao model: novo tržište je **nova organizacija sa svojim domenom**, svojim sadržajem i svojim testovima, a sistemska objašnjenja i poruke idu na jeziku tog tenanta. Psihointegritet ostaje na srpskom i **ne postaje višejezičan** — nema prebacivača jezika ni prevoda postojećih stranica. Time otpada translation-group veza između entry-ja (TODO §5G).

**Šta je već rešeno i ne traži odluku:** tenant se razrešava preko `settings.default_organization_slug`, pa je novo tržište nov deployment · `locale` je na reviziji termina a `stable_id` bez jezika, uz unique indekse `(term_id, organization_id, locale)` · put čitanja filtrira jezik do kraja (`compass_service.py:132,193`), pa preporuka ne može da pređe jezičku granicu.

**Šta traži odluku:** `SYSTEM_CONTENT_LOCALE = "sr-Latn"` (`system_catalog.py:18`) je modulska konstanta koja **diže grešku za svaki drugi jezik** na dva mesta (`system_catalog.py:80`, `identity.py:97`). Brana je namerna i dobra — sprečava polupreveden sistemski katalog — ali je i tvrda granica na jedan jezik za celu instalaciju.

**Traži se od CTO:**

1. Da li jezik pripada **organizaciji** (`organizations.default_locale`) ili **deployment-u** (podešavanje uz `default_organization_slug`). Prvo je tačnije ako ikad dve organizacije dele instalaciju; drugo je jeftinije i dovoljno za model „jedno tržište = jedan deployment".
2. Šta se dešava sa **sistemskim katalogom** stranog tenanta: da li se D-052/D-053 sistemske ose i termini sejuju prevedeni po jeziku, ili strani tenant dobija svoj registar od nule.
3. Da li brana ostaje kao **provera** (jezik tenanta mora biti tačno jedan i sav sistemski sadržaj mora biti na njemu) ili se uklanja.

**Dok ne stigne:** konstanta se ne dira, `next-intl` se ne uključuje, nema `default_locale` kolone i nema koda. Važe samo tri pravila iz TODO §5G koja ništa ne koštaju: backend vraća kod a frontend bira reči · nov tekst ide u copy modul, ne inline u JSX · ijekavica je pun locale, nikad automatska zamena `e → je/ije`.

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

**Intake taksonomija je potvrđena i zatvorena (D-052):** pet stabilnih oblasti + Anjina primarna stručnost za zavisnost, uz timski handoff. CMS/Kompas arhitektura je takođe zatvorena D-053/ADR-022; Anjina konačna mapa grupa/tema je registry unos i ne traži novu potvrdu Intake pravila.
