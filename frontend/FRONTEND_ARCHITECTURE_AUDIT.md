# Psihointegritet frontend — arhitektonski pregled i korekcije

**Datum pregleda:** 2026-08-01  
**Obuhvat:** Next.js 16.2.10, React 19.2.4, TypeScript strict, TanStack Query 5, javne forme, Kompas intake tok, slike, provider granice i arhitektonska dokumentacija.

---

## 1. Rezime

Frontend je imao dobru osnovu: App Router stranice i layout-i ostali su Server Components, TypeScript strict pravila su već aktivna, native `<img>` nije korišćen, OpenAPI generated tipovi postoje, a React Query je već uveden u staff workspace.

Glavna potvrđena odstupanja bila su:

- direktni `fetch` pozivi iz vizuelnih Client Components;
- ručno vođenje asinhronog `loading/error/success` stanja koje TanStack Query već poseduje;
- Kompas capability i matching pozivi pokretani kroz `useEffect + setState`;
- nedovoljno precizna pravila za component-local hook-ove i transport;
- previše apsolutno forsiranje `useActionState` za sve forme;
- netačna tvrdnja da personalizovani Kompas rezultati treba da budu indeksirani;
- opis browser komunikacije sa Redis lock-om, što nije dozvoljena frontend granica;
- Next.js 16 `next/image` kod koji je i dalje koristio `priority` umesto `preload`;
- React Query Devtools renderovan bez development uslova;
- više velikih UI fajlova sa previše odgovornosti.

Prva grupa problema je ispravljena. Veliki workspace fajlovi su evidentirani kao eksplicitan, ograničen arhitektonski dug i zaštićeni baseline gate-om da ne nastave da rastu.

---

## 2. Izvršene korekcije

### 2.1 Direktni transport uklonjen iz javnih UI komponenti

Direktni mrežni pozivi uklonjeni su iz:

- `src/features/booking/booking-request-form.tsx`;
- `src/features/company/company-configurator-drawer.tsx`;
- `src/features/research/research-drawer.tsx`;
- `src/features/guidance/consent-document-disclosure.tsx`.

Uvedeni su tipizovani transport moduli:

- `src/lib/api/request-json.ts`;
- `src/lib/api/booking-request.ts`;
- `src/lib/api/company-inquiry.ts`;
- `src/lib/api/survey.ts`;
- `src/lib/api/public-legal-document.ts`.

`request-json.ts` centralizuje:

- JSON čitanje;
- proveru HTTP statusa;
- bezbednu javnu grešku;
- Zod validaciju uspešnog odgovora.

### 2.2 Mutation lifecycle prebačen u feature hook-ove

Uvedeni su:

- `useBookingRequestMutation`;
- `useCompanyInquiryMutation`;
- `useSurveyMutation`;
- `usePublicIntakeSubmission`.

Komponente više ne dupliraju server mutation state kroz lokalne `sending`, `submitting` i slične state promenljive. Koriste `isPending`, `isError`, `isSuccess` i `data` iz mutation rezultata.

### 2.3 Kompas mrežno stanje uklonjeno iz `useEffect`

`GuidanceFlow` je ranije:

- učitavao capabilities u mount effect-u;
- čuvao rezultat u lokalnom state-u;
- ručno kreirao request key;
- ručno abortovao matching fetch;
- ručno održavao error key.

Sada koristi:

- `usePublicIntakeCapabilities`;
- `useAuthoritativeIntakeMatch`;
- stabilne query keys;
- `AbortSignal` koji prosleđuje TanStack Query;
- query status kao jedini autoritet mrežnog lifecycle-a.

Preostali effect-i u ovom toku služe za timer cleanup i focus management, što je opravdana sinhronizacija sa browserom.

### 2.4 Saglasnosti koriste query hook i runtime-validiran dokument

`ConsentDocumentDisclosure` sada poseduje samo lokalni `open` state. Dokument, pending i error stanje dolaze iz `usePublicLegalDocument`.

RichDoc odgovor prolazi kroz Zod šemu pre renderovanja.

### 2.5 Query provider granice

Interaktivne javne oblasti dobijaju scoped `QueryProvider`, bez pretvaranja celog javnog sajta u globalni client/query sloj.

React Query Devtools se renderuje samo kada je:

```text
NODE_ENV === development
```

### 2.6 Root layout granica

