# CODEX HANDOFF — Kompas javni tok, Engine i admin „Brzi unos”

**Repozitorijum:** `https://github.com/dev-dmd/Psihointegritet.git`  
**Radna grana:** `features`  
**Datum handoff-a:** 2026-08-01  
**Cilj:** proveriti plan prema stvarnom stanju repozitorijuma, ispraviti ga gde je potrebno, zatim započeti i dovršavati implementaciju po vertikalnim fazama.

---

## 1. Mandat

Ne tretiraj ovaj dokument kao slepo prepisivanje rešenja. Najpre proveri sve tvrdnje prema aktuelnoj `features` grani, relevantnoj dokumentaciji i stvarnim API ugovorima. Brojevi linija iz ranije analize služe samo kao orijentacija i mogu biti zastareli.

Imaš ovlašćenje da:

- ispraviš plan i dokumentaciju kada stvarni kod pokaže preciznije ili bezbednije rešenje;
- napraviš D-056 i ADR-022 Amandman 2 pre produkcionog UI koda;
- implementiraš faze ispod redom;
- refaktorišeš samo ono što je neposredan preduslov da se logika ne duplira;
- dodaš potrebne contract, unit, integration i E2E testove;
- koristiš razumne, kompatibilne podrazumevane odluke zaključane u ovom handoff-u.

Nemoj:

- ponovo implementirati završene K1–K3 delove;
- menjati Booking Engine, Intake matching pravila ili therapist scoring;
- uvoditi AI, embeddings, psihološko profilisanje ili novu kliničku logiku;
- praviti novi backend `modules/compass` bez novog ADR-a — v1 Kompas ostaje javna površina i recommendation servis nad Content domenom;
- uvoditi `article`, novi `ContentType`, novi `ContentTemplate`, `ResourceAsset`, subscription ili purchased access samo da bi demo izgledao popunjen;
- hardkodovati stručne oblasti, teme ili recommendation pravila u React komponentama;
- praviti javne `[id]` rute, kombinacione SEO rute ili slati izabrane teme kroz query parametre;
- pushovati granu, otvarati PR ili menjati spoljne servise bez posebnog zahteva.

Ako naiđeš na stvarnu produktnu ili arhitektonsku odluku koja nije pokrivena ovim handoff-om, zaustavi samo tu fazu, navedi konkretan dokaz iz repoa i ponudi najviše 2–3 jasne opcije. Drift broja linija, naziv pomoćne funkcije ili manji refaktor nisu blokada.

---

## 2. Obavezna priprema pre izmene

1. Pročitaj `frontend/AGENTS.md` u celosti.
2. Pročitaj relevantna pravila iz:
   - `documentations/ARCHITECTUAL/ARCHITECTURAL_RULES_NEXTJS_REACT_QUERY_v1.1.md`;
   - `documentations/KOMPAS_TODO.md`;
   - `documentations/adr/ADR-022-kompas-registry-panel-and-cms-boundary.md`;
   - `documentations/PRODUCT_DECISIONS.md`;
   - `documentations/TODO.md` §0A;
   - `documentations/DISCOVERABILITY_CONTRACT_v0.1.md`;
   - `documentations/CONTENT_MODEL_MATRIX_v0.1.md`;
   - relevantne Content Governance ugovore.
3. Pre pisanja Next.js koda proveri relevantne vodiče u `frontend/node_modules/next/dist/docs/`, kako zahteva `frontend/AGENTS.md`.
4. Proveri `git status`, aktuelni commit i postojeće korisničke izmene. Ne diraj nevezane promene.
5. Ponovo mapiraj javne i staff Kompas API-je, Content discovery modele, public provider, redirect/discoverability ugovor, `GuidanceDrawer`, `ResearchDrawer` i CMS creation/edit tok.

---

## 3. Zatečeno stanje koje treba potvrditi

Očekivano aktuelno stanje:

