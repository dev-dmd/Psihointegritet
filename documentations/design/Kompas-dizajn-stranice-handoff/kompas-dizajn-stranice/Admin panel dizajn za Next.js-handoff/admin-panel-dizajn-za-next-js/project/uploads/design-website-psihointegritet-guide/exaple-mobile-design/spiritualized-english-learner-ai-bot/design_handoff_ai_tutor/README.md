# Handoff: Flexio Lingua — AI Language Tutor (EN ↔ SR)

> **Za Claude Code u VS Code-u.** Ovaj dokument je dovoljan sam za sebe — programer (ili Claude Code) koji nije bio u razgovoru može da implementira ceo dizajn samo iz njega + priloženog `design-reference.html`.

---

## 1. Overview

**Flexio Lingua** je mobilna aplikacija (mobile-first, radi i na desktopu) za učenje engleskog uz AI tutora koji priča sa učenikom na engleskom i srpskom. Tutor **ispravlja, koriguje i vodi razgovor**. Tri moda komunikacije:

- **Voice → Voice** (učenik priča, tutor odgovara glasom)
- **Voice → Text** (učenik priča, tutor piše)
- **Text → Text** (klasičan chat)

Aplikacija ima **dve role**:
- **Client (učenik)** — koristi lekcije, kreira svoj profil i AI tutor identitete (slotove), vidi svoj napredak, priča/piše sa tutorom.
- **Admin** — sve što i client, plus uređuje lekcije, tutore/persone, kvizove, scenarije i vidi učenike.

---

## 2. O dizajn fajlovima (PROČITAJ PRVO)

Fajlovi u ovom paketu su **dizajn reference napravljene u HTML-u** — prototip koji pokazuje **kako treba da izgleda i da se ponaša**, a NE produkcioni kod za copy-paste.

**Zadatak:** rekreirati ove ekrane u **Next.js + TailwindCSS** projektu (već pripremljen front/back), koristeći postojeće obrasce kodne baze. `design-reference.html` je samo za vizuelnu vernost — ne kopirati njegov inline HTML/JS.

---

## 3. Fidelity: **High-fidelity (hifi)**

Boje, tipografija, razmaci i radijusi su finalni. Rekreirati UI **pixel-blizu** referenci, ali kroz prave React komponente i Tailwind klase. Ikonice su **proste linijske (Lucide)** — u Next.js koristiti **`lucide-react`**.

---

## 4. Tech stack & setup

| Sloj | Izbor |
|---|---|
| Framework | **Next.js (App Router)**, React, TypeScript |
| Styling | **TailwindCSS** (tokeni u `tailwind.config.ts`) |
| Ikonice | `lucide-react` |
| Fontovi | **Overpass** (naslovi/UI) + **Inter** (body) — `next/font/google` |
| i18n | **EN + SR**, prekidač u Settings (predlog: `next-intl` ili `next-i18next`) |
| Voice | Web Speech API / Whisper STT + TTS (vidi §12) |
| Auth | role-based (`client` \| `admin`) — vidi §8 |

**Setup koraci**
1. Kopiraj `tailwind.config.ts` i `globals.css` (priloženi) u projekat.
2. U `app/layout.tsx` učitaj fontove preko `next/font/google` (`Overpass`, `Inter`) i veži na CSS varijable `--font-overpass`, `--font-inter`.
3. Instaliraj `lucide-react`.
4. Postavi i18n provider (`messages/en.json`, `messages/sr.json` — ključevi u §11).

---

## 5. Design tokens

> Kompletne vrednosti su u priloženim `tailwind.config.ts` i `globals.css`. Sažetak:

**Boje**
| Token | Hex | Upotreba |
|---|---|---|
| `primary` | `#7C4DFF` | glavni purpur, aktivni elementi, brojevi napretka |
| `primary.light → primary.deep` | `#9747FF → #6F00FF` | gradijent dugmadi, banera, mic dugmeta |
| `primary.50` | `#EFEBFF` | pozadina ikon-pločica, soft tagovi |
| `card` | `#F3F6FB` | kartice, inputi |
| `ink` | `#1E1E22` | primarni tekst |
| `muted` | `#9C9BC2` | meta tekst, placeholderi |
| `muted2` | `#6B7280` | body copy |
| `track` | `#E1E6EE` | track progres prstena/bara |
| `line` | `#EDEFF4` | tanke linije/divideri |
| `danger` | `#EF5E5E` | Delete / Log out |
| `success` | `#22B07D` | online / tačan odgovor |

