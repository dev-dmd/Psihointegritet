# SANJA NEUER — tenant specifikacija v1.0

**Datum:** 2026-09-05 (rev. 2026-09-06) · **Vlasnik:** Milan Dražić (CTO) · **Sadržaj/brend:** Sanja Neuer
**Status:** aktivan radni dokument · **Plan isporuke:** `P_DIGITALNI_CENTAR_PLAN_v1_0.md`
**Dizajn handoff:** `documentations/design/Sanja Neuer landing stranica-handoff/sanja-neuer-landing-stranica/`

---

## 0. Šta je ovaj dokument

Opis **jednog tenanta** na platformi P. Digitalni Centar — ko je Sanja Neuer, šta njen
proizvod mora da radi, kako se njen sadržaj modeluje i gde se razlikuje od demo tenanta
Psihointegritet.

**Ovo nije „Sanja aplikacija".** Ne pravi se novi repo, ne forkuje se kod, ne pravi se
paralelni CMS. Sanja je tenant istog sistema, na istim engine-ima. Ono što se za nju
napravi mora da bude upotrebljivo i za sledećeg tenanta — inače je pogrešno napravljeno.

Redosled, faze i kriterijumi prihvatanja su u `P_DIGITALNI_CENTAR_PLAN_v1_0.md`.
Ovde stoji **šta** je Sanja, tamo stoji **kojim redom** se gradi.

---

## 1. Pozicija u platformi

```
P. DIGITALNI CENTAR  (P. DC)
│
├── Platform / Superadmin      → tenants, users, feature gates, diagnostics, engine status
│
├── Psihointegritet  (DEMO)    → multi-provider model
│   Maria Bullock · Elsa Browers · John Francis
│   pronađi terapeuta → matching → sadržaj → kompanije
│
└── Sanja Neuer  (PRVI PRAVI)  → expert/creator model
    jedan ekspert → sopstvena metodologija → sadržaj → odnos → konsultacija/mentorstvo
```

Oba tenanta rade na **istim engine-ima** (Booking, Intake, Content, Client Workspace) sa
**potpuno različitim poslovnim modelima**. To je prvi realan test multi-tenancy-ja — do sada
je platforma imala jedan poslovni model i pretpostavke tog modela su ušle u kod kao da su
platformske. Sanja ih izlaže.

### 1.1 Šta Sanja dokazuje, a Psihointegritet nije mogao

| Pretpostavka u postojećem kodu             | Sanja je obara                                                     |
| ------------------------------------------ | ------------------------------------------------------------------ |
| Tenant ima **više terapeuta**              | Sanja je jedina — nema kataloga, nema matching-a, nema „pronađi"    |
| Tenant ima **fiksni skup javnih ruta**     | Njoj ne trebaju `tim`, `pronadji-podrsku`, `rad-sa-kompanijama`, `radionice`, `podrska-roditeljima` |
| Javni sadržaj je **popunjavanje slotova**  | Njena stranica je kompozicija sekcija — koje sekcije postoje i kojim redom |
| Tenant ima **lokacije/gradove**            | Sve je online, na tri jezika                                        |
| B2B je deo proizvoda                       | Nije — ona radi 1:1 i mentorstvo                                    |

**Posledica za arhitekturu:** javni sadržaj više ne sme da bude „content pack koji puni
zakucane stranice". Mora da bude `tenant → pages → sections → blocks`. Detaljno u §4.

---

## 2. Ko je Sanja Neuer — proizvodni profil

Po osnovnom zanimanju psiholog, sa dodatnim edukacijama iz psihoterapije, treninga, obuke,
porodičnih konstelacija i duhovnosti. Kao psihoterapeut i trener radi 20 godina.
TEDx govornica, više puta na nacionalnim kongresima psihoterapeuta.

Fokus rada danas: **konsultacije koje pružaju sveobuhvatan pristup** — transgeneracijski
uzroci i blokade koje onemogućavaju osobi da zamisli i ostvari budućnost.