- K1 backend taxonomy registry je završen.
- K2 admin panel `/radni-prostor/kompas` je završen.
- K3 revision-bound CMS discovery metadata je završen.
- Postoje staff create/update/review/publish/archive komande, route suggestion/confirmation i tipizovani frontend API.
- Postoje public taxonomy i public taxonomy route resolver sa 308 alias ponašanjem.
- Ne postoje javne frontend `/kompas` stranice.
- Ne postoji public reverse index `taxonomy term → published content`.
- Ne postoji implementiran `CompassHandoffContextV1`.
- Ne postoji K4 recommendation endpoint/read-model.
- Ne postoji admin „Brzi unos”.
- Ne postoji `ContentType.article`; ne zaobilaziti tu granicu.

### Ispravka ranijeg nalaza o feedback-u

Feedback infrastruktura ne kreće od nule. Postoje:

- `frontend/src/features/research/research-drawer.tsx`;
- `frontend/src/content/survey.ts`;
- `frontend/src/lib/api/survey.ts`;
- `frontend/src/app/api/survey/route.ts`.

Proveri ih. Izdvoji/reupotrebi generički drawer shell ili uvedi konfigurabilni survey model, bez kopiranja portal, focus, Escape, body-scroll i submit logike. Kompas anketa mora ostati odvojena od recommendation rezultata i ne sme uticati na njih.

---

## 4. Odluke koje treba formalno zaključati — D-056 / ADR-022 Amandman 2

### 4.1 Kompas i Intake ostaju odvojeni

- `/kompas` pomaže korisniku da istražuje oblasti, teme i objavljen sadržaj.
- `/pronadji-podrsku` ostaje Intake & Matching tok koji pomaže u izboru usluge/terapeuta.
- Kompas pitanja nisu klinička pitanja, test ili procena.
- Kompas nikada ne rangira terapeute.
- „Želim stručnu pomoć” prenosi samo neutralni, korisniku vidljiv i potvrdiv kontekst.
- Intake ostaje jedini autoritet za hard constraints, uslugu, terapeuta i timski handoff.

Nemoj ponovo koristiti Intake `GuidanceFlow`, `IntakeStep`, `IntakeAnswers` ili njegov `QuestionsScreen` kao Kompas tok. Kompas dobija sopstveni mali, strogo tipiziran question flow. Može se ponovo koristiti samo neutralni drawer/surface obrazac ako ne uvlači Intake-specifičan sadržaj.

### 4.2 Pitanja su opciona inline interakcija, ne obavezni wizard

- Renderuju se na `/kompas`, ispod Hero sekcije.
- Nema modala i nema posebne question rute.
- Ne prikazivati „korak X od Y”. Dozvoljen je diskretan vizuelni napredak bez test/wizard jezika.
- Stalno dostupno: „Preskoči pitanja”, „Prikaži preporuke sada”, „Vrati se na oblasti” i „Želim stručnu pomoć”.
- „Nisam siguran/na šta mi se događa” je sentinel korisničke akcije, nije taxonomy termin i nikada se ne čuva kao `topicId`.
- Taj izbor odmah prekida pitanja i otvara Polazni prikaz.
- „Preskoči sva pitanja” takođe otvara Polazni prikaz.
- Preskakanje pojedinačnog kasnijeg pitanja samo izostavlja taj signal; ne poništava već izabrano.
- Teme su multi-select, najviše dve. To je nova kontrola i ne treba je na silu uklapati u postojeći single-select Intake/Research UI.

Pet pitanja koriste postojeće ose:

1. oblast (`topic_group`);
2. do dve teme (`topic`);
3. publika (`audience`);
4. cilj (`content_goal`);
5. put (`explore | professional_support | both`).

Opcije dolaze iz objavljenog DB registra. Ako neka opciona osa nema objavljene vrednosti, tok se bezbedno skraćuje ili preskače tu osu; ne uvoditi frontend stručni fallback niz. Test podaci mogu koristiti test fixture/factory, ali ne runtime hardcode.

### 4.3 Javne rute

| Ruta | Uloga |
| --- | --- |
| `/kompas` | Hero, opciona pitanja, Polazni ili prilagođeni prikaz |
| `/kompas/oblasti` | pregled svih objavljenih oblasti |
| `/kompas/teme` | pregled/pretraga objavljenih tema |
| `/kompas/oblast/[slug]` | kanonska javna stranica jedne oblasti |
| `/kompas/tema/[slug]` | kanonska javna stranica jedne teme |