`html` i `body` su sada direktna struktura root layout-a, dok je `AuthProvider` postavljen unutar `body` granice oko aplikacionog sadržaja.

### 2.7 Next Image 16 korekcija

Zamenjeno je:

```tsx
priority
```

sa:

```tsx
preload
```

na pregledanim LCP kandidatima:

- homepage hero;
- therapist hero;
- prvi terapeut u team listi.

`fill` slike imaju `sizes`, a native `<img>` nije pronađen.

### 2.8 Stroži booking tip

`locationLabel` sada vraća preciznu uniju:

```ts
"Niš" | "Leskovac"
```

umesto opšteg `string` tipa, pa booking transport ne gubi tipizaciju lokacije.

### 2.9 Test wrapper prilagođen Query provider-u

`IntakeRequestForm` testovi sada se renderuju kroz `QueryProvider`, jer forma koristi mutation hook i query hook za pravne dokumente.

Booking test mock sada vraća stvarni JSON response shape očekivan od centralizovanog transporta.

---

## 3. Arhitektonska dokumentacija

`ARCHITECTURAL_RULES_NEXTJS_REACT_QUERY.md` je podignut na verziju **1.1** i dobio novi **Part E**.

Dodata su obavezujuća pravila za:

- smer zavisnosti;
- component-local `hooks/`, `helpers/`, `types` i `api` slojeve;
- zabranu direktnog transporta u TSX-u;
- TanStack Query query/mutation hook-ove;
- `useState`, `useEffect`, `useMemo`, `useCallback` i `useRef`;
- opravdanu i neopravdanu primenu `useActionState`;
- Server/Client Component granice;
- stvarnu render strategiju u trenutnoj Next.js konfiguraciji;
- privatnost personalizovanog Kompas rezultata;
- `next/image` i `next/link`;
- strict TypeScript;
- loading/error/empty/success stanja;
- dekompoziciju velikih komponenti;
- Definition of Done za frontend refaktor.

Ispravljene su tri važne ranije tvrdnje:

1. Personalizovani Kompas rezultat se ne indeksira i osetljivi odgovori ne idu u URL.
2. Browser komunicira sa FastAPI/odobrenim HTTP adapterom, nikada direktno sa Redis-om.
3. `useActionState` nije univerzalna zamena za TanStack mutation i ne uvodi se mehanički u svaku formu.

---

## 4. Novi automatski arhitektonski gate

Dodat je:

```text
scripts/check-frontend-architecture.mjs
```

Komanda:

```bash
npm run architecture:check
```

Gate trenutno proverava:

- direktni `fetch(` u `.tsx` fajlu;
- native `<img>`;
- `next/image priority`;
- `next/image fill` bez `sizes`;
- novi TSX fajl preko 400 linija;
- rast postojećih baseline-ovanih velikih fajlova;
- novi direktni `useQuery/useMutation` u UI fajlu;
- `server-only` import iz Client Component-a.

Poznati dug je eksplicitno baseline-ovan. To znači:

- postojeći problem nije predstavljen kao rešen;
- fajl može da se smanjuje;
- fajl ne može da raste preko pregledane granice;
- novi veliki fajl ili novi direktni query u UI-ju odmah obara gate.

---

## 5. Potvrđene provere

### 5.1 TypeScript sintaksni parser

```text
Parsed 331 TypeScript files; syntax errors: 0
```

Ovo potvrđuje sintaksnu ispravnost svih `.ts`, `.tsx`, `.mts` i `.cts` fajlova. Nije zamena za kompletan TypeScript semantic typecheck.

### 5.2 Arhitektonski gate

```text
Architecture check passed for 194 TSX files.
```

### 5.3 Dodatne statičke provere

Potvrđeno:

```text
Direct fetch in TSX: 0
Native <img>: 0
next/image priority prop: 0
next/image fill without sizes: 0
Markdown code fences: balanced
Architecture script syntax: valid
```

---

## 6. Gate-ovi koji nisu mogli biti izvršeni

Kompletna instalacija dependency-ja nije završena u sandbox okruženju.

Projektni zahtev:

```text
Node 24.13.1
npm 11.14.1
```

Dostupno okruženje:

```text
Node 22.16.0
npm 10.9.2
```

`npm ci` je prvo naišao na nedostajući paket u internom npm mirror-u, a pokušaj prema javnom registry-ju nije uspeo zbog mrežnog `EAI_AGAIN` problema.