Iz toga sledi da joj **ne treba klasičan CMS sa nekoliko tekstualnih polja.** Ona ima:

- sopstvenu metodologiju i teorijske okvire;
- više načina rada, strukturisane usluge;
- dugogodišnji video arhiv i budući nov video sadržaj;
- blog, FAQ, opisan proces rada;
- lični autoritet koji se gradi sadržajem;
- konsultacije i mentorstvo kao **različite proizvode sa različitim conversion path-om**.

Zato je Edu Centar authoring model (`Page → Sections → Blocks → Preview → Publish`) prava
osnova, a ne WordPress princip (naslov + textarea + slika + Publish).

### 2.1 Poslovni parametri

| Stavka                | Vrednost                                                        |
| --------------------- | --------------------------------------------------------------- |
| Format rada           | Isključivo online                                               |
| Jezici sesije         | Srpski · English · Deutsch                                      |
| Konsultacija 1:1      | 60 minuta, pojedinačna sesija                                   |
| Uvodni razgovor       | 20 minuta, **bez naknade**                                      |
| Mentorstvo            | 3 meseca, šest sesija + rad između njih                         |
| Obećanje odgovora     | Lično, u roku od 24 sata, sa dva predloga termina               |
| Naplata               | „Bez naplate do potvrđenog termina"                             |
| Cene                  | **STOP — nije doneto.** Ne izmišljati. Vidi §9.                 |

---

## 3. Dizajn i tema

### 3.1 Tema je token override, ne fork

Ključan nalaz iz handoff-a: `project/sanja-theme.css` **ne pravi novi design system** — on
retokenizuje postojeći `PsihointegritetUI` bundle preko CSS custom properties.

```
--color-canvas   #f7f4ef   (ivory)      ← bila zelena/krem paleta
--color-forest   #5b1e2d   (burgundy)   ← primarna akcija
--color-meadow   #cbb7d6   (lilac)      ← akcent
--color-coffee   #1a1a1f   (ink)        ← tekst i tamne površine
--font-serif     "Playfair Display", Georgia, serif
```

**Pravilo koje iz ovoga sledi i važi za sve buduće tenante:** tenant tema je **skup tokena**.
Nijedna komponenta se ne forkuje po tenantu. Ako neki tenant traži izmenu komponente, izmena
ide u komponentu kao varijanta — nikad kao kopija.

> Fajl sadrži i blok „alpha utilities the bundle compiled against the old hexes"
> (`.text-coffee\/60`, `.bg-meadow\/22`, …). To je **zaobilaženje**, ne rešenje: Tailwind je
> alpha varijante kompajlirao na stare heks vrednosti. Kad se tema ugrađuje u kod, boje
> moraju da idu kroz tokene tako da alpha varijante rade same. Ne prepisivati ovaj blok u
> produkcioni kod.

### 3.2 Ime design system-a

Bundle se zove `psihointegritet-design-system-9b777129-…`. Pod novom pozicijom platforme ime
je pogrešno — DS pripada platformi, ne demo tenantu. Preimenovanje je kozmetičko i ne blokira
ništa; ide kad se DS dodirne iz drugog razloga (plan §7, tehnički dug).

### 3.3 Assets iz handoff-a

`uploads/`: `hero-image.jpeg`, `sanja-neuer-lilac.jpeg`, `sanja-neuer-burgundy.jpeg`,
`ilustration-metotology.jpeg`, `color-font-scheme.png`.

Image slotovi u dizajnu: `sn-hero-portrait` (4:5), `sn-about-portrait` (1:1),
`sn-method-texture` (4:3), `sn-video-featured` (16:9), `sn-video-1…4` (16:9).

---

## 4. Model sadržaja — početna kao Page Composer dokument

Njena postojeća početna već prirodno izgleda kao Composer dokument. To je najbolja vest u
celom handoff-u: **jedna stranica sadrži skoro sve tipove blokova koje će P. DC trebati i
ostalim tenantima.** Zato je ona prvi realan test Page Composer-a, ne izuzetak od njega.