Pravila:

- nema `[id]` javnih ruta;
- nema posebnih ruta za ulogovane;
- auth može promeniti dostupnost konkretnog sadržaja na istoj ruti, ne URL;
- nema kombinacionih ruta;
- izabrane teme ne idu u query string;
- DB alias ostaje runtime izvor 308 redirekcije, odvojen od compile-time redirect registra;
- taxonomy putanje se nikad ručno ne dodaju u compile-time `redirectRegistry`.

Rezerviši `kompas` u svim frontend i backend listama za custom/legal document slugove koje bi mogle zaseniti javnu rutu. Dodaj parity test da obe strane koriste isto pravilo.

### 4.4 „Polazni prikaz”

Koristi naziv **Polazni prikaz**, ne „osnovni paket”, jer „osnovni/napredni Kompas” već označava product tier u O-21/K0.5.

- `/kompas` dobija eksplicitnu Next.js stranicu i interaktivni renderer.
- Editabilni Hero/uvod/SEO i drugi dozvoljeni statični copy mogu koristiti postojeći `static_page + static_information` CMS entitet za rutu `/kompas`.
- CMS entitet ne preuzima kontrolu nad interaktivnom strukturom stranice; RSC stranica učitava CMS copy, taxonomy/read-model i renderuje kontrolisane Kompas komponente.
- Ne uvoditi novi `ContentType` ili `ContentTemplate`.
- Ako postojeći system catalog zahteva allowlist unos za `/kompas`, dodati ga simetrično u backend i frontend provider uz parity test.
- Redosled oblasti/tema dolazi iz objavljenog registra (`sortOrder`, `compassEnabled`).
- Početne stručne vrednosti ulaze kao draft/test podaci dok ih ovlašćeni tim ne odobri; implementacija ih ne objavljuje automatski.

Polazni prikaz najmanje prikazuje:

1. kratak uvod;
2. objavljene oblasti;
3. objavljene početne/aktuelne teme;
4. objavljene dostupne sadržaje ako postoje;
5. linkove ka `/kompas/oblasti` i `/kompas/teme`;
6. stalni nenametljiv CTA ka stručnoj pomoći.

### 4.5 Anonimni access

Zaključeno:

- anonimni public endpoint vraća samo sadržaj čiji je efektivni access level eksplicitno `public`;
- `registered`, `staff_only`, budući `subscriber`/`purchased` i `NULL` access ne izlaze anonimnom korisniku;
- `NULL` se ne podrazumeva kao `public`;
- access level dolazi na kartici kao stvaran backend podatak;
- backend je autoritet; UI skrivanje nije bezbednosna granica.

### 4.6 SEO/discoverability

- U prvoj kanonskoj vertikali koristi postojeći dozvoljeni `BreadcrumbList`.
- Ne uvoditi `CollectionPage` JSON-LD dok ne postoji dokumentovan amandman na iscrpni JSON-LD registar.
- DB taxonomy aliasi su dozvoljeni drugi, runtime izvor redirect-a; dopuni Discoverability ugovor jednom jasnom klauzulom.
- Taxonomy slugovi nikada ne ulaze u compile-time redirect registar.
- Preduga `publicLabel`/`shortDescription` vrednost dobija warning/Content Health finding prema SEO limitima; nema tihog skraćivanja.
- Priznaj u K3B gate-u da objavljeni, odobreni Kompas termini mogu biti `index`, dok prelaunch statične stranice ostaju `noindex`/`in_review`.

### 4.7 Feedback

