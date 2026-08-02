# KOMPAS — DESIGN HANDOFF za implementaciju (v1.0)

**Za:** Claude Code / implementator na `features` grani
**Izvor dizajna:** `Kompas.dc.html` (interaktivni mockup u ovom projektu) + `KOMPAS_PUBLIC_FLOW_IMPLEMENTATION_v1.0.md`
**Obavezno pre koda:** `frontend/AGENTS.md` i `documentations/ARCHITECTURAL_RULES_NEXTJS_REACT_QUERY_v1.1.md` — sve ispod se implementira po tim pravilima (RSC stranica učitava read-model, klijentsko ostrvo drži samo interaktivno stanje, API pozivi nisu u vizuelnim komponentama, React Query/hooks u `features/compass/hooks/`, bez `any`, bez hardkodovane taksonomije).

**Stilizacija:** isključivo TailwindCSS klase iz postojećeg `@theme` tokena (`forest`, `forest-soft`, `sage`, `meadow`, `warm`, `warm-shine`, `coffee`, `canvas`, `surface`, `panel-canvas`, `rounded-tile|stat|card|panel|modal`, `shadow-pill|hero-card|panel-modal`, `font-sans`/`font-serif`). Bez inline hex vrednosti i bez generičkih Tailwind sivih tonova. Sekundarni tekst = `text-coffee/60` do `/75` (ne ići ispod `/60` na belom).

**Sticky header se NE dira** — već postoji na sajtu.

**Ne raditi u ovoj fazi:** finalna tipografija, hero slika Kompasa, slike opisa oblasti i tema, preostale oblasti sa sadržajem — sve to se unosi kasnije kroz radni prostor (panel). Ostaviti čiste slotove/prazna stanja.

---

## Obim ovog zadatka (tačno 7 isporuka)

1. Kompas CTA sekcija na landing (početnoj) stranici
2. „Kontrola za pregled” traka iznad te sekcije (privremena, za odabir verzije sa klijentom)
3. Admin „Brzi unos” — nova verzija iznad postojećeg, na `/radni-prostor/kompas/`
4. `/kompas`
5. `/kompas/oblasti`
6. `/kompas/teme`
7. `/kompas/oblast/anksioznost` i `/kompas/tema/napadi-panike` (kanonske stranice, po jednom primeru)

Sve mobile-first i responsive (mobilni + desktop). Bez media-query hakova — Tailwind `sm:`/`md:`/`lg:` prefiksi i `grid`/`flex` sa `gap`.

---

## 1. Kompas CTA na landing stranici

**Pozicija:** odmah ispod Hero sekcije i ispod H2 „Od čega želite da počnete?” + kartica razloga dolaska. Baner ide **preko cele širine ekrana** (full-bleed, izlazi iz container paddinga), mobile-first.

**Tri verzije layouta** (implementirati sve tri, prebacive kontrolom iz tačke 2):

- **Verzija A — split panel.** Levo kompas ilustracija, desno panel sa `border` + prozirnom pozadinom: naslov „**Kompas** mentalnog zdravlja” (reč „Kompas” u akcentnoj boji šeme, ostatak u boji naslova), opis, vertikalna linija razdvajanja, kratak aside tekst + pill CTA „Pokreni Kompas →”.
- **Verzija B — centrirani blok.** Kompas ikonica (88px) na vrhu, centriran naslov, jedan red opisa, centriran pill CTA, ispod tanka linija sa tri mikro-podatka: „≈ 2 minuta · Pitanja možete preskočiti · Anonimno”.
- **Verzija C — kratica/traka.** Kompas u krugu (76px) levo, dvoredni naslov + jedan red opisa u sredini, desno meta tekst „≈ 2 min · možete preskočiti” i pill CTA. Na mobilnom se prelama u dva reda (`flex-wrap`).

**Pet color šema** (definisati kao mapu u jednom modulu, ne po komponentama). Za svaku šemu: pozadina banera, pozadina panela, boja ivice panela, boja naslova, akcenat, boja teksta, pozadina/boja dugmeta, boja linija, „glow”:

| šema | pozadina | dugme |
| --- | --- | --- |
| `coffee` | `bg-coffee` | tamno dugme, cream tekst |
| `forest` | `bg-forest` | `bg-meadow`, tamnozeleni tekst |
| `sage` | `bg-meadow` | `bg-forest`, svetli tekst |
| `warm` | `bg-warm` | `bg-coffee`, cream tekst |
| `cream` | svetla cream površina | `bg-forest`, svetli tekst |

Dekoracija: jedan radijalni „glow” krug i jedan tanak prsten (`rounded-full` + `border`), oba `absolute`, niskog opaciteta — bez SVG ilustracija.

**CTA vodi na `/kompas`.** Copy je fiksan (bez dijagnostičkog jezika): „Odgovorite na nekoliko kratkih pitanja kako bismo vam predložili sadržaje koji bi vam trenutno mogli biti korisni. Kompas nije dijagnostički alat.”