### 4.1 Hijerarhija stranice `Početna`

```
Početna
 ├ Hero                  → HeroBlock
 ├ Brojke                → StatsBlock            (20+ · TEDx · 3 · ∞)
 ├ O meni                → RichIntroBlock + ExpertiseTagsBlock
 ├ Teorijski okviri      → FrameworkCardsBlock   (3 kartice)
 ├ Metodologija          → MethodologyBlock      (3 metode, numerisane I/II/III)
 ├ Usluge                → ServicesBlock         (vezan za Booking Engine — §5)
 ├ Kako počinjemo        → ProcessStepsBlock     (4 koraka)
 ├ Video blog            → FeaturedVideoBlock + VideoGridBlock
 ├ FAQ                   → FAQBlock              (Accordion)
 └ CTA                   → CTA/BookingBlock
```

### 4.2 Blokovi — sadržaj iz handoff-a

**HeroBlock**
- eyebrow: `Psiholog · Psihoterapeut · Konsultant`
- title: „Stvorite život koji želite — i postanite osoba kakva želite da budete."
- lead: „Konsultacije i mentorstvo koji spajaju psihoterapiju, porodične konstelacije i
  neuroplastično kreiranje budućnosti. Radimo na transgeneracijskim uzrocima i na blokadama
  koje vam ne dozvoljavaju da zamislite svoju budućnost."
- media: portret 4:5
- primarni CTA: `Zakaži konsultaciju` → Booking
- sekundarni CTA: `Upoznaj metod` → sidro `#metod`
- fusnota: „Online, 60 minuta · Odgovor na prijavu u roku od 24 sata"

**StatsBlock** — `20+ godina prakse` · `TEDx govornica` ·
`3 metodologije u jednom procesu` · `∞ nacionalni kongresi psihoterapeuta`

> `∞` kao vrednost je dizajnerska licenca. Pre objave zameniti stvarnim brojem ili
> preformulisati stavku — ovo je tvrdnja o kvalifikacijama i mora da bude tačna (§9).

