# Handoff: Psihointegritet — Control Center, Superadmin i Klijentski panel

> **Za Claude Code u VS Code-u.** Dokument je samodovoljan — programer (ili Claude Code) koji nije bio u razgovoru može da implementira sva tri panela iz njega + priloženih dizajn referenci.

---

## 1. Overview

Tri aplikativne celine kontrolnog sistema platforme **Psihointegritet** (digitalni centar za mentalno zdravlje, Niš):

| Panel | Fajl reference | Korisnici | Karakter |
|---|---|---|---|
| **Control Center** | `Psihointegritet Control Center.dc.html` | Vlasnica centra (Anja) + terapeuti | Operativni radni interfejs. Mobilni prikaz je **primarni**, desktop je prošireni oblik — ne dva odvojena dizajna. |
| **Superadmin** | `Psihointegritet Superadmin.dc.html` | Platform tim | Odvojena aplikativna celina, desktop-first, pretežno **read-only**. Potvrđuje rute, autorizaciju i multi-tenant strukturu. |
| **Klijentski panel** | `Psihointegritet Klijent Panel.dc.html` | Klijenti centra | Mobile-first **centrirana app kolona** (max 480px) na svim širinama — kao web app. |

Dizajn nasleđuje odobreni javni sajt: ista paleta, kartice, tipografija i ton (miran, topao, profesionalan — bez izgleda bolničkog softvera).

## 2. O dizajn fajlovima (PROČITAJ PRVO)

Priloženi `.dc.html` fajlovi su **dizajn reference napravljene u HTML-u** — interaktivni prototipovi koji pokazuju kako paneli treba da izgledaju i da se ponašaju, a **NE produkcioni kod za copy-paste**.

- Otvaraju se direktno u browseru (uz `support.js` i `assets/` u istom folderu). Klikći su funkcionalni: navigacija, tabovi, draweri, sheetovi, potvrde zahteva, feature-gate modal.
- Suzi prozor ispod 1024px da vidiš mobilne varijante (bottom navigacija, full-screen sheetovi).
- **Zadatak:** rekreirati ekrane u **Next.js + TailwindCSS** projektu (arhitektura v0.3: `frontend/` Next.js 16 na Vercelu + `backend/` FastAPI), koristeći tokene iz `tailwind.config.ts` / `globals.css` i obrasce postojeće kodne baze. Ne kopirati inline HTML/JS iz referenci.

## 3. Fidelity: **High-fidelity (hifi)**

Boje, tipografija, razmaci, radijusi i statusne boje su finalni — rekreirati pixel-blizu kroz prave React komponente i Tailwind klase. Podaci u referencama su demo (Ana Marković, TechNiš itd.) i dolaze iz API-ja.

## 4. Tech stack & setup

| Sloj | Izbor |
|---|---|
| Framework | **Next.js 16 (App Router)**, React 19, TypeScript, Server Components default |
| Styling | **TailwindCSS** — tokeni u priloženom `tailwind.config.ts`, semantičke klase u `globals.css`, **bez inline CSS-a** |
| Ikonice | `lucide-react` — proste linijske, stroke 1.8 (layout-grid, calendar-days, users, building-2, tag, bar-chart-3, user-round, bell, plus, lock, activity, sliders-horizontal, log-out, chevron-right, arrow-left, clock, video, map-pin, check, x) |
| Fontovi | **Newsreader** (naslovi/brojevi/imena, serif 400 + italic) + **Instrument Sans** (UI/body 400–600) preko `next/font/google` → CSS varijable `--font-newsreader`, `--font-instrument`; `ui-monospace` za tehničke vrednosti u superadminu |
| Auth | **Clerk** — role: `superadmin` \| `vlasnik` \| `terapeut` \| `klijent` |
| Data | TanStack Query + typed OpenAPI klijent ka FastAPI backendu |
| Jezik | Srpski (latinica); ijekavica samo u stručnim tekstovima terapeuta |

**Setup:** kopiraj `tailwind.config.ts` + `globals.css`, poveži fontove u `app/layout.tsx`, instaliraj `lucide-react`.

## 5. Design tokeni (sažetak — pune vrednosti u fajlovima)