- Ne pokušavati custom modal na stvarno zatvaranje browser taba; to nije pouzdano niti pristupačno.
- Nakon smislenog korišćenja rezultata ili eksplicitne akcije „Završi istraživanje” može se prikazati nenametljiv banner, najviše jednom po browser sesiji.
- „Da, odvojiću minut” otvara Kompas survey drawer.
- „Ne sada” zatvara banner za tu sesiju.
- Ankета meri samo UX: relevantnost, jasnoću narednog koraka, nedostajući format/sekciju i lakoću pronalaženja stručne pomoći.
- Ne traži zdravstvene podatke. Za prvu verziju izostavi slobodan tekst ili prikaži jasnu zabranu unošenja ličnih/zdravstvenih podataka.
- Koristi zaseban `surveyId`, na primer `compass-experience-v1`.
- Rezultati ankete nikada ne ulaze u recommendation request, scoring, profil ili Intake handoff.

---

## 5. Implementacioni redosled

### Faza 0 — dokumentacija i current-state korekcije

Pre produkcionog koda:

1. Dodaj D-056 u `PRODUCT_DECISIONS.md`.
2. Dodaj ADR-022 Amandman 2.
3. Ažuriraj `KOMPAS_TODO.md`:
   - zaglavlje više ne sme da kaže da je K3 sledeći ako je K3 završen;
   - preciziraj pravilo o opcionim inline pitanjima;
   - uskladi test politiku sa važećom CTO odlukom/TODO §0A;
   - ukloni Panel „Kompas” i revision-bound discovery metadata iz liste nedostajućeg;
   - dodaj nove route-list stranice, Polazni prikaz, K4 minimum, feedback i Brzi unos;
   - ažuriraj „Sledeći konkretan korak”.
4. Ažuriraj `TODO.md` i `OPEN_DECISIONS.md` samo gde su tvrdnje stvarno zastarele ili odluka D-056 zatvara stavku.
5. Dopuni Discoverability ugovor za DB taxonomy alias redirect izvor.

Ne prepisuj istorijske odluke; označi šta je supersedovano i čime.

**Gate F0:** dokumentacija više ne vodi narednog implementatora ka K3 ponavljanju, obaveznom wizardu ili hardkodovanom Kompasu.

### Faza 1 — kanonske stranice K3B.1

#### Discoverability tip

Ako current-state potvrdi da više funkcija traži samo `route`, publication/indexing i SEO podatke, uvedi minimalni `DiscoverabilityRecord` strukturni tip. Proširi samo potpise funkcija kojima pun `ContentEntity` nije potreban; tela i postojeći pozivi treba da ostanu kompatibilni.

Ne uvodi novi ContentType, template ili JSON-LD kind.

#### Public route registry

Proveri `isKnownPublicRoute()` umesto pretpostavke. Ako postojeća logika stvarno podržava dvonivovski `[slug]`, dodaj:

- `/kompas/oblast/[slug]`;
- `/kompas/tema/[slug]`.

Dodaj tačne granične testove. `/kompas` dodaj tek kada eksplicitna stranica postoji u Fazi 3 ili kada current-state zahteva raniji allowlist radi CMS entiteta.

#### Server-only Compass adapter

Uvedi fokusiran folder, na primer `frontend/src/lib/compass/`, po obrascu postojećih server-only adaptera:

- `public-taxonomy.ts` — fetch/resolver koji razlikuje `term | alias | missing` i mrežni/server error;
- `discoverability.ts` — projekcija public termina u minimalni discoverability oblik + breadcrumbs;
- `cache.ts` — cache tagovi/revalidation ugovor.

Ne dozvoli da adapter sam pozove Next redirect sentinel unutar `try/catch` bloka.

#### 308 bezbednost

- Fetch koristi `redirect: "manual"`.
- `Location` se validira pre `permanentRedirect()` pomoću striktne dozvoljene Kompas putanje.
- Odbij eksterni URL, query/hash i putanju van `/kompas/oblast|tema/<slug>`.
- Ako `Location` pokazuje na trenutnu putanju, tretiraj kao missing/invalid da nema petlje.
- `permanentRedirect()` pozovi van `try/catch`.
- 404 → `notFound()`.
- mrežni/5xx pad → rethrow da indeksirana ruta ne postane soft-404.

#### Stranice

Dodaj:

- `app/(public)/kompas/oblast/[slug]/page.tsx`;
- `app/(public)/kompas/tema/[slug]/page.tsx`.