**RichIntroBlock** („Ko sam ja") — tri paragrafa biografije + citat u burgundy kartici:
„Sama psihoterapija nekada nije dovoljna." Podržava više paragrafa i trust/credential elemente.

**ExpertiseTagsBlock** — `Psihoterapija` · `Porodične konstelacije` · `Trening i obuka` ·
`Duhovnost` · `Neuroplastičnost`

**FrameworkCardsBlock** — „Tri okvira iz kojih gledam vašu situaciju".
Uvod: „Nisu tehnike — to su tri pretpostavke o tome kako se čovek menja."

| # | Okvir | Suština |
| - | ----- | ------- |
| 01 | **Ljubav prema sebi** | Ne kao afirmacija, nego kao odnos |
| 02 | **Identity Invention** | Identitet se može osmisliti, svesno, sa kriterijumom |
| 03 | **Kreiranje ex nihilo** | Budućnost se ne mora izvlačiti iz prošlosti |

**MethodologyBlock** — „Sinteza tri metode u jednom procesu".
Uvod: „Ne birate metod — ja ga birem u svakom trenutku procesa, prema tome šta je uzrok,
a šta simptom."

- **I — Porodične konstelacije:** transgeneracijski uzroci, lojalnosti, isključeni članovi
- **II — Psihoterapijska metoda:** 20 godina kliničkog rada, blokade, obrasci vezivanja
- **III — Neuroplastično kreiranje budućnosti:** konkretna slika budućnosti + doslednost

**ServicesBlock** — „Dva načina da radimo zajedno". **Kritično:** kartice ne čuvaju običan
tekst, nego su vezane za stvarne `Service` objekte iz Booking Engine-a. Vidi §5.

**ProcessStepsBlock** — „Četiri koraka od prijave do promene":
`01 Prijava` (kratak formular, dva minuta) → `02 Uvodni razgovor` (20 min, bez naknade) →
`03 Plan rada` → `04 Proces i integracija`

**FeaturedVideoBlock + VideoGridBlock** — „Stručni sadržaj — bez skraćivanja".
Izabrani video nosi: thumbnail, trajanje, naslov, meta (pregledi + datum), lead, body,
tagove, **poglavlja** i CTA. Grid nosi ostale epizode i menja izabrani. Vidi §6.

**FAQBlock** — „Ono što se najčešće pita pre prve sesije". Pet pitanja iz handoff-a; Sanja ih
sama uređuje. Komponenta: `PsihointegritetUI.Accordion`.

**CTA/BookingBlock** — „Zakažite konsultaciju i počnimo od uzroka." + „Prijava traje dva
minuta. Javljam se u roku od 24 sata sa predlogom termina."

### 4.3 Ostali elementi javne površine

- **Sticky header** sa aktivnim sidrom (IntersectionObserver), `Login` i `Zakaži`
- **Mobilni meni** (drawer) ispod 900px
- **Sticky CTA bar** — pojavljuje se posle heroja, nestaje na CTA sekciji
- **Footer** — kolone `Stranice`, `Teme`, `Zakazivanje` + „Deo P. Digital Centar platforme"

> Footer u handoff-u linkuje „P. Digital Centar" na `https://psihointegritet.com`. To je
> pogrešno pod novom pozicijom (§8). Link ide na platformski domen kad postoji; do tada se
> potpis prikazuje bez linka.

### 4.4 Granica koju content editor ne sme da pređe

Sanja može: da menja tekst, da menja redosled sekcija, da dodaje i sakriva blokove, da radi
preview, draft i publish.

Sanja **ne može** svojim content editorom da: obriše ili razveže Booking Engine, izmeni
Intake logiku, ukloni sistemsku navigaciju, ili napravi stranicu bez obaveznih pravnih
linkova. Ovo je tvrda granica, ne UX preporuka.

---

## 5. Usluge i Booking — dva različita conversion path-a

Ovo je najčešća greška koja bi se ovde mogla napraviti: da oba CTA-a vode u isti booking flow.
Ne vode.

### 5.1 Konsultacija 1:1 → direktan booking

```
CTA „Zakaži termin" → Booking → izbor termina → potvrda
```

`Service` objekat: 60 min · online · jezik sesije (sr/en/de) · availability · intake requirement.

Sadržaj kartice: „Pojedinačna sesija od 60 minuta. Radimo na konkretnoj temi: odnos, odluka,
blokada, ponavljajući obrazac ili prelaz u novu fazu života."
Stavke: mapiranje uzroka ne samo simptoma · konstelacijski rad po potrebi · pisani rezime i
koraci nakon sesije. Badge: `Najčešće`.

### 5.2 Mentorstvo → prijava, **ne** rezervacija

CTA glasi „Zakaži uvodni razgovor" i **ne sme** direktno da rezerviše paket od šest termina.

```
Mentorstvo → Intake → uvodni razgovor → prihvatanje → program/enrollment
```

Sadržaj kartice: „Vođen proces za one koji prave veliki prelaz: identitet, poziv, partnerstvo
ili izlazak iz porodičnog scenarija. Šest sesija i rad između njih." Badge: `3 meseca`.

To prirodno leže na postojeći Program/Enrollment Engine — ali tek kasnije (vidi plan, PDC-4/PDC-7+).

### 5.3 Modal prijave iz dizajna

Polja: Ime i prezime · Email · Telefon (opciono) · **Usluga** (Konsultacija 1:1 / Mentorstvo /
„Nisam sigurna — predloži") · **Kada vam odgovara** (Jutro 09–12 / Popodne 12–17 / Veče 17–21) ·
**Jezik sesije** (Srpski / English / Deutsch) · „Sa čim želite da radimo" (textarea) ·
obavezna saglasnost za obradu podataka.

Potvrda: „Prijava je poslata. Hvala vam. Odgovaram lično, u roku od 24 sata, sa dva predloga
termina."

> Opcija „Nisam sigurna — predloži" znači da prijava mora da podnese **odsustvo izabrane
> usluge**. Ne forsirati izbor usluge kao obavezan.
>
> Modal meša dve stvari: kontakt/prijavu i izbor termina. To je ispravno za prvu fazu (prijava
> → Sanja predlaže termin), ali kad Booking Engine proradi sa availability-jem, „Kada vam
> odgovara" prestaje da bude enum od tri raspona i postaje stvarni izbor slota.

---

## 6. Content Engine — jedan sistem, dva UX surface-a

**Blog i Video Blog nisu dva CMS-a.** Jedan Content Engine, `type` razlikuje.

```
type: article | video          (kasnije: ebook | audio | resource)
```

**Zajednička polja:** title · slug · excerpt · cover · author · topics · tags · status ·
publish date · SEO · related content · CTA · visibility

**`article`** dodatno: Composer blokovi — paragraph, heading, quote, image, list, callout,
video, CTA, related content

**`video`** dodatno: video URL · duration · thumbnail · **transcript** · **chapters** ·
short description · long description

### 6.1 Postojeći video arhiv

Četiri epizode iz handoff-a, sa punim metapodacima (naslov, pregledi, trajanje, lead, body,
tagovi, poglavlja):

| ID | Naslov | Trajanje | Teme |
| -- | ------ | -------- | ---- |
| v1 | Zašto psihoterapija nekada nije dovoljna | 24:18 | psihoterapija, uzroci, obrasci, promena |
| v2 | Porodične konstelacije: nasleđe koje ne vidimo | 31:05 | porodicne-konstelacije, transgeneracijsko, lojalnost |
| v3 | Identity Invention: kako se identitet osmišljava | 19:47 | identity-invention, identitet, odluka |
| v4 | Neuroplastično kreiranje budućnosti | 27:32 | neuroplasticnost, ex-nihilo, budućnost, praksa |

Svaki dobija svoju stranicu, npr.
`/video/identity-invention-kako-se-identitet-osmisljava` — video + tekst + poglavlja +
povezani članci + CTA. Tu njen arhivski sadržaj od pre 10+ godina ponovo dobija vrednost.

> Brojevi pregleda („12.400 pregleda · pre 3 nedelje") su dizajnerski placeholder. Ili se
> povlače stvarno, ili se ne prikazuju. Ne upisivati izmišljene brojeve (§9).

### 6.2 Revitalizacija arhiva — ne „snimi ponovo"

Platforma joj ne kaže „snimi ponovo stare videe", nego joj daje da ih **nadogradi**:

```
Original (2014) ──┬── „Šta danas mislim drugačije"  (dopuna uz isti unos)
                  ├── nov video: „…šta bih danas drugačije objasnila nego pre 10 godina"
                  ├── članak koji temu razrađuje
                  └── CTA: konsultacija
```

To je odličan sadržaj upravo zato što demonstrira 20+ godina iskustva. Traži da Content Engine
podrži **relaciju između unosa** (`related content`, tipizovana), ne samo listu tagova.

---

## 7. Intake, Anketa, Kompas

### 7.1 Intake ostaje zaseban engine

Ne mešati sa Booking-om:

- **Booking pita:** *Kada?*
- **Intake pita:** *Zašto dolazite i šta vam treba?*

Nacrt Intake-a za Sanju:

1. **Sa čime želite da radimo?** — odnos · odluka · ponavljajući obrazac · životna promena ·
   identitet · profesionalni pravac · porodica · nešto drugo
2. **Šta biste želeli da bude drugačije?** — tekst
3. **Da li ste ranije radili sa psihologom/psihoterapeutom?**

Završetak zavisi od putanje: `Nastavi na izbor termina` (konsultacija) ili
`Pošalji prijavu` (mentorstvo).

### 7.2 „Quiz" se preimenuje u Anketa / Survey Engine

Termin `Quiz` se **napušta**. U sistemu: **Survey Engine**; u UI: **Anketa**.

Vrste: `research` · `feedback` · `intake-followup` · `content-interest` · `assessment`.

Bez gamification semantike (tačan/netačan odgovor). Ako jednom bude psihološki instrument koji
daje rezultat, to nije anketa nego poseban **Assessment** — i traži svoju odluku, uključujući
pravnu i kliničku.

### 7.3 Kompas — zadržan, ali nije blocker za Sanja launch

Kompas je jedan od najboljih diferencijatora P. DC-a, ali Sanja već ima jasan ulaz kroz svoje
okvire i teme. Njen Kompas ima smisla tek kad ima dovoljno njenog stvarnog sadržaja da ne
vraća generički fallback — tada može da kaže „Ovo što opisujete najviše se dotiče teme
identiteta i porodičnog scenarija" i ponudi Identity Invention: video + članak + Intake.

**Ne stavljati Kompas kao uslov za launch.**

---

## 8. SEO — tvrdo pravilo naučeno na Edu Centru

**SEO metadata nikada nije izvor javnog sadržaja. Ni u jednom smeru.**

```
Hero.title        ≠  SEO.title
Hero.description  ≠  SEO.description
```

Kod Sanje konkretno:

| Površina | Tekst |
| -------- | ----- |
| **Hero H1** | „Stvorite život koji želite — i postanite osoba kakva želite da budete." |
| **H2 „O meni"** | „Psiholog koja radi na uzrocima — transgeneracijskim, telesnim i onim u vašoj slici budućnosti." |
| **SEO title** | „Sanja Neuer — Konsultacije i mentorstvo \| Psihoterapija, porodične konstelacije i neuroplastična transformacija" |
| **SEO description** | „Sanja Neuer — psiholog i psihoterapeut sa 20 godina prakse. Konsultacije i mentorstvo koji spajaju psihoterapiju, porodične konstelacije i neuroplastično kreiranje budućnosti. Zakažite online konsultaciju." |

Nikakvo automatsko prebacivanje SEO teksta u Hero ni obrnuto. Nikakvo „ako je SEO prazno,
uzmi Hero".

### 8.1 Structured data iz handoff-a

`ProfessionalService` sa `provider: Person (Sanja Neuer)`, `areaServed: Online`,
`availableLanguage: [sr, en, de]`, `parentOrganization: P. Digital Centar`.

`og:locale: sr_RS`. Domen se u metapodatke **ne upisuje kao literal** — dolazi iz
`NEXT_PUBLIC_APP_URL` (frontend to već radi kroz `metadataBase`).

---

## 9. STOP lista — ne pogađati

Po pravilu iz `TODO.md §8`, sledeće se **ne izmišlja**; traži se od Sanje:

1. **Cene** — ni konsultacije ni mentorstva. Dizajn ima link „Vidi usluge i cene", a cena
   nigde nema. Dok cene ne stignu, link vodi na usluge bez cena.
2. **Zvanja i kvalifikacije** — tačan naziv edukacija, akreditacija, komorskih članstava.
   „TEDx govornica" i „nacionalni kongresi" moraju da budu proverljivi.
3. **`∞` kao broj kongresa** — zameniti stvarnim brojem ili preformulisati.
4. **Brojevi pregleda videa** — povući stvarno ili ne prikazivati.
5. **Pravni tekstovi** — privatnost, uslovi, pravila zakazivanja: njena verzija, ne kopija
   Psihointegritetovih. Ona je zaseban pravni subjekt.
6. **Domen** — čeka se da ga Sanja da (§10).
7. **Radno vreme i availability** — realno, ne demo.
8. **Da li „Mentorstvo" sme da se zove mentorstvo** u njenom regulatornom kontekstu.

---

### 9.1 Status sadržaja — obavezan za svaki tekst na njenom tenantu

Demo dizajn sme da ima placeholder. **Čim tenant počne da izlazi pred Sanju, svaki tekst mora da
nosi jedan od tri statusa:**

| Status | Značenje | Sme li javno |
| ------ | -------- | ------------ |
| **CONFIRMED** | Sanja je potvrdila tačnost | ✅ da |
| **PLACEHOLDER** | Naš tekst, dovoljno dobar da se vidi struktura | ⚠️ samo interno / staging |
| **NEEDS CLIENT INPUT** | Traži njen odgovor; mi ga ne smemo izmisliti | ❌ ne |

Razlog nije birokratija: bez ovoga joj pokažemo lep sajt sa izmišljenim profesionalnim tvrdnjama, pa
posle jurimo gde smo šta stavili. Profesionalne tvrdnje psihologa nisu marketinški copy — one su
proverljive i ona za njih odgovara.

Trenutna klasifikacija poznatog sadržaja:

| Sadržaj | Status |
| ------- | ------ |
| Hero, okviri, metodologija, proces, FAQ (tekst iz handoff-a) | **PLACEHOLDER** — njen glas, ali nije potvrdila |
| „20 godina prakse", TEDx, nacionalni kongresi | **NEEDS CLIENT INPUT** — proverljive tvrdnje |
| `∞` broj kongresa | **NEEDS CLIENT INPUT** |
| Brojevi pregleda videa (12.400, 8.900…) | **PLACEHOLDER** — dizajnerski; povući stvarno ili ukloniti |
| Naslovi, trajanja i poglavlja četiri videa | **NEEDS CLIENT INPUT** — arhiv postoji, metapodaci nisu potvrđeni |
| Cene | **NEEDS CLIENT INPUT** |
| Pravni tekstovi | **NEEDS CLIENT INPUT** |
| Kontakt email, domen, radno vreme | **NEEDS CLIENT INPUT** |

**Pravilo za launch:** nijedan `NEEDS CLIENT INPUT` ne sme da bude javno vidljiv. `PLACEHOLDER` sme
samo dok sajt nije javan.

---

## 10. Domen

Sanjin domen **nije kupljen preko Vercela** — to je nebitno. Kad da pristup DNS-u, domen se
poveže sa njenim deployment-om. Registrar ne mora da bude Vercel.

Do tada se radi na privremenom hostu. Nijedna arhitektonska odluka ne sme da čeka domen, i
nijedan domen se ne sme upisati u kod kao literal — detaljno u
`P_DIGITALNI_CENTAR_PLAN_v1_0.md §2`.

---

### 10.1 `sanjaneuer.com` — kome pripada i odakle se servira (D-077 A7)

| | |
| - | - |
| Domen | `sanjaneuer.com` (+ `www.` → 308 na apex) |
| Tenant | `sanja-neuer` |
| Servira se iz | **PDC Vercel projekta**, kroz `trusted hostname → domain registry → /s/sanja-neuer/...` |
| **Nije** | zaseban frontend proizvod ni zaseban deployment model |

Njen sadržaj, tema i kompozicija stranica ostaju **organization-scoped** — vezani za organizaciju
`sanja-neuer`, ne za deployment. To je i razlog što PDC-1 Page Composer ne mora da čeka migraciju:
radi nad `organizationSlug`-om bez obzira da li on stiže iz env-a ili iz rute.

> Zaseban `sanja-neuer` Vercel projekat koji danas postoji je **privremen migracioni artefakt**
> (`P_DIGITALNI_CENTAR_PLAN_v1_0.md`, PDC-0C superseded blok), ne model za buduće tenante.

---

## 11. Admin panel za Sanju

Sidebar (srpski UI, `ui_locale = sr-Latn`):

| Stavka | Sadržaj |
| ------ | ------- |
| **Početna** | sledeći termini · novi zahtevi · nov Intake · sadržaj u draftu · poslednja pitanja/poruke |
| **Termini** | Booking Engine |
| **Klijenti** | osnovni podaci · appointments · Intake · program/mentorstvo · dozvoljene beleške · istorija komunikacije/statusa |
| **Sadržaj** | Stranice · Blog · Video blog · Media |
| **Mentorstvo** | prijave · aktivni klijenti · program · sesije · progress *(kasnije svoj workspace)* |
| **Anketa** | forme · odgovori · rezultati |
| **Podešavanja** | profil · usluge · jezici · radno vreme · Booking · SEO · domen · branding |

### 11.1 Ekran „Stranice"

Lista: `Stranica · Status · Izmenjeno` — Početna (Objavljeno), O meni (Draft),
Konsultacije (Objavljeno), Mentorstvo (Objavljeno)…

Klik na stranicu otvara hijerarhiju sekcija iz §4.1. Klik na sekciju otvara njene blokove.
Radnje: edituj · promeni redosled · dodaj · sakrij · preview · draft · publish.

> Beleške o klijentima: „dozvoljene beleške" nije proizvodna specifikacija. Šta psiholog sme
> da upiše i koliko se čuva je **pravno i kliničko pitanje**, ne UX. Ide na STOP listu pre
> nego što se ekran „Klijenti" gradi.

---

## 12. Client Panel — My Workspace

Za Sanju se **ne pravi prazan portal**. Klijent posle prijave dobija konkretno:

- **Sledeća konsultacija**
- **Moji termini**
- **Moj Intake** (šta je popunio)
- **Materijali**
- **Preporučeni sadržaj** (njeni video/članci)
- **Mentorstvo** — ako ga koristi

Kasnije: zadaci · private resources · program progress · sačuvani članci i video sadržaj.

Time `My Workspace`, koji već postoji u Psihointegritet konceptu, konačno dobija stvarnog
korisnika umesto demo podataka.

---

## 13. Definicija gotovog za prvi Sanja release

> **Mogu sama da uređujem sajt i objavljujem sadržaj, klijent može da me pronađe kroz sadržaj,
> prijavi se, popuni Intake, zakaže razgovor i dobije svoj prostor.**

Kriterijum više nije „šta još treba završiti od Psihointegriteta", nego:

> **Šta mora da radi da Sanja može P. DC da koristi bez Milana za svakodnevni posao?**

Obim koji iz toga sledi: `Pages → Blog/Video → Booking → Intake → Clients → Workspace`.
Sve ostalo se nadograđuje oko toga.

### 13.1 Van prvog Sanja release-a

Ne treba nam još: multi-provider matching · B2B Companies · veliki Program Builder · napredni
Kompas · veoma kompleksne ankete · AI dijagnostika · deset AI agenata · potpuno slobodan page
builder.

Postoje kao platform direction. Sanji trenutno ne donose dovoljno.

---

## 14. Veze sa ostalom dokumentacijom

| Dokument | Veza |
| -------- | ---- |
| `P_DIGITALNI_CENTAR_PLAN_v1_0.md` v1.1 | Revizija (§3), PDC-0A…0E + kriterijumi prihvatanja (§4), faze (§5), arhitektonska pravila (§6) |
| `PRODUCT_DECISIONS.md` D-080 | Odluka o repozicioniranju platforme i statusu psihointegritet.com |
| `PRODUCT_DECISIONS.md` D-077 | C2(a): jedan deployment = jedna organizacija — određuje kako Sanja postaje tenant |
| `CMS_TODO.md`, `CONTENT_MODEL_MATRIX_v0.1.md` | Postojeći content model koji Content Engine nasleđuje |
| `PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.1.md` | Booking ugovor — ne redizajnirati |
| `PSIHOINTEGRITET_INTAKE_MATCHING_ENGINE_v0.1.md` | Intake spec; matching deo Sanji ne treba |
| `adr/ADR-023-multi-tenant-isolation-and-rls.md` | `organization_id` kao jedina granica izolacije |
| `adr/ADR-026-organization-locale-and-route-registry.md` | Locale i registar ruta po organizaciji |