Zato nisu proglašeni zelenim:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run test:e2e
```

Ove komande treba izvršiti u projektnom Node 24.13.1 okruženju pre merge-a.

---

## 7. Preostali arhitektonski dug

### 7.1 Velike komponente

| Fajl | Linije | Procena |
|---|---:|---|
| `screen-kompas.tsx` | 1843 | kritičan kandidat za fazno razlaganje |
| `screen-dokumenti.tsx` | 1128 | kritičan kandidat za query/editor hook-ove |
| `taxonomy-term-editor.tsx` | 1004 | izdvojiti form state, mutation i sekcije |
| `guidance-flow.tsx` | 967 | mrežni deo rešen; ekrane izdvojiti u component family |
| `booking-request-form.tsx` | 659 | izdvojiti state/payload hook i korake |
| `content-revision-editor.tsx` | 643 | query/mutation lifecycle izdvojiti iz editora |
| `company-configurator-drawer.tsx` | 515 | izdvojiti workflow hook i ekrane |

Ovi fajlovi nisu bezbedno razbijani naslepo jer nemamo kompletan build/test gate u sandboxu. Gate sada sprečava njihov dalji rast.

### 7.2 Direktni TanStack Query pozivi u workspace UI-ju

Sledeći legacy fajlovi i dalje direktno deklarišu `useQuery` ili `useMutation`:

- `screen-sadrzaj.tsx`;
- `screen-klijenti.tsx`;
- `content-revision-editor.tsx`;
- `taxonomy-term-editor.tsx`;
- `screen-dokumenti.tsx`;
- `content-discovery-metadata.tsx`;
- `screen-kompas.tsx`.

Njihov sledeći refaktor treba da uvede feature hook-ove, bez menjanja backend ugovora.

### 7.3 Runtime validacija postojećih API adaptera

Novi javni adapteri koriste Zod. Deo postojećih workspace i intake adaptera još koristi generated TypeScript tip uz runtime cast posle `response.json()`.

Prioritet za dalju validaciju:

1. osetljivi public intake odgovori;
2. legal documents;
3. taxonomy registry;
4. CMS revision odgovori;
5. team queue.

### 7.4 Route Handler tranzicioni sloj

Next Route Handlers moraju ostati adapteri prema FastAPI-ju. Svaki postojeći handler treba proveriti da ne postaje drugi poslovni backend, naročito za:

- email slanje;
- CMS transition;
- booking request;
- company inquiry;
- survey;
- intake.

---

## 8. Preporučeni redosled narednog refaktora

### Korak 1 — workspace query hook-ovi

Izdvojiti jednostavne query-je prvo:

- `useContentEntriesQuery`;
- `useIntakeTeamQueue`;
- `useTaxonomyRegistryQuery`;
- `useLegalDocumentsQuery`.

Time se uklanjaju najlakša baseline odstupanja uz mali behavioral rizik.

### Korak 2 — mutation hook-ovi

Izdvojiti:

- create/open content entry;
- claim intake case;
- save/delete content revision;
- taxonomy transition/review/delete;
- legal publication workflow.

### Korak 3 — komponentne porodice

Razložiti velike fajlove po ekranima i odgovornostima, ne samo po broju linija.

Primer za Kompas:

```text
screen-kompas/
├── screen-kompas.tsx
├── hooks/
│   ├── use-taxonomy-registry.ts
│   ├── use-taxonomy-workflow.ts
│   └── use-taxonomy-review.ts
├── components/
│   ├── taxonomy-list.tsx
│   ├── taxonomy-detail.tsx
│   ├── taxonomy-review-panel.tsx
│   └── taxonomy-create-dialog.tsx
├── helpers/
└── types.ts
```

### Korak 4 — kompletan Node 24 gate

Tek nakon zelenih:

```text
typecheck
lint
format:check
test
build
test:e2e
```

refaktor može biti označen kao potpuno verifikovan.

---

## 9. Zaključak

Potvrđene mrežne i hook arhitektonske greške u javnim tokovima su ispravljene, dokumentacija je precizirana, a uveden je gate koji sprečava povratak istih obrazaca.

Frontend još nije potpuno usklađen sa pravilom da sva server-state logika bude u feature hook-ovima, pre svega u staff workspace delu. To je sada vidljiv, merljiv i ograničen dug sa jasnim redosledom uklanjanja, umesto neformalnog pravila koje Codex ili Claude Code mogu ponovo da preskoče.