RSC učitava public read-model. U ovoj fazi stranica može prikazati term labelu, opis, parent/children linkove koji su dostupni i stručnu pomoć; ne hardkodovati stručne podatke.

Bez `generateStaticParams`, jer je autoritet DB i termini se menjaju objavom. Koristi dinamičku rutu i tagovani cache.

**Gate F1:** aktuelni slug vraća 200, validni stari alias 308 ka aktuelnom slugu, missing vraća 404, a mrežni/5xx pad ne glumi 404.

### Faza 2 — public page aggregate K3B.2

Dodaj jedan endpoint na postojeći Content/Taxonomy public router, uz naziv usklađen sa aktuelnim API stilom, konceptualno:

`GET /api/v1/public/compass/taxonomy/pages/{route_kind}/{slug}?locale=sr-Latn`

Response najmanje:

- resolved term;
- parent kada postoji;
- objavljena deca/podteme;
- objavljene related teme;
- dostupni objavljeni content card read-modeli;
- efektivni access level.

Pravila:

- svi termini prolaze kroz isti postojeći public eligibility/projection helper;
- alias logika se deli sa postojećim resolverom i daje identičan 308;
- jedan render treba da dobije koherentan agregat iz jedne backend transakcije;
- reverzni indeks koristi postojeće revision taxonomy veze i discovery tabelu; ne dodavati novu tabelu ili indeks bez dokazanog query plana/problema;
- oblast obuhvata samu oblast i njene objavljene teme pri traženju content kandidata;
- sadržaj mora biti published, u istom organization/locale scope-u i eksplicitno `public` za anonimni endpoint;
- ne vraća score, matchReason, therapist reference ili slobodan URL;
- redosled je deklarisan i nesemantičan dok K4 ne rangira rezultate.

Kanonske stranice F1 prebaci na aggregate endpoint kada bude spreman.

Dodaj `/kompas/oblasti` i `/kompas/teme` kao RSC list/read-model stranice nad objavljenom taxonomy kolekcijom. Pretraga tema u prvoj verziji može biti lokalno filtriranje već dobijenog public skupa; ne uvoditi novi server search bez potrebe.

**Gate F2:** canonical page okuplja samo objavljene i anonimno dozvoljene entitete; registered/NULL/staff sadržaj ne curi.

### Faza 2B — minimalni K4 Kompas Engine

Ova faza je obavezna pre dinamičkog prilagođenog prikaza. Public aggregate sam po sebi nije recommendation servis.

Implementiraj verziran public recommendation ugovor, konceptualno:

`POST /api/v1/public/compass/recommendations`

Request koristi kontrolisane stable reference iz public taxonomy read-modela i nema:

- free text;
- kontakt;
- dijagnozu ili risk procenu;
- therapist ID;
- query parametre sa izborima.

Podržava:

- taxonomy/rule version;
- opcionu oblast;
- najviše dve teme;
- opcionu publiku;
- opcione ciljeve u dozvoljenom limitu;
- put korisnika;
- limit/pagination po dokumentovanom ugovoru.

Engine:

1. validira sve reference unutar organization/locale scope-a;
2. filtrira eligibility pre rangiranja;
3. daje prioritet: tačna tema → oblast → put → cilj → publika → stabilan editorial/technical tie-break;
4. deduplikuje sadržaj;
5. vraća najviše tri stabilna plain-language reason koda/teksta po kartici;
6. ne izlaže numerički score;
7. kod praznog rezultata kontrolisano širi signal bez prikazivanja nepovezanog sadržaja;
8. vraća normalizovan izbor i neutralni handoff kandidat;
9. koristi verziran `ruleVersion` i determinističan rezultat;
10. nema AI i nema therapist scoring.

Ako current schema nema editorial priority, koristi dokumentovan stabilan tehnički tie-break za v1; ne dodaj novu kolonu samo zbog lepšeg demo redosleda bez posebne potrebe.

**Gate F2B:** isti request + ista taxonomy/rule verzija daju isti redosled, iste razloge i ne vraćaju sadržaj koji nije `public` anonimnom korisniku.