## 2. „Kontrola za pregled” traka (privremeno)

Iznad banera, isto kao u mockupu: tanka isprekidana traka (`border-dashed`) sa tekstom **„Kontrola za pregled · nije deo stranice”**, tri pilule `Verzija A / B / C` i prekidač šema (strelice ‹ › + 5 krugova sa bojama + naziv šeme).

- Klijent njome bira kombinaciju uživo.
- Implementirati kao izdvojenu komponentu iza jednog flag-a (npr. `NEXT_PUBLIC_COMPASS_CTA_PREVIEW`) ili iza jednog propa, tako da se **briše u jednom potezu** kada verzija bude izabrana; izabrana verzija + šema tada ostaju kao podrazumevane vrednosti.
- Izbor čuvati u `sessionStorage` da preživi navigaciju tokom prezentacije.

Isto važi i za admin „Brzi unos” (tačka 3): iznad postojećeg unosa ide ista kontrola za izbor UI/UX varijante.

## 3. Admin „Brzi unos” — `/radni-prostor/kompas/`

Nova verzija se dodaje **iznad postojećeg** unosa (postojeći napredni editor ostaje netaknut kao „Napredno uređivanje”). Površina koristi `bg-panel-canvas`, kartice `bg-surface`.

Zaglavlje: eyebrow „Radni prostor · Kompas registar”, naslov „Brzi unos”, status badge (`Nije sačuvano` → `Radna verzija` → `Poslato na pregled`), dugme „Napredno uređivanje”.

**Šest koraka** kao pilule (klik = skok na korak):
1. **Nova vrednost registra** — Oblast / Tema / Publika / Cilj (kartice sa kratkim objašnjenjem).
2. **Identitet** — javni naziv, predloženi stable ID (auto-slug iz naziva), kratak javni opis sa brojačem `0 / 160` i napomenom da duži opis daje Content Health upozorenje (bez tihog skraćivanja).
3. **Organizacija** — nadređena oblast, sinonimi, redosled, srodne teme.
4. **Početni sadržaj i povezivanje** — čekiranje postojećeg objavljenog sadržaja preko discovery metapodataka + napomena da se nov edukativni sadržaj kreira u CMS-u.
5. **Javna ruta** — „Predloži rutu” je onemogućeno dok ne postoji `termId`; posle predloga ide „Potvrdi rutu”, pa poruka da je upisan `canonicalPath` i da stariji slug ostaje alias sa 308.
6. **Pregled** — tabela rezimea (tip, naziv, stable ID, term ID, nadređena oblast, kanonska ruta, broj povezanih sadržaja, status) + „Pošalji na pregled”, „Otvori u CMS-u”, „Novi unos”.

Ponašanje koje mora da radi:
- „Sačuvaj i nastavi” i „Sačuvaj i izađi” na svakom koraku.
- Stable ID se **zaključava posle prvog uspešnog čuvanja** (polje `disabled` + napomena).
- Kolizija stable ID-ja = **field-level greška (409)** uz polje, bez gubitka unosa: „Stable ID „x” već postoji u registru (409). Unos je sačuvan — izmenite ID.”
- Isti registar, validatori, payload i React Query cache kao napredni editor; `canonicalPath` se mergeuje u cache.

## 4. `/kompas`