**Boje**
| Token | Hex | Upotreba |
|---|---|---|
| `forest` | `#2E3B2E` | admin sidebar, primarna dugmad, naslovi, tamne hero kartice |
| `sage` | `#8A9D82` | eyebrow labele, ikonice, progress fill |
| `meadow` | `#C6D5A8` | aktivna stanja, CTA na tamnoj podlozi, uspeh-akcenti |
| `warm` | `#D1A48C` | bedževi za pažnju, kapacitet kompanija, **superadmin akcenat** |
| `coffee` | `#3A2E28` | primarni tekst; **superadmin sidebar** (razlikuje panele) |
| `canvas` | `#FAF8F3` | pozadina svih panela |
| `surface` | `#FFFFFF` | kartice |
| `shell` | `#EDE9DF` | pozadina oko mobilne kolone klijentskog panela |
| `danger` | `#B3402E` | destruktivne akcije, otkazani termini |

Prigušeni tekst = `coffee` sa alfa: 0.7 / 0.55 / 0.45. Border kartica `rgba(58,46,40,0.06)`, border pilula `rgba(58,46,40,0.14)`.

**Tipografija** — Newsreader: h1 ekrana 34px/400 (mobilno 26–28px), naslovi kartica 20–25px, statistike 27–34px, vremena u agendi 17px. Instrument Sans: body 14–14.5px, meta 12.5–13px, eyebrow 11–11.5px/600/uppercase/tracking 0.14em, bedževi 11.5–12px/600.

**Radijusi** — kartice 20px, sekcije 22px, hero 24px, sheet 26px (gornji uglovi), pločice/inputi 14px, pilule 999px. **Spacing** — content max 1160px, padding 30/32px (mobilno 20/16px); gap grid-ova 14px; sidebar 264px.

## 6. Statusni sistem (jedan kroz celu platformu)

Bedž = **tekst + tačka u boji, nikada samo boja**: `.badge .badge-ok` itd. iz `globals.css`.

| Status | Klasa | Boje (fg / bg) |
|---|---|---|
| Potvrđen · Aktivan · Održan · Operativan · Uključeno | `badge-ok` | `#3D6B3D` / `rgba(198,213,168,0.45)` |
| Čeka potvrdu · Zahtev primljen · Novi upit · Nedodeljen · Degradiran | `badge-wait` | `#96562F` / `rgba(209,164,140,0.30)` |
| Predložena izmena · Pilot program | `badge-soft` | `#5E6F4A` / `rgba(198,213,168,0.30)` |
| U pripremi · Ponuda poslata | `badge-amber` | `#8A6A3B` / `rgba(209,164,140,0.22)` |
| Završen · Neaktivan · Isključeno · Nacrt | `badge-neutral` | `rgba(58,46,40,0.62)` / `rgba(58,46,40,0.07)` |
| Otkazan (klijent/terapeut) · Odbijen · Nije došao · Pao | `badge-danger` | `#B3402E` / `rgba(179,64,46,0.12)` |
| Kompanijski/rezervisan termin | `badge-dark` | `#2E3B2E` / `rgba(46,59,46,0.10)` |

Statusi termina (master plan §6.1, 11 vrednosti): `held, requested, alternative_proposed, confirmed, change_requested, cancelled_by_client, cancelled_by_therapist, completed, no_show, declined, expired`.

## 7. Komponente (shared library — `components/`)