### Faza 3 — `/kompas`, pitanja, Polazni prikaz, handoff i feedback

**Koordinacija sa dizajnom:** Faze 0–2B ne čekaju vizuelni mockup. Pre pisanja finalnih javnih Faza 3 komponenti proveri da li je Milan dostavio Kompas design handoff. Ako jeste, implementiraj ga nad već zaključanim ugovorima. Ako još nije, završi i prijavi F0–F2B, pripremi stabilne propove/state/API granice i sačekaj mockup pre vizuelnog F3 koda; nemoj nagađati finalni raspored ili zbog toga menjati Engine ugovor.

#### Arhitektura frontenda

Poštuj frontend arhitektonska pravila:

- `page.tsx` je RSC i učitava CMS/taxonomy početni read-model;
- klijentsko ostrvo drži samo interaktivno trenutno stanje;
- API pozivi nisu u vizuelnim komponentama;
- React Query i custom hooks idu u `features/compass/hooks/` ili odgovarajući lokalni `hooks/` folder;
- domain normalizacija/ranking request builder nije u JSX-u;
- strogo tipiziranje, bez `any` i bez ručnog dupliranja OpenAPI tipova ako generated client već postoji;
- server state i local UI state ostaju razdvojeni;
- ne stavljaj desetine `useState` hook-ova u veliki page component — koristi reducer/state machine ili fokusirane hook-ove;
- nove komponente treba da budu dovoljno neutralne za kasniji Milanov dizajn bez menjanja engine ugovora.

Predložena granica:

```text
features/compass/
├── api/
├── hooks/
├── model/
├── components/
├── compass-explorer.tsx
└── compass-feedback.tsx
```

Prilagodi naziv postojećim repo konvencijama; ne uvodi strukturu samo radi strukture.

#### Tok

- Hero objašnjava da Kompas nije test/dijagnoza i da pitanja mogu da se preskoče.
- „Pokreni Kompas” otvara inline question surface na istoj stranici.
- „Preskoči pitanja” renderuje Polazni prikaz.
- Sentinel „Nisam siguran/na…” odmah renderuje Polazni prikaz.
- Delimični izbor može pozvati recommendation endpoint preko „Prikaži preporuke sada”.
- Tema je multi-select max 2 sa jasnim uklanjanjem.
- Rezultat se renderuje sekcija po sekcija, bez infinite feed-a.
- Izbor živi u React memoriji; opcioni session continuation/handoff koristi verzionisan `sessionStorage` zapis sa kratkim TTL-om.
- Topic reference ne ide u URL/query i ne šalje se u identifikovan analytics payload.

#### Intake handoff

Implementiraj `CompassHandoffContextV1` prema dokumentaciji i proveri postojeći booking/session-storage obrazac.

Pre oživljavanja drawer toka proveri:

- da li je `GuidanceProvider` zaista montiran na javnom layout-u;
- da li je `GuidanceDrawer` pristupačan i funkcionalan sa aktuelnim feature flagovima;
- da li canonical ruta `/pronadji-podrsku` treba da ostane fallback kada drawer/JS nije dostupan.

Proširi guidance context minimalno da prihvati neutralni Kompas kontekst, bez uvlačenja Content modela u Intake matching. Drawer/Intake prikazuje šta je preneto i traži potvrdu. Ambiguous topic→support-area mapping ne radi automatski prefill.

#### Feedback

Refaktoriši postojeći Research Drawer samo koliko je potrebno da podrži konfiguraciju više anketa. Ne dupliraj modal infrastrukturu.

Prikaži feedback banner samo posle smislenog angažovanja ili eksplicitnog završetka, jednom po sesiji. Kompas survey je anoniman, UX-only i odvojen od engine-a.

**Gate F3:** preskok i sentinel vode na Polazni prikaz; potpun/delimičan izbor dobija determinističke preporuke; stručna pomoć otvara funkcionalan Intake handoff; feedback radi odvojeno i ne utiče na rezultat.

### Faza 4 — admin „Brzi unos”