**Tipografija** — Overpass: 800 (h-screen 30px), 800 (h-section 19px), 700 (naslovi kartica 15–16px). Inter: 400/600 za body, meta, labele (12–14px).

**Radijusi** — kartice 16px, pločice/inputi 14px, lesson kartice 18px, pilule 999px, donji drawer 30px (gornji uglovi), telefon frame 36px.

**Senke** — `soft` (purpurni glow ispod primarne dugmadi/mic), `card` (lebdeći čipovi/zvonce), `tile` (ikon-pločice).

**Spacing** — bazni padding ekrana **22px** levo/desno; gap između sekcija **24–28px**; gap u grid karticama **14px**.

---

## 6. Komponente (component library)

Napraviti kao reusable React komponente. Sve vrednosti vidljive u `design-reference.html`.

1. **StatusBar** — vreme + signal/wifi/baterija (mock; opciono sakriti na webu).
2. **Button** — varijante: `primary` (gradijent, bele slovo, `shadow-soft`), `white` (belo, purpur tekst), `ghost` (`bg-card`). Visina ~52px, radius 16px.
3. **IconButton** — kružno 54px, gradijent, beli ikon (npr. strelica na Landing-u).
4. **LessonCard** (ključna kartica iz slike, 2-kolonski grid) — `bg-card`, radius 18px, padding 16px. Gore levo **ikon-pločica** (46px, bela, purpur ikon, `shadow-tile`), gore desno **arrow-up-right** u belom krugu 32px. Dole: naziv (700, 15.5px) + meta („50% completed", 12px muted).
5. **CategoryRow** (lista) — horizontalna kartica: ikon-pločica + naziv + meta + `chevron-right`.
6. **ProgressCard** — kružni prsten (`conic-gradient`, vidi `.ring` u globals.css) sa „5/12" u sredini + naziv + remaining.
7. **ProgressBar** — labela + procenat (purpur, 800) + track 9px sa gradijent fill-om. Koristi se na Profile/Progress.
8. **Pill / FilterTabs** — pilule; aktivna = `bg-primary` belo, neaktivna = `bg-card` muted.
9. **Chip / Selector** — za izbor Scenario/Persona/Level; aktivan = `bg-primary` belo, radius 12px.
10. **Avatar** — krug 46px (init „AJ" ili slika), gradijent fallback.
11. **Bell / circular action** — beli krug 46px sa ikonom + purpur tačka za notifikaciju.
12. **BottomNav** — 4 ikone (`home`, `calendar-days`, `message-circle`, `user`); aktivna u gradijent krugu sa glow-om.
13. **SlotCard** — vidi §7.5.
14. **ChatBubble** — `ai` (`bg-card`, levo, ugao dole-levo 6px) i `me` (gradijent, belo, desno). AI/učenik. **Correction inline**: ispod učenikove poruke tanka linija + purpur ispravka („✏︎ ...").
15. **VoiceDock** — waveform (niz tankih purpur barova) + veliki **mic** 64px (gradijent, glow, prsten oko). Vidi §12.
16. **ModeToggle** — segment Voice / Text (pilula, aktivni segment belo sa senkom).
17. **SuccessDrawer / BottomSheet** — scrim + beli sheet (radius 30px gore), grab handle, **scalloped seal sa kvačicom** (purpur outline), naslov, stat-box (2 kolone), primarno dugme. (Vidi `Exercise completion` na Figmi.)
18. **Toggle/Switch** — purpur kad uključen.
19. **Input** — `bg-card`, radius 14px, placeholder muted, opciono trailing ikon (mail/eye).

---

## 7. Ekrani (screen-by-screen)

> Numeracija prati `design-reference.html`. Padding ekrana 22px L/R osim ako drugačije.

### 7.1 — Landing / Intro (`/`, public)
- Mini header: logo „Flexio**Lingua**" + EN·SR jezički tag.
- Centralna **robot maskota** (za sada CSS/emoji placeholder — kasnije 3D render slika; ostavi `<RobotMascot/>` komponentu da se lako zameni slikom). Iza nje neomorfne meke purpur mrlje (radijalni gradijenti).
- **Tri kružna dugmeta SA IKONICAMA bez teksta** ispod robota:
  1. `play-circle` → **About / demo**
  2. `layout-grid` → **Lessons** (izlistane lekcije sa opisom/placeholder tekstom)
  3. `users` → **Personas / our tutors**
- Naslov: „Smart Bot Powers Your Lessons" + podnaslov.
- Dno: **Start Learning** (belo dugme, flex-1) + kružno `arrow-right` dugme.
- **Akcija:** `Start Learning` → ako nije ulogovan vodi na **Sign In / Register**; ako jeste → Home.

### 7.2 — Sign In (`/sign-in`, auth)
- Back strelica, naslov „Sign In" (centriran).
- Polja: **Email Address**, **Password** (eye toggle).
- **Continue** (primary). Link „Don't have an account? **Create Account**".
- Divider „Or" + social (Google / Apple / Facebook).
- *(Figma sadrži i OTP korake — opciono: Sign-up → OTP → Password.)*

### 7.3 — Sign Up (`/sign-up`, auth)
- Full Name, Email, Password → **Create Account**. Link na Sign In.

### 7.4 — Home / Coach (`/home`, client)
- Header: avatar + „Hi 👋 / Alice Johnson" levo, **bell** desno.
- Veliki naslov: „Your Smart AI Language Coach".
- **FilterTabs**: All / Speaking / Reading / Grammar.
- **2-kolonski grid LessonCard-ova**: Reading (50%), Listening (40%), Speaking (70%), Conversation (80%). Tap → odgovarajuća aktivnost u Classroom-u.
- **BottomNav** (Home aktivan).

### 7.5 — Dashboard · My Tutor Slots (`/slots`, client)
- Naslov „My Tutor Slots" + „2 of 5 slots used"; desno `plus` dugme (Create).
- **SlotCard** lista. Svaki slot:
  - ikon-pločica (po scenariju) + **naziv** („Business English") + podnaslov (scenario) + **level badge** („B1", `primary.50`).
  - red: `Tutor: Viktor · Scenario: Job Interview`.
  - akcije: **Open** (purpur, → Classroom) i **Delete** (belo, danger okvir).
- **Create Slot** (isprekidana kartica) → 7.6.
- Footer: „Slot limit: 2 / 5 used". **Maks 5 slotova** — kad je 5, sakrij/zaključaj Create.

### 7.6 — Create Slot (`/slots/new`, client)
- Back + „Create Slot".
- **Slot title** (input).
- **Scenario** (chips): Business · Everyday conversation · **Job Interview** · Shopping · Travel.
- **Persona / Tutor** (chips): Claudia · **Viktor** · Kiki · Maria.
- **Level** (chips): A1 · A2 · **B1** · B2 · C1.
- **Create Slot** (primary, dno). Posle kreiranja → nazad na 7.5 sa novim slotom.
- *Primer popune:* `Business English` / Scenario: Job Interview / Tutor: Viktor / Level: B1.

### 7.7 — Classroom (`/slots/[id]`, client)
- Back + „Classroom" + podnaslov slota („Business English · Viktor · B1").
- **Grid kartica** (kao na slici — ikon gore-levo, naziv dole): **Conversation, Speaking, Listening, Reading, Writing, Quizzes, Progress, Profile** + lista-red **Settings**.
- Tap kartice → odgovarajući ekran (Conversation → 7.8, Progress → 7.9 progres deo, Profile → 7.9, Settings → 7.13).

### 7.8 — Conversation / Voice (`/slots/[id]/conversation`, client)
- Header: back + tutor avatar + ime + status („● Listening…", success boja) + `phone-off` (kraj sesije).
- **ModeToggle**: Voice / Text.
- **Chat** sa ChatBubble-ovima; AI vodi, učenik odgovara, **inline correction** ispod učenikove poruke.
- **VoiceDock** dole: waveform + veliki **mic** (drži/tapni za snimanje). Vidi §12.

### 7.9 — Profile + Progress (`/profile`, client)
- Back + „Profile".
- Avatar 84px sa **edit (pencil)** bedžom (menja sliku), **ime** (editable), podnaslov („Level B1 · 14-day streak 🔥").
- **Progress** sekcija — 5 **ProgressBar**-ova: **Grammar 78%, Vocabulary 64%, Pronunciation 52%, Fluency 71%, Communication 85%**.
- *Edit:* ime + profilna slika su izmenljivi (PATCH user).

### 7.10 — AI Tutor Identity (`/slots/[id]/tutor`, client)
- Back + „AI Tutor Identity". Veliki tutor avatar + ime + opis.
- Lista (id-row, `bg-card`): **Persona** (Viktor), **Voice** (Deep · Male →), **Prompt** (Custom → otvara editor teksta), **Correction style** (Gentle / Strict / Off →).
- **Save Identity** (primary).

### 7.11 — Exercise Completed (drawer overlay)
- Pozadinski ekran zatamnjen (scrim).
- **SuccessDrawer**: seal sa kvačicom, „Great job! Lesson completed", „+120 XP · Pronunciation improved", **stat-box** (Phrases learned / Accuracy), **Next Lesson**.

### 7.12 — Admin · Manage (`/admin`, admin only)
- Naslov „Manage" + **Admin** tag (crni pill, `shield`).
- Lista redova sa brojačima: **Lessons (48), Tutors / Personas (4), Quizzes (120), Scenarios (5), Students (312)**.
- **New Lesson** (primary). Svaki red → CRUD ekran tog resursa.
- BottomNav.

### 7.13 — Settings (`/settings`, client)
- Back + „Settings".
- **Preferences**: App language (English · Srpski, prikaz „EN"), Voice replies (toggle), Notifications (toggle).
- **Account**: AI Tutor Identity (→ 7.10), **Log out** (danger).

---

## 8. Role: Admin vs Client

| Mogućnost | Client | Admin |
|---|---|---|
| Lekcije (koristi) | ✅ | ✅ |
| Kreira/edituje slotove (max 5) | ✅ | ✅ |
| Svoj profil + progres | ✅ | ✅ |
| Chat / Voice sa tutorom | ✅ | ✅ |
| **Uređuje lekcije** | ❌ | ✅ |
| **Uređuje tutore/persone** | ❌ | ✅ |
| **Uređuje kvizove/scenarije** | ❌ | ✅ |
| **Vidi sve učenike** | ❌ | ✅ |

Implementacija: `user.role: 'client' | 'admin'`. Zaštiti `/admin/*` rute (middleware/guard). Admin navigacija ima dodatni „Manage" ulaz.

---

## 9. Data models (predlog)

```ts
type Role = "client" | "admin";
type Level = "A1" | "A2" | "B1" | "B2" | "C1";
type Scenario = "business" | "everyday" | "job_interview" | "shopping" | "travel";
type PersonaName = "Claudia" | "Viktor" | "Kiki" | "Maria";
type CorrectionStyle = "gentle" | "strict" | "off";
type ChatMode = "voice_voice" | "voice_text" | "text_text";

interface User {
  id: string; name: string; email: string; avatarUrl?: string;
  role: Role; level: Level; streakDays: number;
  progress: SkillProgress;           // 0–100 svaka veština
}

interface SkillProgress {
  grammar: number; vocabulary: number; pronunciation: number;
  fluency: number; communication: number;
}

interface TutorSlot {                // max 5 po korisniku
  id: string; userId: string; title: string;     // "Business English"
  scenario: Scenario; level: Level;
  persona: Persona;                  // AI tutor identitet
  createdAt: string;
}

interface Persona {
  name: PersonaName; voice: string;  // "deep-male" itd.
  prompt: string;                    // custom system prompt
  correctionStyle: CorrectionStyle;
}

interface Lesson {                   // admin upravlja
  id: string; type: "reading"|"listening"|"speaking"|"conversation"|"writing"|"quiz";
  title: string; description: string; level: Level; completion?: number;
}

interface Message {
  id: string; slotId: string; role: "ai"|"user";
  text: string; correction?: string; audioUrl?: string; createdAt: string;
}
```

---

## 10. Routing / folder struktura (App Router)

```
app/
├── (public)/
│   ├── page.tsx                 # 7.1 Landing
│   ├── sign-in/page.tsx         # 7.2
│   └── sign-up/page.tsx         # 7.3
├── (app)/
│   ├── home/page.tsx            # 7.4
│   ├── slots/
│   │   ├── page.tsx             # 7.5 My Tutor Slots
│   │   ├── new/page.tsx         # 7.6 Create Slot
│   │   └── [id]/
│   │       ├── page.tsx         # 7.7 Classroom
│   │       ├── conversation/page.tsx  # 7.8 Voice/Text chat
│   │       └── tutor/page.tsx   # 7.10 AI Tutor Identity
│   ├── profile/page.tsx         # 7.9 Profile + Progress
│   └── settings/page.tsx        # 7.13
├── admin/
│   ├── page.tsx                 # 7.12 Manage (guarded)
│   └── [resource]/...           # CRUD lessons/tutors/quizzes/scenarios
components/  (Button, LessonCard, SlotCard, ChatBubble, VoiceDock, ProgressBar, ...)
messages/ (en.json, sr.json)
```

BottomNav stavke: Home → `/home`, Calendar → (raspored/streak), Chat → poslednja konverzacija, Profile → `/profile`.

**App Shell (pristup A — obavezno):** svaki `(app)` ekran je umotan u centriranu kolonu:
```tsx
// app/(app)/layout.tsx
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF0F6]">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-white
                      shadow-[0_30px_60px_-30px_rgba(30,30,34,0.25)]">
        {children}
        {/* <BottomNav/> ostaje unutar kolone */}
      </div>
    </div>
  );
}
```
- `max-w-[480px]` = širina app kolone; `mx-auto` centrira; `bg-[#EEF0F6]` je mirna pozadina oko kolone na desktopu.
- Padding sadržaja unutar kolone: `px-[22px]`. Grid kartica: `grid-cols-2 gap-3.5` (isto na svim širinama).

---

## 11. i18n (EN / SR)

Prekidač u Settings (i EN·SR tag na Landing-u). Sve UI stringove kroz ključeve. Primer:

```jsonc
// messages/en.json
{
  "landing.title": "Smart Bot Powers Your Lessons",
  "landing.subtitle": "AI tutor guides you, personalizes lessons and tracks progress.",
  "landing.start": "Start Learning",
  "home.coach": "Your Smart AI Language Coach",
  "slots.title": "My Tutor Slots",
  "slots.used": "{used} of {max} slots used",
  "slots.create": "Create Slot",
  "slot.open": "Open", "slot.delete": "Delete",
  "create.scenario": "Scenario", "create.persona": "Persona (Tutor)", "create.level": "Level",
  "classroom.title": "Classroom",
  "skill.conversation": "Conversation", "skill.speaking": "Speaking",
  "skill.listening": "Listening", "skill.reading": "Reading",
  "skill.writing": "Writing", "skill.quizzes": "Quizzes",
  "progress.grammar": "Grammar", "progress.vocabulary": "Vocabulary",
  "progress.pronunciation": "Pronunciation", "progress.fluency": "Fluency",
  "progress.communication": "Communication",
  "tutor.persona": "Persona", "tutor.voice": "Voice",
  "tutor.prompt": "Prompt", "tutor.correction": "Correction style",
  "done.title": "Great job! Lesson completed", "done.next": "Next Lesson"
}
```
```jsonc
// messages/sr.json (primer vrednosti)
{
  "landing.start": "Počni učenje",
  "slots.title": "Moji tutori",
  "slots.create": "Napravi slot",
  "skill.conversation": "Razgovor", "skill.speaking": "Govor",
  "skill.listening": "Slušanje", "skill.reading": "Čitanje",
  "skill.writing": "Pisanje", "skill.quizzes": "Kvizovi",
  "progress.grammar": "Gramatika", "progress.vocabulary": "Rečnik",
  "progress.pronunciation": "Izgovor", "progress.fluency": "Tečnost",
  "progress.communication": "Komunikacija"
  /* ...ostali ključevi... */
}
```

---

## 12. Voice UX (govor)

Ekran **Conversation** (7.8) je srce aplikacije.

- **ModeToggle Voice/Text** bira da li je input glas ili tekst.
- **Mic dugme** (64px, gradijent, animirani prsten/glow):
  - tap → start snimanja; aktivno stanje pulsira (prsten `border` purpur, blagi scale).
  - **waveform** se animira dok korisnik priča (niz tankih purpur barova, visine vezane za amplitudu — u referenci su mock; live: Web Audio `AnalyserNode`).
- **Pipeline:** mic → **STT** (Web Speech API ili Whisper) → tekst se šalje LLM tutoru (sa `persona.prompt` + `correctionStyle` + `level`) → odgovor + **correction** → ako je mod `*_voice`, **TTS** izgovara odgovor (`voice` iz persone).
- **Correction** se prikazuje inline ispod učenikove poruke (purpur, „✏︎ ispravljena rečenica"). Stil zavisi od `correctionStyle` (gentle/strict/off).
- Status u headeru: „Listening… / Speaking… / Thinking…".
- `phone-off` završava sesiju → može da okine **SuccessDrawer** (7.11).

---

## 13. Interakcije & stanja

- **Navigacija:** Landing `Start Learning` → auth ako neulogovan; LessonCard/SlotCard tap → ka detalju; Back strelice idu nazad.
- **Tranzicije:** drawer/bottom-sheet uleće odozdo (slide-up ~280ms ease-out) sa scrim fade. Kartice hover/active: blagi scale 0.98 + senka.
- **Loading:** skeleton na karticama (`bg-card` shimmer). Chat: „Thinking…" indikator (tri tačke) u AI buble.
- **Error:** input border `danger`, helper tekst ispod; toast za network greške.
- **Validacija:** email format, password min 8; Create Slot zahteva title + scenario + persona + level; blokiraj Create kad je 5/5 slotova.
- **Responsive (pristup A — web app):** mobile-first sistem koji se na svim širinama prikazuje kao **centrirana app kolona**. Aplikacija je samo web (desktop + laptop + mobilni) — NEMA zaseban desktop layout; isti mobilni sistem dobija udobnu širinu i centriran je. Bottom nav ostaje na svim širinama.
- **Empty states:** nema slotova → istaknuta „Create Slot" kartica; nema poruka → poziv na akciju „Say hello to your tutor".

---

## 14. Assets

- **Robot maskota** — trenutno CSS/emoji placeholder (`<RobotMascot/>`). Zameniti 3D render slikom (purpur/belo robotić). Ostaviti komponentu izolovanu da se lako swap-uje (`<Image src="/robot.png" />`).
- **Ikonice** — `lucide-react` (book-open, headphones, mic, messages-square, pencil, list-checks, trending-up, user-round, settings, bot, languages, volume-2, bell, plus, arrow-up-right, chevron-right, shield, graduation-cap, users-round, layout-grid, bar-chart-3, audio-lines, file-text, spell-check, plane, briefcase).
- **Fontovi** — Overpass + Inter (Google Fonts / `next/font`).
- Bez sopstvenih kompleksnih SVG ilustracija — koristiti placeholdere dok ne stignu prave slike.

---

## 15. Fajlovi u paketu

| Fajl | Šta je |
|---|---|
| `README.md` | ovaj dokument — kompletna specifikacija |
| `design-reference.html` | **vizuelna referenca svih 13 ekrana u čistom Tailwind-u** (otvori u browseru). Klase su prave Tailwind utility klase — mogu se direktno kopirati. Na vrhu je desktop/laptop prikaz centrirane app kolone (pristup A). |
| `tailwind.config.ts` | design tokeni (boje, fontovi, radijusi, senke) |
| `globals.css` | CSS varijable + reusable @layer komponente + progress ring |

**Predlog prompta za Claude Code:**
> „Pročitaj `README.md` i otvori `design-reference.html` kao vizuelnu referencu. Implementiraj ekrane redom (§7) u našem Next.js + Tailwind projektu koristeći tokene iz `tailwind.config.ts`/`globals.css` i `lucide-react` ikonice. Počni od dizajn sistema/komponenti (§6), pa Landing → Auth → Home → Slots → Classroom → Conversation → Profile → AI Tutor Identity → Admin → Settings. Poštuj role iz §8 i i18n iz §11."