1. **AppShell** — admin/superadmin: fiksni sidebar 264px (forest / coffee) + `<main>` max 1160px; ispod 1024px sidebar nestaje, pojavljuje se **BottomNav**. Klijentski panel: centrirana kolona `max-w-app bg-canvas shadow-col`.
2. **Sidebar** — logo „Psihointegritet" + tačka `warm`; caption sekcije (10px, uppercase, cream 38%); stavke 14px/600, aktivna `bg-white/12 text-canvas`; brojčani bedž (`warm`) na Terminima; footer: role switch (segmented pill) + user chip. Superadmin: bedž „SUPERADMIN" (warm pill sa shield ikonom) i sekcija SISTEM.
3. **Topbar** — sticky, `bg-canvas/88 backdrop-blur`, donji border; datum (desktop), zvonce sa tačkom, „Brza akcija" (primary pill, samo desktop), izbor terapeuta (pill cycler, samo vlasnik). Superadmin: „Svi sistemi operativni" + `v0.4.2 · produkcija` (mono).
4. **BottomNav** — mobilno: bela traka, grid stavki (ikona u pilula-pločici 42×26 + labela 10.5px); admin ima **centralno kružno `+` dugme** 54px (forest, `shadow-fab`, izdignuto −14px) koje otvara QuickActionSheet.
5. **StatusBadge** — vidi §6.
6. **StatCard** — bela kartica: broj (serif 27–34px) + tačka u boji + labela 12.5px.
7. **PriorityCard** — StatCard + opis + CTA link „→"; klik vodi na relevantni ekran.
8. **AgendaRow** — grid `64px 1fr auto`: vreme (serif 17px), klijent + meta (usluga · format · terapeut), StatusBadge desno; hover `bg-meadow/14`; **slobodan slot** = italic + dashed „+ Zakaži" dugme.
9. **TabPills** — `.tab-pill` + `.is-active`; horizontalni scroll na mobilnom.
10. **FilterChips** — pasivne pilule (aktivan filter `bg-meadow/25 border-sage/30`).
11. **Drawer / BottomSheet** — detalj termina: desktop desni drawer 430px (`shadow-drawer`, `animate-drawer`); ispod 1024px full-screen bottom sheet (radius 26px gore, grab handle, `animate-sheet`). Sadržaj: status, redovi klijent/vreme/format/terapeut/izvor, **Intake sažetak** (meadow kartica + napomena „nije dijagnoza"), akcije: primarna (Potvrdi / Označi održan), sekundarne u gridu (Predloži drugi termin, Prebaci terapeutu), separator, **Otkaži** (danger-ghost, odvojeno od primarnih).
12. **QuickActionSheet** — Novi termin / Novi klijent / Nova kompanija / Nova usluga / Blokiraj vreme; desktop popover ispod topbara, mobilno bottom sheet. `+` je kontekstualan: na Terminima znači novi termin, na Klijentima novi klijent.
13. **RequestCard** — inicijali (warm), ime + StatusBadge, traženi termin, izvor, starost zahteva („pre 4 sata", warm), Intake red; akcije: Potvrdi (primary) / Predloži izmenu (outline) / Odbij (danger-ghost).
14. **EntityHeader** — profil klijenta/kompanije/terapeuta: avatar (inicijali ili foto sa meadow prstenom 2–3px), serif ime 30px, bedževi, ključne činjenice desno.
15. **KV** — `.kv-label` + vrednost (14px/600 ili serif broj 20–21px) u `grid-cols-2`.
16. **ProgressBar** — `.track > .fill`; sage = popunjenost/ankete, meadow na tamnom, warm = kompanijski fond.
17. **Toggle** — 40–42×23–24px, uključen `bg-sage`, isključen `bg-coffee/18`.
18. **WeekGrid** — desktop-only 5 kolona (Pon–Pet): header (serif dan + datum) + mini kartice u statusnoj boji (vreme, ime, status). Na mobilnom se **ne prikazuje** — koristi se dnevna agenda.
19. **ConfirmModal** (superadmin) — centriran 440px: naziv gate-a, `stara → nova` vrednost, **obavezan razlog** (input), warm napomena „upisuje se u Audit Log", Odustani / Potvrdi promenu.
20. **HealthRow / GateRow** — grid redovi sa mono meta kolonom i StatusBadge/toggle desno.
21. **EmptyDashedCard** — `border-dashed` + „Uskoro" bedž (`badge-amber`) za planirane module.

## 8. Ekrani

### 8.1 Control Center (`/admin`)

Sidebar: Pregled, Termini, Klijenti, Kompanije · POSLOVANJE: Usluge i cene, Istraživanja · TIM: Terapeuti, Moj profil · PODEŠAVANJA (→ „U pripremi"). Mobilna navigacija: Pregled, Termini, **+**, Klijenti, Više (Više = sheet sa ostatkom + role switch).

| Ruta | Ekran | Sadržaj |
|---|---|---|
| `/admin` | **Pregled** | Pozdrav + datum; 4 prioritetne kartice (zahtevi za potvrdu sa najstarijim, nedodeljeni, novi upit kompanije, otkazani) → vode na ekrane; „Današnji raspored" (AgendaRow lista, klik → drawer); aside: „Ova nedelja" (tamna kartica, bar po danu + popunjenost) i istraživanja teaser. |
| `/admin/termini` | **Termini** | Tabovi: Danas / Nedelja (desktop) / Predstojeći / **Zahtevi** (bedž) / Lista čekanja. Zahtevi imaju inline akcije koje menjaju status; napomena o isteku zahteva posle 24h. |
| `/admin/klijenti` | **Klijenti** | Tabovi Svi / **Nedodeljeni** (bedž). Filteri: terapeut, aktivan, online/uživo, ima/nema budući termin, kompanijski program. Kartica: ime, terapeut, sledeći termin, format · usluga, status. Nedodeljeni: inicijali, datum + starost zahteva, format, starosna grupa, oblasti (chips), preporučeni terapeuti, razlog; akcije Preuzmi / Dodeli / Pošalji link — posle preuzimanja ostalima je vidljivo samo ko je preuzeo. |
| `/admin/klijenti/[id]` | **Profil klijenta** | Header + tabovi: Pregled (kontakt, način rada, izvor, brojači) · Termini (istorija sa statusima) · Usluge i paketi (paket kartica sa kreditima i istekom, voucher) · **Intake sažetak** (kome/način/oblasti/preferencije, citat „sopstvenim rečima", razlog preporuke, napomena da nije dijagnoza) · Saglasnosti (checklist sa datumima; **bez anamneze i kliničkih beleški**). |
| `/admin/kompanije` | **Kompanije** | Pipeline chips (Novi upit → … → Aktivna); kartice: naziv, status, kontakt, model, krediti (warm bar), ističe. |
| `/admin/kompanije/[id]` | **Profil kompanije** | Tabovi Pregled / Program / Kapacitet (+ Pozivnice, Izveštavanje „uskoro"). Kapacitet: kupljeno/iskorišćeno/rezervisano/preostalo (+preneto), bar, **privacy kartica**: kompanija nikad ne vidi identitete ni teme. |
| `/admin/usluge` | **Usluge i cene** | Katalog kartice: javni naziv + interni kod (mono), status, trajanje/cena/format/terapeuti, varijante cena (chips: standardna, studenti, kompanijska, paket…), pravila (ručna potvrda, buffer, otkazivanje). |
| `/admin/istrazivanja` | **Istraživanja** | Filter chips (period/stranica/uređaj/završeni); 4 StatCard (draweri, započeti, završeni, completion); anketa kartica: pitanja sa bar rezultatima, otvoreni odgovori (citati); napomena o anonimnosti. |
| `/admin/terapeuti` | **Terapeuti** | Kartice sa fotografijom, zvanjem, klijentima, popunjenošću (bar), „prima nove" bedž. |
| `/admin/terapeuti/[id]` i `/admin/profil` | **Profil terapeuta** | Tabovi: **Javni profil** (citat-bio, oblasti, usluge, grad, jezici) · **Matching preferencije** (lock ikona; interna napomena; starosne grupe, max novih mesečno, prioritet, „trenutno ne prima" chips u warm; toggles: prima nove/kompanije/radionice) · **Dostupnost** — 4 odvojena sloja sa explainer karticom: 1 Radno vreme · 2 Raspoloživi slotovi (generisani) · 3 Izuzeci (odmor…) · 4 Rezervisani kapacitet (kompanije). |

**Uloga Terapeut** (switch u sidebaru): skriva Kompanije, Poslovanje, Terapeute i Podešavanja; bez izbora terapeuta u topbaru; vidi samo svoje termine/klijente/profil.

### 8.2 Superadmin (`/superadmin`, desktop-first)

Navigacija: Pregled, Tenanti, Feature Gates, Dijagnostika + Pretplate/Audit Log/Podešavanja („uskoro"). Mobilno: Pregled, Tenanti, Dijagnostika, Gates.

| Ruta | Ekran | Sadržaj |
|---|---|---|
| `/superadmin` | **Pregled** | 8 StatCard (tenanti, korisnici, terapeuti, klijenti, termini danas, zahtevi, neuspeli emailovi, upozorenja); **Platform Health** lista (Frontend/Backend/PostgreSQL/Redis/QStash/Resend/Clerk, mono latencije, statusi); **Poslednja aktivnost** feed. U prvoj verziji vrednosti mogu biti hardkodovane / sa `/health` endpointa. |
| `/superadmin/tenants` | **Tenanti** | Red-kartica tenanta (naziv, domen+slug mono, vlasnik, plan, brojači, status) + dashed „Novi tenant · uskoro". |
| `/superadmin/tenants/[id]` | **Profil tenanta** | Header sa **„Otvori tenant control panel"**; tabovi Pregled (podaci + engine chips + **interna beleška** warm kartica) / Funkcionalnosti (read-only gate lista) / Potrošnja (8 read-only brojeva) + Korisnici/Pretplata „uskoro". Bez brisanja tenanta i impersonacije. |
| `/superadmin/features` | **Feature Gates** | Registar tabela: funkcionalnost + opis, min. plan (chip), tenant override (mono), status + **toggle**. Promena → ConfirmModal sa obaveznim razlogom → upis u Audit Log + feed. „U pripremi" gate-ovi su zaključani (lock). |
| `/superadmin/diagnostics` | **Dijagnostika** | Akcije: **Pokreni proveru** (spinner stanje), Kopiraj tehničke podatke, Označi kao pregledano. Grupe: Servisi · Aplikacija 24h (poslednji booking/email, neuspeli emailovi, API greške, spore operacije, neobrađeni Intake) · **Tenant health** (domen, SSL, backend, email/DKIM ⚠, gate-ovi, poslovi) + „Nalaz" kartica. Bez automatskih popravki. |

**Bezbednost (obavezno):** svaka `/superadmin/*` ruta i svaki endpoint zasebno proveravaju `SUPERADMIN` ulogu na serveru (middleware + server-side check) — ne samo skrivanje linkova. Poseban layout, rute nevidljive običnim korisnicima.

### 8.3 Klijentski panel (`/panel`, centrirana kolona)

Bottom nav: Početna, Termini, Programi, Profil. Header: logo, zvonce, avatar-inicijali.

| Ruta | Ekran | Sadržaj |
|---|---|---|
| `/panel` | **Početna** | Pozdrav + datum; **hero forest kartica** sledećeg termina (datum serif, terapeut sa fotografijom, Online bedž, „Uđi na sesiju" meadow + „Detalji termina" outline, napomena o linku); quick kartice: Zakaži termin (meadow) + Moj paket (warm); kartica aktivnog programa sa progress barom. |
| `/panel/termini` | **Moji termini** | Tabovi Predstojeći/Istorija; kartica: datum-pločica (mesec+dan), vreme · usluga, terapeut · format, status; dashed „+ Zakaži novi termin". Klik → **bottom sheet**: detalji + „Zatraži pomeranje" (primary) i „Otkaži termin" (danger-ghost, odvojen) + napomena o pravilu 24h; posle akcije sheet prikazuje potvrdu, status kartice se menja. |
| `/panel/programi` | **Programi i paketi** | Program kartica sa checklistom modula (✓ završeni, numerisani predstojeći); tamna paket kartica: krediti 3/5, bar, ističe, „Iskoristi kredit". |
| `/panel/profil` | **Profil** | Avatar + kontakt; kartica „Vaš terapeut" (foto + Zakaži); **toggles obaveštenja** (potvrde, podsetnik 24h, novosti); Politika privatnosti / Moje saglasnosti; Odjavi se (danger). |

**Zakazivanje (sheet):** lista usluga sa meta podacima → izbor → success stanje „Zahtev je poslat — terapeut potvrđuje" + novi termin u listi sa statusom *Čeka potvrdu*. Klijent nikad ne dobija instant-potvrdu bez terapeuta.

## 9. Routing / folder struktura (App Router)

```
app/
├── (admin)/admin/
│   ├── layout.tsx            # AppShell (sidebar+bottomnav), guard: vlasnik|terapeut
│   ├── page.tsx              # Pregled
│   ├── termini/page.tsx      # ?tab=danas|nedelja|predstojeci|zahtevi|cekanje
│   ├── klijenti/page.tsx     # ?tab=svi|nedodeljeni
│   ├── klijenti/[id]/page.tsx
│   ├── kompanije/page.tsx
│   ├── kompanije/[id]/page.tsx
│   ├── usluge/page.tsx
│   ├── istrazivanja/page.tsx
│   ├── terapeuti/page.tsx
│   ├── terapeuti/[id]/page.tsx
│   └── profil/page.tsx       # Moj profil (terapeut)
├── (superadmin)/superadmin/
│   ├── layout.tsx            # poseban layout, guard: SUPERADMIN (server-side)
│   ├── page.tsx              # Pregled platforme
│   ├── tenants/page.tsx
│   ├── tenants/[tenantId]/page.tsx
│   ├── features/page.tsx
│   ├── diagnostics/page.tsx
│   ├── billing/page.tsx      # „U pripremi"
│   └── audit-log/page.tsx    # „U pripremi"
├── (klijent)/panel/
│   ├── layout.tsx            # centrirana kolona + bottom nav, guard: klijent
│   ├── page.tsx              # Početna
│   ├── termini/page.tsx
│   ├── programi/page.tsx
│   └── profil/page.tsx
components/  (AppShell, Sidebar, Topbar, BottomNav, StatusBadge, AgendaRow, Drawer,
              BottomSheet, QuickActionSheet, RequestCard, StatCard, TabPills, KV,
              ProgressBar, Toggle, WeekGrid, ConfirmModal, ...)
```

## 10. Uloge i pristup

| Uloga | Pristup |
|---|---|
| **Vlasnik centra** | Tim, svi termini, klijenti, kompanije, usluge i cene, istraživanja, poslovna statistika |
| **Terapeut** | Sopstveni termini, dodeljeni klijenti, javni profil, dostupnost, matching preferencije |
| **Klijent** | Sopstveni termini (zahtev za pomeranje/otkazivanje), programi/paketi, obaveštenja, saglasnosti |
| **Superadmin** | Tenanti, feature gates, dijagnostika, pretplate, audit — odvojena celina; tenant vlasnici je ne vide |

## 11. Mobilna UI pravila (obavezna)

- touch mete ≥ **44×44px**; jedna primarna akcija po ekranu; sticky naslov i glavna akcija;
- **full-screen/bottom sheet umesto malog modala**; filteri kao bottom sheet; tabele → kartice;
- nedeljni kalendar → dnevna agenda; statusi **tekst + boja, nikad samo boja**;
- destruktivne akcije odvojene od primarnih (separator + danger-ghost);
- formulari u kratkim sekcijama, autosave za duže forme, upozorenje pre napuštanja nesačuvanog.

## 12. Interakcije & stanja

- **Navigacija ekrana**: fade-up ulazak (`animate-fade-up`); drawer/sheet ~320–350ms `cubic-bezier(0.22,1,0.36,1)` + scrim fade; hover kartica: translateY(-3px) + `shadow-card`.
- **Statusni tok zahteva**: requested → confirmed / alternative_proposed / declined; zahtev stariji od 24h → expired (klijentu se nude novi termini).
- **Raspoloživost ≠ termin**: četiri sloja iz §8.1 (Dostupnost) čita Booking engine odvojeno — modelovati od početka.
- **Feature gate promena**: toggle → modal (obavezan razlog) → PATCH + audit zapis (ko, akcija, tenant, stara/nova vrednost, razlog, vreme).
- **Loading**: skeleton kartice (`bg-coffee/[0.05]` shimmer); **Empty**: dashed kartica sa CTA; **Error**: input border danger + helper tekst, toast za mrežne greške.
- Intake se svuda prikazuje kao *pomoć pri usmeravanju*, uz napomenu da nije dijagnoza; Research odgovori se ne vezuju za klijenta bez izričite saglasnosti.

## 13. Data modeli (minimalni predlog)

```ts
type Role = "superadmin" | "vlasnik" | "terapeut" | "klijent";
type AppointmentStatus = "held" | "requested" | "alternative_proposed" | "confirmed"
  | "change_requested" | "cancelled_by_client" | "cancelled_by_therapist"
  | "completed" | "no_show" | "declined" | "expired";

interface Appointment { id: string; clientId: string; therapistId: string; serviceId: string;
  startsAt: string; durationMin: number; format: "online" | "uzivo"; location?: string;
  source: "javni_booking" | "vodjeni_izbor" | "kompanijski_program" | "rucno";
  status: AppointmentStatus; intakeSummary?: string; companyId?: string; }

interface Client { id: string; name: string; email: string; phone?: string;
  therapistId?: string; status: "aktivan" | "neaktivan"; format: "online" | "uzivo";
  intake?: IntakeSummary; consents: Consent[]; packageId?: string; companyId?: string; }

interface IntakeSummary { for: string; format: string; areas: string[];
  preferences: string; ownWords: string; recommendationReason: string; }

interface Company { id: string; name: string; status: "novi_upit" | "kontaktirana"
  | "ponuda_poslata" | "pilot" | "aktivna" | "pauzirana" | "zavrsena";
  contact: string; model: "fleksibilni_fond" | "rezervisani_kapacitet" | "hibridni";
  creditsBought: number; creditsUsed: number; creditsReserved: number;
  carryOver: number; contractEnds?: string; employees?: number; }

interface Service { id: string; publicName: string; internalCode: string;
  status: "nacrt" | "aktivna" | "nedostupna" | "u_pripremi" | "arhivirana";
  durationMin: number; priceRsd?: number; format: string; therapistIds: string[];
  priceVariants: { label: string; priceRsd?: number }[];
  manualConfirm: boolean; minAge?: number; bookingBufferH: number; cancelPolicyH: number; }

interface TherapistProfile { id: string; name: string; title: string; photoUrl: string;
  bio: string; areas: string[]; city: string; languages: string[]; acceptsNew: boolean;
  matching: MatchingPrefs;            // INTERNO — nikad u javnom API odgovoru
  availability: AvailabilityLayers; }
interface MatchingPrefs { ageGroups: string[]; maxNewPerMonth: number;
  priority: "nizak" | "srednji" | "visok"; notAccepting: string[];
  companies: boolean; workshops: boolean; }
interface AvailabilityLayers { workingHours: { day: number; from: string; to: string }[];
  slotRule: { durationMin: number; bufferMin: number };
  exceptions: { from: string; to: string; reason: string }[];
  reservedCapacity: { companyId: string; day: number; from: string; to: string }[]; }

interface Tenant { id: string; name: string; slug: string; domain: string; owner: string;
  status: "active" | "trial" | "paused"; plan: string; createdAt: string; note?: string; }
interface FeatureGate { key: string; name: string; description: string;
  status: "on" | "off" | "coming_soon"; minPlan: "Core" | "Partner" | "Growth";
  tenantOverride?: string; }
interface AuditEntry { id: string; actor: string; action: string; tenantId: string;
  previous?: string; next?: string; reason: string; at: string; }
```

## 14. Assets

- **Fotografije terapeuta**: `assets/anja.jpeg`, `assets/marija.jpeg`, `assets/marjan.jpeg` (sa javnog sajta; okrugle, meadow prsten 2–3px).
- **Ikonice**: `lucide-react` — bez custom SVG ilustracija.
- Avatari klijenata = inicijali na `meadow/40` (nedodeljeni/zahtevi: `warm/28`).

## 15. Fajlovi u paketu

| Fajl | Šta je |
|---|---|
| `README.md` | ovaj dokument — kompletna specifikacija |
| `Psihointegritet Control Center.dc.html` | interaktivna referenca admin panela (10+ ekrana, uloge, drawer, sheetovi) |
| `Psihointegritet Superadmin.dc.html` | referenca superadmin panela (pregled, tenanti, gates + modal, dijagnostika) |
| `Psihointegritet Klijent Panel.dc.html` | referenca klijentskog panela (mobile kolona, booking tok) |
| `support.js` + `assets/` | runtime i slike — potrebni samo da reference rade u browseru |
| `tailwind.config.ts` | design tokeni (boje, fontovi, radijusi, senke, širine) |
| `globals.css` | CSS varijable, statusne `badge-*` klase, dugmad, tabovi, animacije |

**Predlog prompta za Claude Code:**
> „Pročitaj `README.md` iz `design_handoff_paneli/` i otvori tri `.dc.html` fajla u browseru kao vizuelnu referencu (suzi prozor za mobilne prikaze). U našem Next.js + Tailwind projektu implementiraj prvo zajedničke komponente (§7) i statusni sistem (§6) sa tokenima iz `tailwind.config.ts`/`globals.css`, zatim ekrane redom: Control Center §8.1 → Klijentski panel §8.3 → Superadmin §8.2. Poštuj rute (§9), uloge (§10) i mobilna pravila (§11). Ne kopiraj HTML iz referenci — rekreiraj kroz naše komponente."