#### Preduslovni refaktor

Ponovo izmeri `taxonomy-term-editor.tsx`. Ako je i dalje monolit koji bi stepper naterao da duplira validaciju i 300+ linija polja, prvo izdvoji:

- zajednički draft/form state hook ili reducer;
- build/normalize payload funkciju;
- per-field validatore;
- ponovo upotrebljiva polja/sekcije;
- zajednički save mutation/cache update.

Refaktor mora ostati behavior-preserving i imati testove. Ne refaktoriši `guidance-flow.tsx`, Booking ili Company samo zato što su veliki.

#### Šest koraka

Iznad postojećeg naprednog editora dodaj „Brzi unos”:

1. **Nova vrednost registra** — oblast, tema, publika ili cilj.
2. **Identitet** — naziv, predloženi stable ID, kratak javni opis; prvo čuvanje kreira draft.
3. **Organizacija** — parent oblast za temu, sinonimi, put, redosled, related teme gde je dozvoljeno.
4. **Početni sadržaj i povezivanje** — `shortDescription`, vizuelni identitet i postojeće dozvoljene veze; bez izmišljanja article tipa.
5. **Javna ruta** — suggest + confirm slug tek nakon kreiranog `termId`.
6. **Pregled** — rezime, sačuvaj radnu verziju, otvori lifecycle ili pređi u CMS.

Stepper pravila:

- „Sačuvaj i nastavi” i „Sačuvaj i izađi” rade na svakom odgovarajućem koraku;
- stable ID se zaključava nakon prvog uspešnog POST-a;
- 409/422 stable ID kolizija se prikazuje uz polje, bez gubitka unosa;
- route response se pravilno spaja u React Query cache, uključujući `canonicalPath`;
- postojeći full editor ostaje „Napredno uređivanje” i koristi isti state/validation/payload sloj;
- nema drugog registra i nema paralelnog lifecycle-a;
- korak za content ne kopira ceo CMS editor.

Pošto `article` još ne postoji:

- početni javni sadržaj oblasti/teme u ovoj fazi čine njena odobrena labela, `shortDescription`, podteme/veze i postojeći objavljeni content agregat;
- za novi puni edukativni sadržaj završni CTA može otvoriti postojeći CMS tok sa unapred izabranom oblašću/temom, na primer kroz kontrolisan panel query/state handoff;
- ako CMS trenutno ne može da kreira proizvoljan edukativni entry, nemoj zloupotrebiti `static_page`, `program` ili `service`; prikaži jasan K3A/ADR-019 preduslov;
- povezivanje postojećeg sadržaja koristi K3 discovery metadata, ne novi tag string.

**Gate F4:** admin može napraviti draft oblasti/teme, nastaviti kroz opis i mapiranje, potvrditi slug, sačuvati/izaći, nastaviti lifecycle i preći u CMS bez dupliranog editora ili promene stable ID-ja.

---

## 6. Test i verifikacioni ugovor

Pre korišćenja komandi proveri aktuelne skripte u `package.json`, `pyproject.toml` i `TODO.md` §0A. Koristi repo-authoritativne komande ako se razlikuju od spiska ispod.

### Tok izvršavanja

- Tokom rada pokreći fokusirane testove za menjani modul.
- Posle svake završene faze pokreni relevantni puni frontend/backend gate.
- Pre završnog handoff-a pokreni build i E2E kada okruženje to dozvoljava.
- Ako Docker/DB/secrets blokiraju test, ne simuliraj uspeh: navedi tačnu komandu, konkretan blocker i šta je ipak verifikovano.

### Obavezni specifični testovi

#### Faza 1

- poznata `/kompas/oblast/<slug>` ruta;
- dodatni segment odbijen;
- prazan slug odbijen;
- `/kompas` nije dinamički slug template pre eksplicitnog unosa;
- eksterni/nevalidni `Location` ne izaziva redirect;
- alias petlja ka istoj putanji je odbijena;
- 404 i 5xx/network imaju različito ponašanje.

#### Faza 2