- **Hero** (`bg-surface`, `rounded-modal`): eyebrow „Kompas mentalnog zdravlja”, H1 „Vaš vodič do podrške koja ima smisla za vas”, lead, mala napomena „Kompas nije test i ne postavlja dijagnozu…”, dugmad „Pokreni Kompas” i „Preskoči pitanja”, ispod tri kratka reda (pet pitanja / bez naloga / možete stati). Slot za hero sliku ostaviti prazan — dodaje se kasnije iz panela.
- **Pitanja su inline, ispod Hero-a** — bez modala i bez posebne rute. **Bez teksta „korak X od Y”**; napredak je diskretna traka od 5 segmenata + tekst „Pitanja su opciona”.
- Pet pitanja redom: oblast (`topic_group`) → do dve teme (`topic`, multi-select max 2, jasno uklanjanje) → publika (`audience`) → cilj (`content_goal`, do tri) → put (`explore | professional_support | both`). Opcije **isključivo iz objavljenog registra**; ako osa nema objavljenih vrednosti — preskače se.
- Sentinel „Nisam siguran/na šta mi se događa” je poslednja opcija prvog pitanja (isprekidana ivica), **nije taxonomy termin**, odmah otvara Polazni prikaz.
- Odgovoreno se prikazuje kao red čipova sa „izmeni”.
- **Stalna traka „Uvek dostupno”**: „Preskoči pitanja” · „Prikaži preporuke sada” · „Vrati se na oblasti” · „Želim stručnu pomoć”.
- **Polazni prikaz**: kratak uvod (`bg-meadow/30`), grid svih oblasti, red aktuelnih tema, „Dostupno bez odgovora na pitanja” (javni sadržaji), linkovi ka `/kompas/oblasti` i `/kompas/teme`, nenametljiv CTA ka stručnoj pomoći.
- **Prilagođeni prikaz**: rezime izbora (čipovi + „Izmeni odgovore”, „Poništi podešavanje”), pa sekcije redom „Za bolje razumevanje”, „Praktični alati”, „Radionice i programi”, pa tamni blok „Stručna podrška”. Bez beskonačnog feed-a.
- **Kartica sadržaja**: tip (chip), trajanje, badge pristupa („Javno dostupno” / „Za registrovane”), naslov (serif), opis, blok **„Zašto ovo vidite”** sa najviše 3 razloga u običnom jeziku (bez numeričkog skora), „Otvori →”, i mikro-feedback „Korisno? Da / Nije mi ovo trebalo”.
- **Feedback banner** posle smislenog korišćenja ili „Završi istraživanje”, najviše **jednom po sesiji**: „Da, odvojiću minut” otvara drawer, „Ne sada” zatvara.
- **Anketni drawer** (`compass-experience-v1`, anoniman, UX-only, bez slobodnog teksta): relevantnost / jasnoća sledećeg koraka / šta je nedostajalo (multi) / lakoća pronalaženja stručne pomoći + napomena da se ne unose lični ni zdravstveni podaci. Odgovori **nikada** ne ulaze u recommendation.
- **Handoff drawer** („Želim stručnu pomoć”): lista onoga što se prenosi (oblast, teme, publika, put) sa isključivanjem stavki, napomena da se ne prenose zdravstveni podaci ni istorija čitanja, „Potvrdi i nastavi” → Intake. Kompas ne rangira terapeute.

## 5. `/kompas/oblasti`

Hero blok sa breadcrumb-om `Kompas / Oblasti`, H1, lead („Redosled dolazi iz registra — nije rangiranje po važnosti”), dugmad „Pogledaj sve teme” i „Pokreni Kompas”. Ispod grid kartica oblasti (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`): redni broj, kružno dugme sa strelicom, naslov, opis, do 3 čipa tema, footer meta „N tema · N sadržaja”.

## 6. `/kompas/teme`

Hero sa breadcrumb-om, H1, lead („pretraga radi lokalno nad učitanim javnim skupom”), polje za pretragu + „Poništi” + brojač „N od M tema”. Grid kartica teme: chip oblasti (vodi na oblast), naziv teme (vodi na temu), broj sadržaja. Prazno stanje: poruka + „Prikaži sve teme”. **Izabrane teme ne idu u query string.**

## 7. Kanonske stranice — `/kompas/oblast/anksioznost`, `/kompas/tema/napadi-panike`

- Breadcrumbs (`BreadcrumbList` JSON-LD, ništa novo).
- Oblast: hero na `bg-meadow/30`, eyebrow „Oblast”, H1, opis, meta „N tema · N objavljenih sadržaja”; sekcija „Teme u ovoj oblasti” (kartice naziv + opis); „Objavljeni sadržaji” (grid kartica) ili **prazno stanje** „Za ovu oblast još nema objavljenih sadržaja… prikazuju se čim budu objavljeni u registru”; traka „Srodne oblasti” + „Želim stručnu pomoć”.
- Tema: hero `bg-surface`, eyebrow „Tema”, H1, opis, meta; „Sadržaji uz ovu temu” ili prazno stanje; traka „Druge teme u oblasti” + „Želim stručnu pomoć”. Kartice ovde takođe imaju mikro-feedback.
- Ponašanje ruta po specifikaciji: aktuelan slug 200, stari alias 308 na aktuelan, nepostojeći 404, mrežni/5xx se ne pretvara u soft-404. Slotovi za slike opisa oblasti/teme ostaju prazni do unosa iz panela.

---

## Responsive pravila

- Sve mreže: `grid` + `gap`, `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3`; nizovi dugmadi/čipova `flex flex-wrap gap-2`.
- Dodirne mete minimalno 44px visine (`min-h-11`).
- Na mobilnom se prikazuje **jedno pitanje / jedna sekcija** bez pretrpanosti.
- Drawer: pun bottom-sheet na mobilnom, panel do 470px na desktopu; `rounded-t-[24px]`, scrim zatvara, Escape/fokus po postojećem drawer obrascu (ne duplirati modal infrastrukturu — reupotrebiti Research Drawer shell).

## Definicija završenog

- Preskok i sentinel vode na Polazni prikaz; delimični odgovori daju validan recommendation zahtev.
- Nema „korak X od Y”, nema modala nad pitanjima, nema tema u URL-u.
- Sve boje i radijusi iz tokena; nema inline hex vrednosti.
- Kontrola za pregled je izolovana i briše se jednim uklanjanjem komponente.
- Mobilni i desktop provereni na `/kompas`, obe liste, obe kanonske stranice i „Brzi unos”.