- oblast bez sadržaja vraća validan prazan agregat;
- oblast uključuje content tagovan njenim objavljenim temama;
- draft/arhivirane teme i sadržaji ne izlaze;
- `registered`, `staff_only` i `NULL` access ne izlaze anonimno;
- tenant/organization izolacija je pokrivena.

#### Faza 2B

- determinističan redosled za isti request/ruleVersion;
- max dve teme;
- nepoznat/arhiviran stable ID daje kontrolisanu grešku/prilagođavanje po ugovoru;
- najviše tri razloga, bez numeričkog skora;
- empty-state expansion nikad ne vraća nepovezan sadržaj;
- nema therapist reference.

#### Faza 3

- preskok pitanja → Polazni prikaz;
- „Nisam siguran/na…” → Polazni prikaz;
- delimični odgovori → validan recommendation request;
- multi-select max 2 i uklanjanje teme;
- refresh/session TTL ponašanje po ugovoru;
- topic reference nije u URL-u;
- „Želim stručnu pomoć” prenosi neutralni kontekst i traži potvrdu;
- feedback banner najviše jednom po sesiji;
- survey odgovor ne menja recommendation state.

#### Faza 4

- create draft → save and continue;
- stable ID lock nakon prvog čuvanja;
- kolizija ostaje field-level error;
- suggest/confirm slug tek posle term ID-ja;
- `canonicalPath` se pravilno ažurira u cache-u;
- save/exit/resume;
- napredni editor koristi isti payload/validaciju;
- authenticated smoke: kreiraj oblast → potvrdi slug → pošalji na pregled → ukloni dozvoljenu radnu reviziju ili očisti fixture prema postojećem lifecycle ugovoru.

### Ručna provera

- objavljena oblast/tema: 200;
- stari slug posle korekcije: 308 ka jednom aktuelnom URL-u;
- sitemap sadrži najviše jedan kanonski URL po terminu;
- nema kombinacionih ili `[id]` URL-ova;
- mobilni tok prikazuje jednu jasnu sekciju/pitanje bez pretrpanosti;
- keyboard/focus/back/Escape ponašanje drawera ostaje ispravno;
- public API ne vraća internal note, review evidence, actor ili nedozvoljen access.

---

## 7. Acceptance kriterijumi cele vertikale

Rad je prihvatljiv kada:

1. dokumentacija tačno odražava D-056 i aktuelni K1–K6 status;
2. `/kompas`, liste i kanonske slug stranice postoje i koriste DB autoritet;
3. alias redirect je bezbedan, bez petlje i open redirect-a;
4. public aggregate i recommendation endpoint ne cure draft, tenant ili nedozvoljen access;
5. opciona pitanja rade inline i mogu se prekinuti/preskočiti;
6. „Nisam siguran/na…” nije taxonomy termin i vodi na Polazni prikaz;
7. Engine je determinističan, objašnjiv i bez therapist scoring-a;
8. Intake dobija samo neutralni potvrdivi kontekst;
9. feedback je anoniman, UX-only i potpuno odvojen od engine-a;
10. admin Brzi unos koristi isti registar, lifecycle, validatore i cache kao napredni editor;
11. nije uveden lažni article/content tip niti hardkodovana stručna taksonomija;
12. relevantni quality gate-ovi su zeleni ili je svaki stvarni spoljašnji blocker precizno dokumentovan.

---

## 8. Način izveštavanja

Na početku vrati kratak current-state nalaz:

- šta iz ovog handoff-a potvrđuje repo;
- šta si korigovao i zašto;
- tačan redosled koji ćeš primeniti;
- eventualni pravi blocker.

Zatim kreni sa implementacijom bez čekanja dodatne potvrde za već zaključane odluke iz §4.

Posle svake faze navedi:

- rezultat faze;
- ključne izmenjene fajlove;
- migracije/API promene ako ih ima;
- izvršene testove i rezultate;
- šta je sledeće.

Na kraju navedi kompletan rezime, otvorene stavke koje zaista ostaju iza ADR-019/K3A ili drugih postojećih kapija i ne tvrdi da je nešto završeno ako nije verifikovano.
