# KOMPAS TODO — discovery i recommendation sloj

**Status:** K1 backend foundation i K2.0–K2.2 panel foundation implementirani; sledeći korak je K2.3 proširenje svih uređivih registry polja
**Datum:** 2026-07-31  
**Vlasnik tehničkih odluka:** Milan Dražić (CTO)  
**Vlasnik stručne kategorizacije i javnih naziva:** Anja Stamenković i stručni tim  
**Ulazni dokument:** `CODEX HANDOFF — KOMPAS.docx`, primljen 2026-07-31  
**Povezano:** O-21 · D-047 · D-048 · D-052 · **D-053 · D-054 · ADR-022 Amandman 1** · ADR-016 · ADR-018 · budući ADR-019/ADR-021

---

## 0. Kako se koristi ovaj dokument

- Ovo je jedini operativni TODO za Kompas. `TODO.md` i `CMS_TODO.md` nose samo sažetak i link ovde.
- D-053, D-054 i ADR-022 Amandman 1 zaključali su taksonomiju, kanonske stranice i dinamičku granicu. Implementacija ide backend foundation → route registry/panel → CMS → katalog/vodiči → recommendation/javni Kompas.
- Konačna Anjina kategorizacija menja podatke registra, ne strukturu engine-a. Novi ili precizniji nazivi ne smeju zahtevati izmenu Kompas koda.
- Ne hardkodovati stručne kategorije, sinonime ni recommendation pravila u React komponentama.
- U korisničkom i panel jeziku `topic_group` se zove **Oblast**. Sistemski `support_area` se uvek zove **Intake oblast podrške**; to nisu ista osa.
- Ne praviti novi višekoračni upitnik. Kompas je interaktivna površina koja reaguje odmah.
- Ne uvoditi AI kao preduslov za v1. Prvi engine mora biti determinističan i objašnjiv.
- `subscriber` i `purchased` postoje samo kao rezervisan ciljni ugovor. Panel ih prikazuje onemogućene kao „U pripremi” i ne sme da ih sačuva ili objavi pre stvarnog R5 entitlement sistema (D-048).
- Ne praviti Dnevnu sobu, čuvanje sadržaja ni privatne kolekcije kroz ovaj plan (O-23).
- Po `TODO.md` §0A, testovi/build/lint/typecheck se ne pokreću automatski posle implementacije. Verifikacija se radi kao posebna faza samo na Milanov zahtev, prvenstveno kroz stvaran vertikalni korisnički tok.

### Statusi

| Oznaka | Značenje |
| --- | --- |
| ✅ | Završeno |
| 🟡 | Delimično |
| ⬜ | Nije započeto |
| 🚫 | Blokirano postojećom odlukom ili nedostajućim domenom |
| ⏸️ | Namerno kasnije |

---

## 1. Zaključana definicija proizvoda

> **Kompas je interaktivni discovery i recommendation sloj iznad zajedničkog kataloga objavljenog sadržaja.**

Kompas korisniku omogućava da:

- izabere jednu ili više oblasti/tema i odmah vidi relevantan sadržaj;
- proširi, suzi ili ukloni izbor bez obaveznog završavanja toka;
- bira između istraživanja sadržaja i prelaska ka stručnoj podršci;
- dobije objašnjiv razlog zašto je sadržaj prikazan;
- pređe u postojeći Intake bez ponavljanja neutralnog konteksta koji je već izabrao;
- iz Intake toka ode nazad na informisanje ako još nije spreman za razgovor.

### Tri odvojene javne površine

1. `/kompas/oblast/[slug]` je kanonska, indeksabilna stranica jedne šire oblasti (`topic_group`). Prikazuje odobren uvod, podteme i objavljene sadržaje vezane za tu oblast.
2. `/kompas/tema/[slug]` je kanonska, indeksabilna stranica jedne konkretne teme (`topic`) i uvek pokazuje kojoj oblasti pripada.
3. `/kompas` je dinamički istraživač koji u memoriji kombinuje više izabranih oblasti i tema. Kombinacija ne dobija novu javnu SEO stranicu ni čitljiv query URL.

Kanonska stranica objašnjava jednu oblast ili temu. Dinamički Kompas bira, uklanja duplikate i raspoređuje već odobrene sadržaje za trenutni izbor, ali ne izmišlja stručnu tvrdnju o tome kako su teme povezane. Kada tim odobri takvu tvrdnju, ona pripada opcionom `CompassGuide` entitetu.

Javni `[slug]` je zaseban, locale-aware route identitet. Ne koristi se kao recommendation ključ i ne izvodi se ponovo pri svakoj promeni javne labele. Pre prve objave tim potvrđuje predloženi slug; posle objave promena pravi novi kanonski route zapis, a prethodni ostaje redirect ka istom stabilnom terminu. Interni `stableId` ostaje nepromenljiv semantički autoritet.

Kompas nije:

- psihološki test, dijagnostika ili procena mentalnog stanja;
- krizni servis;
- novi terapeut matching algoritam;
- kopija postojećeg Intake & Matching Engine-a;
- klasičan wizard sa „korak X od Y”;
- zaseban katalog koji kopira CMS;
- page builder;
- AI personalizacija u prvoj verziji.

### Tri sistemske vrednosti puta

Kontrola mora stalno da dozvoli:

1. `explore` — želim da istražujem sadržaj;
2. `professional_support` — želim stručnu podršku;
3. `both` — sadržaj je koristan za oba puta.

„Ne znam kako da opišem” nije stručna tema i ne čuva se kao `topicId`. To je discovery ulaz/escape hatch koji korisniku nudi lakše početne izbore.

---

## 2. Stvarno trenutno stanje repozitorijuma

### 2.1 Šta već možemo ponovo koristiti

| Postojeće | Stanje | Kako ga Kompas koristi |
| --- | --- | --- |
| `ContentEntry` + `ContentRevision` | Postoje, tenant-scoped, verzionisani i auditovani | Stabilan identitet i revision-bound metadata za sadržaj |
| `ContentReviewDecision` + publication lifecycle | Postoje | Stručni/poslovni review i objava sadržaja |
| `ContentProvider` + CMS override | Postoji za šest trenutnih `ContentType` vrednosti | Javni read-model objavljenih entiteta |
| RichDoc + `.docx` import | Postoje | Autorski tok budućih članaka |
| Content Health | Postoji | Publication validacija taksonomijskih referenci i metadata |
| `therapist_matching_profiles` | Postoji, tenant-scoped | Intake autoritet za terapeute, uzrast, format, lokaciju i capability-je |
| Intake matching v3 | Postoji | Jedini autoritet za uslugu/terapeuta |
| Intake team queue + reassign | Postoje | Ljudsko preuzimanje/handoff slučaja |
| `sessionStorage` obrazac | Postoji za booking summary | Kandidat za jednokratni Kompas ↔ Intake handoff |
| Access decision iz ADR-018 | Ugovor postoji, puni ResourceAsset još ne | `public/registered/staff_only` granica za v1 |
| K1 taxonomy registry + staff/public API | Implementirano, migracija čeka posebnu rollout/test fazu | DB autoritet za oblasti (`topic_group`), teme, publike, ciljeve i sistemske vrednosti |

### 2.2 Šta još ne postoji

| Nedostaje | Posledica |
| --- | --- |
| `ContentType.article` i article model | Tri kartice u `/znanje` su fallback/„u pripremi”, nisu objavljeni katalog |
| Article template + javna ruta + Article JSON-LD | Kompas još nema pravi stručni članak koji može da preporuči |
| Panel „Kompas” | K2 treba da omogući uređivanje oblasti, tema, publika, ciljeva i povezivanja nad K1 API-jem |
| Revision-bound discovery metadata | CMS sadržaj nema `topicIds`, `journeyIntent`, `goalIds`, `audienceIds` |
| Compass recommendation read-model/API | Nema autoritativnog filtriranja ni objašnjivih razloga |
| Kanonske `/kompas/oblast/[slug]` i `/kompas/tema/[slug]` stranice | Oblast/tema još nemaju route identitet, javni agregacioni read-model i renderer |
| Revisioned `CompassGuide` | Nema opcionog authored/approved vodiča za stručne tvrdnje o čestim kombinacijama |
| `ResourceAsset` implementacija | PDF/radni list još nisu preporučivi asset entiteti |
| Audio/video/knjiga katalog | Ne uvoditi placeholder modele |
| Pretplate/kupovine | Blokirano do R5 (D-048) |
| Dnevna soba / SavedItem | Zasebna O-23 odluka |

### 2.3 Mesta na kojima stručni pojmovi danas postoje kao tekst ili zaseban rečnik

| Mesto | Uloga | Da li je budući autoritet |
| --- | --- | --- |
| `frontend/src/features/guidance/taxonomy.ts` | Intake fallback registry | Ne za Kompas; kasnije generated snapshot ili DB adapter |
| `backend/.../guidance/taxonomy.py` | Intake stabilni ID-jevi | Samo Intake ugovor |
| `therapist_matching_profiles.areas` | Intake routing ID-jevi | Operativni Intake podatak |
| `contracts/fixtures/taxonomy.v1.json` | Parity za Intake | Ugovor O-24a, ne Kompas katalog |
| `frontend/src/content/therapists.ts::areas` | Javni čipovi profila | Ne; prezentacioni sadržaj |
| `frontend/src/content/homepage.ts::reasons` | Početne javne kartice | Ne; budući potrošač DB grupa |
| `frontend/src/content/homepage.ts::resources[].category` | Fallback kartice znanja | Ne |
| `frontend/src/content/services.ts::supportAreas` | Javni putevi/usluge | Ne |
| `frontend/src/content/company.ts::COMPANY_TOPICS` | B2B konfigurator | Zaseban B2B rečnik dok ADR ne odluči mapiranje |
| CMS therapist `areas.items` slot | Javni tekst profila | Ne sme određivati recommendation logiku |
| Workspace demo `data.ts::areas` | Preview/mock prikaz | Ne |

**Zaključak:** O-24a je rešio drift unutar Intake-a, ali nije napravio Kompas taksonomiju. Kompas mora dobiti zaseban, DB-backed katalog i eksplicitnu vezu ka Intake rečniku.

Tačan broj javnih grupa je trenutno sadržajni drift, ne arhitektonska blokada: `content-architecture.md` predlaže pet početnih puteva, homepage danas prikazuje šest kartica, a novi handoff govori o približno osam preglednih grupa. Anjina konačna tabela zamenjuje ovaj nesklad podacima registra; model i API se zbog broja grupa ne menjaju.

---

## 3. Kanonski jezik Kompasa

### 3.1 Odvojene ose

Za svaki sadržaj se odvojeno definišu:

| Osa | API/ugovorno ime | Primer | Pravilo |
| --- | --- | --- | --- |
| Šira oblast | `topicGroupId` | `stress-overload` | UI naziv za tehničku osu `topic_group`; jedna primarna oblast u v1 |
| Konkretne teme | `topicIds` | `burnout`, `difficulty-resting` | Jedna ili više tema iz izabrane oblasti |
| Put korisnika | `journeyIntent` | `explore`, `professional_support`, `both` | Tačno jedna zaključana sistemska vrednost |
| Cilj sadržaja | `goalIds` | `understand`, `practical-step` | Jedan ili više kontrolisanih ciljeva |
| Publika | `audienceIds` | `self`, `parent`, `adolescent` | Jedna ili više publika |
| Format sadržaja | `contentFormat` | `article`, `worksheet` | Ne zvati samo `format`, jer Intake već koristi format rada |
| Pristup | `accessPolicy` | `public`, `registered` | V1 samo vrednosti koje backend može stvarno da proveri |
| Pretraživačke oznake | `searchTerms` | `sagorevanje`, `iscrpljenost` | Nikada recommendation autoritet |

Ne koristiti:

- `contentType` za format — `ContentBase.type` već ima drugo javno značenje;
- `areas` kao novo API/DB ime; reč „Oblast” je dozvoljena UI labela samo za `topic_group`, dok je `support_area` uvek označen kao „Intake oblast podrške”;
- title, labelu ili slug stranice kao semantički ključ;
- slobodan string kada postoji stabilan ID.

### 3.2 Primer ugovora sadržaja

```json
{
  "topicGroupId": "stress-overload",
  "topicIds": ["burnout", "difficulty-resting"],
  "journeyIntent": "both",
  "goalIds": ["understand", "prepare-for-conversation"],
  "audienceIds": ["self"],
  "contentFormat": "article",
  "accessPolicy": "public"
}
```

Drugi sadržaj može deliti temu, ali imati drugu ulogu:

```json
{
  "topicGroupId": "stress-overload",
  "topicIds": ["burnout"],
  "journeyIntent": "explore",
  "goalIds": ["practical-step"],
  "audienceIds": ["self"],
  "contentFormat": "worksheet",
  "accessPolicy": "registered"
}
```

### 3.3 System journey ugovor i početni managed predlozi

Samo je `journeyIntent` ispod zaključan D-053/ADR-022 sistemski rečnik:

```text
journeyIntent
├── explore
├── professional_support
└── both
```

Sledeće su početni managed predlozi za unos i stručnu potvrdu, ne hardkodovan sistemski rečnik:

```text
goalIds
├── understand
├── practical-step
├── prepare-for-conversation
└── discover-support

audienceIds
├── self
├── parent
├── adolescent
├── partner
├── family
└── general-information
```

Javna labela/opis, status i redosled managed ciljeva/publika uređuju se kroz panel. Njihov stable ID ostaje nepromenljiv nakon kreiranja.

Otvoreno za Anju/tim:

- da li `child` postoji kao zasebna publika ili se uvek vodi kroz `parent` zbog pravila za maloletnike;
- da li „informišem se za drugu osobu” traži poseban ID ili pripada `general-information`.

### 3.4 Formati i pristup — cilj naspram izvršivog v1

| Vrednost | Ciljni katalog | V1 status |
| --- | --- | --- |
| `article` | Da | Posle ADR-019 i pravog article toka |
| `program` | Da | Kada postoji objavljeni entitet i card adapter |
| `pdf` / `worksheet` | Da | Posle `ResourceAsset` vertikale iz ADR-018 |
| `audio` | Da | ⏸️ Nema model/provider |
| `video` | Da | ⏸️ `VideoAsset` namerno nije otvoren |

Knjiga, radionica, partner, klinika i affiliate preporuka nisu vrednosti ovog sistemskog format rečnika. Dobijaju svoj entitet/adapter ili kontrolisanu relation vrstu tek kada njihov domen bude formalno spreman.

| Access vrednost | V1 | Kasnije |
| --- | --- | --- |
| `public` | Da | — |
| `registered` | Da | — |
| `staff_only` | Sistemska vrednost, ne javna Kompas kartica | — |
| `subscriber` | Rezervisan; prikazati disabled „U pripremi”, ne upisivati | R5, aditivno |
| `purchased` | Rezervisan; prikazati disabled „U pripremi”, ne upisivati | R5, aditivno |

`contentFormat` treba vratiti u javnom API-ju, ali ga ne duplirati kao ručno polje kada se pouzdano izvodi iz tipa entiteta/asset-a.

---

## 4. Dve taksonomije i jedan kontrolisan most

Kompas i Intake nemaju isti posao:

| Kompas | Intake & Matching |
| --- | --- |
| Široke javne oblasti (`topic_group`) | Pet stabilnih routing `SupportAreaId` vrednosti iz D-052 |
| Konkretne sadržajne teme | Razlozi, usluge i terapeutski capability-ji |
| Preporučuje sadržaj | Preporučuje uslugu/terapeuta |
| Može raditi bez kompletnog izbora | Primenjuje hard constraints |
| Ne rangira terapeute | Jedini autoritet rangiranja terapeuta |

Primer:

```text
Kompas topic: burnout
        │
        └── stručno odobrena veza ──> Intake support area: anxiety_stress
```

Pravila mosta:

- nova tabela/registry čuva vezu `topicId -> SupportAreaId`;
- veza može biti više-na-više;
- veza traži Clinical review;
- Kompas je koristi samo da pripremi neutralan handoff kontekst;
- nijedna veza ne dodaje matching poene i ne bira terapeuta;
- ako mapiranje nije jednoznačno, Intake postavlja svoje pitanje umesto automatskog prefill-a;
- `addiction_related_support` ostaje uža terapeutska capability oznaka, ne Kompas topic grupa;
- promena javne labele ne menja ni `topicId` ni `SupportAreaId`.

---

## 5. Preporučena granica modula

```mermaid
flowchart LR
    T[(DB taxonomy)] --> C[Content metadata i publication]
    C --> R[Published discovery read-model]
    R --> K[Compass recommendation service]
    K --> U[Kompas UI]
    K --> H[Neutralni handoff kontekst]
    H --> I[Intake & Matching]
    I --> Q[Team queue / booking]
    A[Access policy port] --> R
    L[Layout/Article renderer] --> R
```

### `modules/content`

Vlasnik je:

- DB taksonomije i njenih revizija;
- revision-bound metadata sadržaja;
- objavljenog discovery read-modela;
- validacije referenci pri review/publish toku;
- determinističkog content recommendation servisa u v1;
- veza ka objavljenim uslugama/programima.

**Preporuka:** ne otvarati novi backend `modules/compass` samo zbog prve javne površine. Kompas je zaseban proizvod, ali njegov v1 domen je čitanje i preporuka objavljenog sadržaja. Novi modul traži poseban ADR i ima smisla tek ako kasnije dobije nezavisan lifecycle ili podatke koji nisu sadržaj.

### `modules/guidance`

Ostaje vlasnik:

- Intake pitanja i odgovora;
- uzrasta, lokacije i formata rada;
- service capability-ja;
- terapeuta i rangiranja;
- safety/human review pravila;
- Team Queue i handoff-a slučaja.

`modules/guidance` ne uvozi content modele niti čita Kompas tabele u matching funkciji.

### Shared ugovor

U `shared/domain` sme da postoji samo mali tip/Protocol za:

- stabilnu taksonomijsku referencu;
- `CompassHandoffContextV1`;
- kodove razloga preporuke.

DB modeli, repository i recommendation pravila ne pripadaju `shared/`.

### Layout/AI/Dnevna soba

- Layout Engine bira dozvoljeni recept/blokove za članak; ne rangira Kompas rezultate.
- Affiliate/CTA blok koristi potvrđene `relatedServiceIds`/`relatedProgramIds`, ne tagove.
- Preporuka spoljnog partnera, klinike ili affiliate ponude traži poseban stabilan entitet, disclosure i Business review; ne sme se modelovati kao slobodan URL ili sinonim teme.
- AI agenti kasnije mogu predlagati metadata, ali čovek prihvata predlog kao običnu revision izmenu.
- Dnevna soba kasnije čuva reference na objavljene sadržaje; ne ulazi u Kompas v1.

---

## 6. Kanonski DB model — usvojen ADR-022

Tačna SQLAlchemy imena mogu pratiti postojeće konvencije, ali granice ispod su zaključane.

### Stabilni identiteti

`taxonomy_terms`

- `id` — UUID;
- `organization_id` — obavezan za managed termine; `NULL` samo za system termine;
- `axis`;
- `stable_id` — nepromenljiv identitet;
- `system_defined`;
- `created_at`, `created_by_user_id`;
- unique identitet po osi i vlasniku;
- stable ID se nikada ne reciklira za drugo značenje.

Managed ose su `topic_group | topic | content_goal | audience`. System ose su `support_area | journey_intent | content_format | access_level` i postojeći lifecycle/approval ugovori. Tenant uređuje stručne termine, ali ne menja ID i semantiku system vrednosti.

### Verzije termina

`taxonomy_term_revisions`

- `term_id`;
- `version`;
- `locale`;
- `public_label`;
- `short_description`;
- `internal_expert_note`;
- `primary_parent_term_id` — samo topic → topic group;
- `journey_intent_term_id` — system izbor za put konkretne teme;
- `sort_order`;
- `icon_key` ili nullable `asset_id`;
- `public_visible`;
- `compass_enabled`;
- `status` — `draft | in_review | approved | published | archived`;
- `lock_version`;
- created/updated/published/archived actor evidence.

Labela i opis mogu da se promene bez promene stabilnog identiteta. Lifecycle, javna vidljivost i aktivnost u Kompasu su tri odvojene stvari. Arhiviranje ne briše istoriju.

### Sinonimi, pretraga i veze

`taxonomy_term_search_terms`

- vezani za tačnu term revision;
- `locale`;
- originalna i normalizovana vrednost;
- služe isključivo pretrazi i pronalaženju;
- ne ulaze direktno u recommendation score.

`taxonomy_term_relations`

- revision-bound izvor i stabilni target;
- kontrolisan `relation_kind`, počev od `related_topic`;
- nema slobodan URL, score ni therapist ID.

### Metadata sadržaja

`content_revision_taxonomy_terms`

- `revision_id`;
- `term_id`;
- kontrolisana uloga reference;
- unique po revision/term/ulozi;
- metadata pripada tačnoj reviziji, ne `ContentEntry` identitetu.

`content_revision_discovery`

- `revision_id` — 1:1;
- tačno jedan `journeyIntent`;
- izvedeni ili kontrolisano potvrđen `contentFormat`;
- eventualni kontrolisani editorial priority/tie-breaker;
- bez `estimatedTime` ako je izvodljiv;
- bez terapeuta;
- bez slobodnih tagova kao logičkog autoriteta.

`content_revision_relations`

- `revision_id`;
- `target_entry_id`;
- `relation_kind = related_service | related_program`;
- target mora biti objavljen i odgovarajućeg `ContentType`.

### Kompas ↔ Intake most

`taxonomy_intake_links`

- `topic_term_id`;
- `support_area_term_id` iz system ose sa pet D-052 ID-jeva;
- Clinical review evidence i lifecycle;
- nema score/therapist kolone.

### Tenant granica

- managed stručni termini su org-scoped;
- system ugovori su platform-wide i mogu dobiti samo odobren lokalizovan label override;
- sadržaj i njegove metadata veze ostaju tenant-scoped kroz `ContentRevision`;
- tenant ne sme redefinisati značenje system `stable_id`;
- sadržaj sme da referencira samo system termin ili managed termin iste organizacije;
- svaki public recommendation query mora krenuti iz organizacije i nikada vratiti sadržaj drugog tenant-a.

### Migracija postojećih Intake oblasti

Pet D-052 oblasti se backfill-uje kao system `support_area` termini. `therapist_matching_profiles.areas` prelazi sa JSON autoriteta na join reference kroz create → backfill → dual-read/parity → cutover faze. Matching značenje, težine i `addiction_related_support` capability se ne menjaju.

### Kanonski route identitet oblasti i teme

`stable_id` ostaje interni semantički ključ i ne mora biti javni SEO slug. Pre K2 forme koja prikazuje budući URL uvodi se mali route registry za managed `topic_group`/`topic` termine:

- term reference, tenant, locale, route kind (`oblast | tema`) i normalizovan javni `slug`;
- najviše jedan kanonski route po terminu/locale-u i unique slug po tenant/locale/route-kind granici;
- slug se potvrđuje pre prve objave i ne menja automatski sa labelom;
- korekcija već objavljenog sluga dodaje novi kanonski zapis; stari route ostaje alias i server radi permanent redirect;
- route istorija i actor evidence se ne brišu;
- slug nikada ne ulazi u recommendation, CMS metadata ili Intake most kao autoritet.

### Opcioni urednički `CompassGuide` — nije deo taxonomy termina

Česte i stručno važne kombinacije mogu kasnije dobiti poseban, odobren vodič. Vodič je sadržajni entitet u `modules/content`, ne nova taxonomy osa i ne deo K2 generičkog registry editora.

Identitet i revizija moraju biti odvojeni:

- `compass_guides`: tenant-scoped stabilan identitet i nepromenljivi `slug`/ID za administraciju; ne pravi javnu kombinacionu rutu niti sitemap stavku;
- `compass_guide_revisions`: locale, title, RichDoc summary, status, lock, actor evidence i odobrenja;
- tipizirane match reference posebno za `topic_group` i `topic` — API koristi `matchTopicGroupIds` i `matchTopicIds`, ne dvosmisleni zajednički niz;
- opcioni `audienceIds` i `goalIds` samo kao kontrolisane reference;
- ograničen skup sekcija: pregled teme, stručna veza tema, preporučeni sadržaji, praktični materijali, mediji, knjige, programi i stručna podrška;
- sekcije referenciraju objavljene entitete; nema slobodnog URL-a, therapist rangiranja ni proizvoljnog page buildera;
- najmanje Clinical + Business review pre objave; svaka stručna tvrdnja o preplitanju tema mora biti authored i odobrena.

Pravilo izbora je determinističko:

1. tačan objavljeni vodič za normalizovan skup izabranih oblasti/tema;
2. ako ga nema, jedan najkonkretniji objavljeni vodič čiji je skup podskup izbora, uz stabilan editorial/tie-break redosled;
3. preostale oblasti/teme prikazuju se odvojeno;
4. ako vodiča nema, generički prikaz samo grupiše i deduplikuje metadata rezultate bez tvrdnje da su teme stručno povezane.

`CompassGuide` ne blokira K2 ni K3 registry/CMS metadata foundation. Uvodi se tek kada postoji stvarni objavljeni katalog koji njegove sekcije mogu da referenciraju.

---

## 7. Publication i anti-drift pravila

Sadržaj ne može biti objavljen u Kompas katalog ako:

- nema tačno jednu aktivnu `topicGroupId` referencu;
- nema najmanje jednu aktivnu `topicId` referencu;
- topic nije dete izabrane oblasti;
- nema `journeyIntent`, `goalIds` ili `audienceIds`;
- referencira nepoznat ili arhiviran termin;
- `contentFormat` ne odgovara stvarnom tipu entiteta/asset-a;
- access politika nema backend evaluator;
- related service/program ne postoji ili nije objavljen;
- metadata revision nije prošla potrebni Clinical/Business review;
- pokušava da referencira terapeuta radi rangiranja.

Managed oblast/tema ne može biti objavljena bez jednog aktivnog kanonskog route zapisa za svoj tenant i locale. Javni slug koristi lowercase ASCII kebab-case; stari alias razrešava samo objavljen termin i vraća `308` ka aktuelnoj kanonskoj putanji, bez curenja draft podataka.

Za `article` je kompletan discovery metadata deo article publish gate-a. Postojeći `service`/`program` može ostati objavljen na svojoj ruti bez tog metadata, ali tada nije Kompas kandidat; uključivanje u Kompas zahteva kompletan metadata i odgovarajući review.

Promena metadata:

- menja istu `ContentRevision` dok je draft/in_review;
- posle odobrenja/objave ide kroz novu radnu verziju;
- poništava odobrenja nove revizije kao i svaka druga sadržajna izmena;
- ostaje pripisana stvarnom actor-u.

Arhivirani termin:

- nije dostupan novim draftovima;
- ne lomi istorijski objavljenu reviziju;
- stara objava i audit i dalje mogu razrešiti labelu koja je važila;
- deljeni/stari izbor korisnika dobija razumljivu zamenu ili uklanjanje, ne 500.

Jedinstveni fixture/generated artefakt:

- može da zaključava seed i API shape;
- nije runtime izvor istine posle DB migracije;
- frontend ga ne održava ručno;
- generated TypeScript tipovi dolaze iz OpenAPI ugovora.

---

## 8. Deterministički recommendation v1

### Ulaz

```json
{
  "taxonomyVersion": "kompas-taxonomy-v1",
  "topicGroupId": "stress-overload",
  "topicIds": ["burnout"],
  "journeyIntent": "explore",
  "goalIds": ["understand"],
  "audienceIds": ["self"],
  "limit": 12
}
```

Bez:

- slobodnog teksta;
- dijagnoze;
- zaključka o korisniku;
- therapist ID-ja;
- kontakta;
- matching skora.

### Eligibility pre rangiranja

Kandidat mora biti:

- objavljen;
- u traženom locale-u i tenant-u;
- sa validnim aktivnim metadata referencama;
- javno vidljiv ili prikaziv kao dozvoljena registered kartica;
- podržanog formata;
- odobren za recommendation katalog.

### Početni redosled signala

1. tačan `topicId`;
2. pripadnost izabranoj `topicGroupId`;
3. `journeyIntent`;
4. `goalId`;
5. `audienceId`;
6. kontrolisani editorial tie-breaker;
7. stabilan tehnički tie-breaker radi determinističkog rezultata.

Težine i tie-break pravila pripadaju backend registry-ju sa `ruleVersion`, nikad React komponenti.

### Objašnjivost

Svaka kartica vraća najviše tri razloga, na primer:

```text
topic:burnout
goal:practical-step
audience:self
```

API vraća stabilne reason kodove i lokalizovan tekst. Ne prikazuje numerički skor.

### Empty state i proširenje

Ako nema tačnog pogotka:

1. ukloniti najpre opcioni cilj, ne temu;
2. proširiti sa konkretne teme na grupu;
3. prikazati početne/uvodne sadržaje iste grupe;
4. ponuditi pregled svih objavljenih sadržaja i nenametljiv Intake CTA.

Nikada ne prikazivati nepovezan sadržaj samo da lista ne bude prazna.

---

## 9. Minimalni backend–frontend ugovor

### Staff registry

Administrativni API podržava list/search po osi i statusu, create managed termina, novu radnu reviziju, optimistic locking, sinonime/hijerarhiju/veze, submit/review/publish/archive i actor evidence. Zaključane system vrednosti vraća kao read-only opcije za select kontrole. Nevalidna referenca vraća stabilan reason code, `fieldPath` i jasnu poruku na srpskom.

K2.0 additivno dodaje route komande samo za oblast/temu: predlog i potvrdu novog sluga, eksplicitnu korekciju sa očuvanim aliasom i read-only `canonicalPath`. Stable ID endpoint se ne menja.

Panel „Kompas” koristi ovaj API kroz regenerisan OpenAPI klijent. Ne održava taxonomy fixture kao runtime autoritet.

### Public taxonomy

`GET /api/v1/public/compass/taxonomy?locale=sr-Latn`

Vraća:

- `taxonomyVersion`;
- aktivne oblasti, labele, opise i redosled;
- podteme;
- `canonicalPath` samo za objavljene oblasti/teme, bez alias istorije;
- sinonime samo ako su potrebni klijentskoj pretrazi;
- dozvoljene journey/goal/audience vrednosti;
- ne vraća draft/arhivirane definicije.

### Recommendations

`POST /api/v1/public/compass/recommendations`

Vraća:

- normalizovan izbor;
- objavljene kartice sadržaja;
- `itemKind`, `contentFormat`, naslov, sažetak, route i asset preview;
- access stanje koje je backend već procenio;
- reason kodove i najviše tri javna razloga;
- computed `estimatedTime` kada postoji;
- predložene povezane teme;
- neutralni `CompassHandoffContextV1`;
- informaciju da je izbor prilagođen ako je deljeni termin u međuvremenu arhiviran.

### Greške

| Slučaj | Ponašanje |
| --- | --- |
| Nepoznat ID u staff editoru | 422 sa `fieldPath`, ID-jem i jasnim uputstvom |
| Arhiviran ID pri publish-u | Publication BLOCK finding |
| Stara javna selekcija | 200 + `selectionAdjustments`, bez rušenja |
| Nema rezultata | 200 + kontrolisani empty state |
| Backend nedostupan | Neutralna poruka + link ka `/znanje` i Intake-u; bez hardkodovanog lažnog kataloga |
| `staff_only` sadržaj | Nikada u javnom odgovoru |
| Registered sadržaj anonimnom korisniku | Kartica samo ako politika dozvoli teaser; sadržaj ostaje zaključan backendom |

---

## 10. Kompas ↔ Intake handoff

### `CompassHandoffContextV1`

```json
{
  "schemaVersion": "1",
  "taxonomyVersion": "kompas-taxonomy-v1",
  "topicGroupId": "stress-overload",
  "topicIds": ["burnout"],
  "audienceIds": ["self"],
  "journeyIntent": "professional_support",
  "createdAt": "ISO-8601",
  "expiresAt": "ISO-8601"
}
```

Pravila:

- kontekst je neutralan izbor interesovanja, ne dijagnoza;
- ne sadrži free text, kontakt, procenu rizika ni terapeuta;
- Intake UI prikazuje šta je preneto i traži potvrdu korisnika;
- Intake i dalje postavlja sva obavezna hard-constraint pitanja;
- prefill Intake razloga je dozvoljen samo kada odobreni most daje jednoznačan rezultat;
- backend matching računa rezultat isključivo svojim pravilima;
- reverse handoff koristi isti kontekst: „Još nisam spreman/na — želim sadržaj”.

### Stanje i privatnost

Preporuka za v1:

- izbor tokom korišćenja živi u React memoriji;
- nastavak u istom browser session-u koristi verzionisan `sessionStorage` zapis sa kratkim TTL-om;
- handoff ka Intake-u koristi jednokratni `sessionStorage` zapis, po postojećem booking-summary obrascu;
- query parametri ne nose teme — završili bi u server/proxy logovima i analytics URL-u;
- eksplicitno deljenje, ako se odobri, koristi URL fragment koji se ne šalje serveru, uz jasnu korisničku akciju;
- sirovi topic izbori se ne šalju analytics-u uz user/session identitet;
- nikakav Compass `GuidanceSession` se ne upisuje u bazu u v1 bez zasebne retention/privacy odluke.

---

## 11. Faze implementacije

### K0 — odluke i ulazni podaci

- [x] **K0.1** Pročitan `CODEX HANDOFF — KOMPAS.docx` i napravljen current-state nalaz.
- [x] **K0.2** Razdvojene Kompas topic ose od D-052 Intake routing oblasti.
- [x] **K0.3** Usvojen **D-053**: backend → panel → CMS → javni Kompas; DB autoritet; managed i system registri; bez therapist ranking-a.
- [x] **K0.4** Usvojen **ADR-022**: vlasništvo, revision model, tenant granica, API, migracija D-052 oblasti i Kompas ↔ Intake most.
- [ ] **K0.5** Potvrditi osnovni vs napredni Kompas i release mapu; „napredni” ne sme biti sinonim za AI bez konkretne vrednosti.
- [x] **K0.6** ADR-022 zaključava v1 session state: React memorija + kratki `sessionStorage` TTL, bez query topic ID-jeva, DB profila i identifikovanog analytics-a; eksplicitno deljenje ostaje otvoreno.
- [ ] **K0.7** Primiti i uneti Anjinu konačnu mapu oblasti/tema/sinonima.
- [x] **K0.8** Usvojen **D-054 / ADR-022 Amandman 1**: „Oblasti” su UI naziv za `topic_group`; kanonske oblast/tema stranice su odvojene od dinamičkog `/kompas`; stručne kombinacije pripadaju opcionom revisioned `CompassGuide` vodiču.

**Gate K0:** ✅ D-053 + D-054 + ADR-022 Amandman 1 su accepted. Nepoznate konačne labele su podaci registra i ne blokiraju implementation redosled.

### K1 — backend registry foundation

- [x] **K1.1** `taxonomy_terms`: org-scoped managed ose + globalne system ose; stable ID nema update putanju i DB identitet je zaštićen parcijalnim unique indeksima.
- [x] **K1.2** `taxonomy_term_revisions`: labela/opis, interna napomena, parent/journey reference, redosled, ikona/asset, odvojeni visibility/Compass flagovi, shared lifecycle, optimistic lock i actor evidence.
- [x] **K1.3** Revision-bound sinonimi/search terms i kontrolisane `related_topic`/`replacement` veze; sinonimi nisu recommendation autoritet.
- [x] **K1.4** Migracija `20260731_0011` seeduje pet D-052 `support_area`, tri `journey_intent`, šest `content_format` i samo izvršive D-048 access vrednosti. `subscriber`/`purchased` nisu DB redovi.
- [x] **K1.5** Ista migracija backfill-uje FK join tabelu iz JSON `areas`; Guidance čita reference kao autoritet, upozorava na parity drift i pada na legacy JSON samo kada reference još ne postoje.
- [x] **K1.6** `taxonomy_intake_links` ima tenant scope, lifecycle, lock, Clinical decision evidence i audit; nema score/therapist kolonu.
- [x] **K1.7** Draft/review/approve/publish/archive, reissue, Clinical+Business odluke, archive/replacement i RESTRICT guard-ovi implementirani su nad postojećim shared lifecycle-om. Term nema hard-delete putanju, pa se stable ID nikada ne reciklira.
- [x] **K1.8** Staff create/read/update/review/publish/archive API je pod `/api/v1/content/taxonomy`; javni read-model je `/api/v1/public/compass/taxonomy` i vraća samo published + public + Compass-enabled podatke tenant-a/locale-a.
- [x] **K1.9** Taxonomy greške vraćaju stabilan `TAX-*` code, `fieldPath` i srpsku poruku; public schema nema internal note, review ni actor podatke.
- [x] **K1.10** OpenAPI šema i `frontend/src/types/api.generated.ts` regenerisani su posle završetka backend ugovora.

**Gate K1:** ✅ Implementaciono zatvoren. Stable ID nema mutation ni hard-delete, cross-tenant/reference guard-ovi su u servisu i DB-u, D-052 read ima kontrolisani dual-read cutover, a API nosi actor događaje. Izvršavanje migracije i stvarni ulogovani tok ostaju za posebno zatraženu test fazu po `TODO.md` §0A.

### K2 — panel „Kompas”

- [x] **K2.0a** Dodati su migracija `20260731_0012` i model route registry-ja samo za `topic_group`/`topic`: tenant + locale + route kind + lowercase ASCII kebab slug, jedan kanonski route i sačuvana alias istorija sa actor evidence-om.
- [x] **K2.0b** Staff API daje predlog/potvrdu/korekciju sluga, koristi optimistic lock i publication guard; stari alias javno vraća `308` samo ka aktuelnom objavljenom terminu. Stable ID ostaje odvojen i ne menja se.
- [x] **K2.0c** Staff/public read-model nose `canonicalPath`; route istorija ostaje samo u zaštićenom staff odgovoru, a javni taxonomy odgovor ne izlaže draft ni alias podatke. OpenAPI klijent je regenerisan.
- [x] **K2.1** Dodata je admin-only panel površina `/radni-prostor/kompas` sa tabovima **Oblasti · Teme · Publike · Ciljevi sadržaja · Povezivanja · Pregled i odobrenja**. Čita stvarni staff API kroz Clerk proxy i TanStack Query, ima loading/error/empty stanja, statusne preglede i actor evidence. „Oblasti” koriste `topic_group`; `support_area` se prikazuje samo kao „Intake oblast podrške” u Povezivanjima.
- [x] **K2.2** Napravljen je jedan generički create/edit editor sa konfiguracijom po managed osi, bez četiri kopirana formulara. Oblast, tema, publika i cilj koriste isti mutation/cache tok; tema dodatno zahteva kontrolisanu oblast i system put korisnika. Stabilni ID se unosi samo pri kreiranju i posle je zaključan. `support_area` nije dobio editor ni javni tab.
- [ ] **K2.3** Omogućiti javni naziv/opis, sinonime, hijerarhiju, redosled, ikonu/asset, vidljivost, aktivnost u Kompasu, povezane teme i internu stručnu napomenu.
- [ ] **K2.4** Stable ID prikazati zaključano nakon kreiranja; system ID/semantiku nikad ne ponuditi kao slobodno polje.
- [ ] **K2.5** Journey/format/access/lifecycle/approval vrednosti učitati kao system select opcije; D-052 `support_area` učitati samo kao read-only izbor za topic → Intake povezivanje; `subscriber`/`purchased` su disabled „U pripremi”.
- [ ] **K2.6** Uvesti stvarni draft → in_review → approved → published → archived tok sa Clinical/Business odobrenjima.
- [ ] **K2.7** Prikazati mali actor badge za kreiranje, izmenu, odobrenje, objavu i arhiviranje.
- [ ] **K2.8** Implementirati razumljive srpske validation/error poruke, fokus na konkretno polje i globalni error banner bez neželjenog skrola pri običnom kliku.
- [ ] **K2.9** Org admin i D-051 superadmin koriste postojeće role/capability-je; ne uvoditi novu Clerk rolu niti zahtevati therapist profil superadminu.
- [ ] **K2.10** Pre prve objave predložiti i potvrditi javni slug, a zatim prikazati preview buduće kanonske rute `/kompas/oblast/[slug]` ili `/kompas/tema/[slug]`. Promena labele ne menja slug; korekcija objavljenog sluga koristi novi kanonski route i čuva stari redirect. K2 još ne implementira javne stranice.

**K2.0 napomena:** implementacija je završena bez primene migracije i bez stvarnog ulogovanog browser toka. To ostaje za posebno zatraženu test fazu po `TODO.md` §0A.

**K2.1 granica:** ovaj korak je završio read-only upravljačku površinu nad stvarnim registrom. Create/edit je zatim dodat kroz K2.2; lifecycle komande, odobrenja i potvrda sluga i dalje se uvode redom kroz K2.3–K2.10 nad postojećim backend ugovorom.

**K2.2 granica:** generički editor sada stvarno kreira i menja osnovni draft (javni naziv, kratak opis i obavezni topic kontekst) kroz staff API i `lockVersion`. Sinonimi, redosled, asset/ikona, vidljivost, Kompas aktivnost, povezane teme i interna stručna napomena ostaju objedinjeno proširenje K2.3; lifecycle i odobrenja nisu preuranjeno dodati.

**Gate K2:** Anja ili ovlašćeni org admin može napraviti draft oblasti/teme, jasno razlikuje oblast Kompasa od Intake oblasti podrške, šalje na pregled, odobrava/objavljuje po dozvoli, menja labelu bez promene ID-ja/rute i vidi ko je izvršio svaku radnju.

### K3 — neposredna CMS integracija

- [ ] **K3.1** Vezati taxonomy reference za `ContentRevision`, ne `ContentEntry`.
- [ ] **K3.2** U CMS formama koristiti DB-backed kontrolisana polja za oblast, teme, put, cilj, publiku, format i nivo pristupa.
- [ ] **K3.3** UI pitanja pisati jezikom terapeuta: „Kojim oblastima pripada…?”, „Kome je namenjen…?”, „Šta korisnik dobija…?”, „Istraživanje, stručna podrška ili oba?”, „Ko može da pristupi?”.
- [ ] **K3.4** Ne prikazivati `journeyIntent`, `topicGroupId` ili `accessLevel` kao glavne labele i ne dozvoliti slobodan taxonomy string.
- [ ] **K3.5** Format i estimated time izvoditi kada god je moguće; onemogućiti vrednost za koju nema stvarnog entiteta/handlera.
- [ ] **K3.6** Dodati potvrđene veze ka uslugama/programima; isključiti therapist recommendation metadata.
- [ ] **K3.7** Dodati server Content Health pravila i jasne srpske remediation poruke.
- [ ] **K3.8** Metadata izmena mora da se vidi u actor audit-u i da poništi odobrenja nove revizije.
- [ ] **K3.9** Content bez kompletnog metadata može ostati objavljen na svojoj ruti, ali ne ulazi u Kompas katalog dok ne prođe eligibility gate.
- [ ] **K3.10** Pravne saglasnosti i `custom_document` ne uključivati automatski; Kompas PDF/radni list je budući odobren `ResourceAsset`.

**Gate K3:** admin uređuje stvarni podržani sadržaj, bira ID-jeve iz DB registra, čuva, dobija precizne nalaze, odobrava i objavljuje bez slobodnog taxonomy stringa.

### K3A — article/Layout i katalog sadržaja, zasebna domenska kapija

- [ ] **K3A.1** ADR-019: `article` tip, identitet, autor/reviewer, izvori, SEO/JSON-LD i javna ruta.
- [ ] **K3A.2** ADR-021: minimalni Layout Engine recept pre prvog article renderer-a; AI generisanje nije deo ovog koraka.
- [ ] **K3A.3** Dodati `ContentType.article`/article template tek posle ADR-019.
- [ ] **K3A.4** Završiti stvarni `.docx → RichDoc → metadata → review → approve → publish → public article` tok.
- [ ] **K3A.5** Potvrditi koji postojeći `service`/`program` entiteti imaju discovery card adapter.

**Gate K3A:** najmanje jedan stvarni objavljeni članak i jedan dozvoljeni postojeći entitet ulaze u isti discovery read-model. Ova kapija ne blokira K1/K2.

### K3B — kanonske stranice i urednički vodiči

- [ ] **K3B.1** Definisati read-model i route resolver za jednu objavljenu oblast i jednu objavljenu temu; kanonske rute su `/kompas/oblast/[slug]` i `/kompas/tema/[slug]`, a stari alias radi permanent redirect.
- [ ] **K3B.2** Kanonska stranica automatski okuplja objavljene podteme/sadržaje iz registra i metadata; ne pravi kopiju sadržaja ni novu stranicu za kombinaciju.
- [ ] **K3B.3** Implementirati opcioni revisioned `CompassGuide` identitet tek nad stvarnim katalogom, sa odvojenim `matchTopicGroupIds`/`matchTopicIds`, kontrolisanim sekcijama, lock-om, actor audit-om i Clinical + Business review-om.
- [ ] **K3B.4** Reference vodiča moraju pokazivati na aktivne taxonomy termine i objavljene dozvoljene sadržaje; arhivirana/neobjavljena referenca blokira approval/publish.
- [ ] **K3B.5** Ne dozvoliti slobodan page builder, slobodan URL, AI-authored stručnu vezu, therapist ID ni recommendation score u vodiču.

**Gate K3B:** jedna oblast i jedna tema imaju kanonski read-model, a opciono odobren vodič može opisati stvarnu kombinaciju bez menjanja taxonomy registra ili pravljenja kombinacione SEO stranice.

### K4 — recommendation service

- [ ] **K4.1** Verziran request/response ugovor.
- [ ] **K4.2** Tenant/locale/status/access eligibility filter.
- [ ] **K4.3** Deterministički ranking registry sa `ruleVersion`.
- [ ] **K4.4** Najviše tri plain-language razloga.
- [ ] **K4.5** Kontrolisano širenje rezultata i empty state.
- [ ] **K4.6** Paginacija i stabilan tie-break.
- [ ] **K4.7** Nema AI poziva, embeddings-a, profila korisnika ni terapeuta.
- [ ] **K4.8** Za kombinovani prikaz birati: tačan objavljeni `CompassGuide` → najkonkretniji subset vodič → generičke odvojene sekcije; izbor vodiča ima verzirano i stabilno tie-break pravilo.
- [ ] **K4.9** Generički prikaz deduplikuje sadržaje i može isticati zajedničke metadata pogotke, ali nikada ne generiše tekst o uzročnoj ili stručnoj povezanosti tema.

**Gate K4:** isti request i ista verzija kataloga daju isti redosled i razloge.

### K5 — dvosmerni Intake handoff

- [ ] **K5.1** `CompassHandoffContextV1` i TTL.
- [ ] **K5.2** Jednokratni browser handoff bez query topic parametara.
- [ ] **K5.3** Kompas → Intake sa vidljivom potvrdom prenetog konteksta.
- [ ] **K5.4** Intake → Kompas za korisnika koji još nije spreman da zakaže.
- [ ] **K5.5** Ambiguous topic mapping ne prefill-uje razlog.
- [ ] **K5.6** Matching rezultat, usluga i terapeut ostaju isključivo Intake odgovor.

**Gate K5:** izbor `burnout` može da otvori Intake sa neutralnim kontekstom, ali promena Intake odgovora potpuno kontroliše konačnu preporuku i handoff tima ostaje dostupan.

### K6 — javni Kompas UI

- [ ] **K6.1** Implementirati tri odvojene površine tek kada K1–K5 rade: `/kompas`, `/kompas/oblast/[slug]` i `/kompas/tema/[slug]`.
- [ ] **K6.2** Oblasti (`topic_group`) i teme dolaze iz DB read-modela; nema frontend stručnog niza. D-052 Intake oblasti se ne prikazuju kao javne Kompas oblasti.
- [ ] **K6.3** Jedna interaktivna površina, bez „korak X od Y”.
- [ ] **K6.4** Izbor oblasti odmah prikazuje sadržaj.
- [ ] **K6.5** Multi-select tema/filtera, uklanjanje i reset.
- [ ] **K6.6** Sekcije rezultata bez beskonačnog feed-a; konačni copy dolazi iz UX/content odluke.
- [ ] **K6.7** Razlog preporuke i access oznaka na kartici.
- [ ] **K6.8** Stalno vidljiv nenametljiv prelaz ka stručnoj podršci.
- [ ] **K6.9** Hero i „Razlozi dolaska” otvaraju Kompas sa potvrđenim početnim ID-jem.
- [ ] **K6.10** Posebna kartica za „ne znam odakle da počnem”, bez lažne stručne teme.
- [ ] **K6.11** Dinamički prikaz pokazuje čipove „Vaš trenutni izbor”, linkuje svaku oblast/temu ka njenoj kanonskoj stranici i ne koristi reč „profil”.
- [ ] **K6.12** Ne kreirati `/kompas/tema/kombinacija` stranice niti čitljive topic query parametre; izbor ostaje na `/kompas` u React/session stanju.
- [ ] **K6.13** `/kompas/putanja/[opaqueId]` je kasniji privatni saved-path domen i ne ulazi u v1 bez retention/access odluke.

**Gate K6:** korisnik sa početne bira oblast, odmah vidi stvarno objavljen sadržaj, menja izbor, otvara kanonsku oblast/temu ili članak i može u Intake bez wizard osećaja; nijedna kombinacija ne pravi novu SEO stranicu ili stručnu tvrdnju bez odobrenog vodiča.

### K7 — dodatni formati i access

- [ ] **K7.1** `ResourceAsset` vertikala za PDF/radni list po ADR-018.
- [ ] **K7.2** Knjiga/spoljna preporuka tek posle ugovora o izvoru, autoru, linku i affiliate disclosure-u.
- [ ] **K7.2a** Partner/klinika/affiliate preporuka tek posle stabilnog partner entiteta, disclosure pravila i Business review-a.
- [ ] **K7.3** Audio tek kada postoji asset/provider i playback ugovor.
- [ ] **K7.4** Video tek kada se donese provider/privacy/cost odluka.
- [ ] **K7.5** `subscriber`/`purchased` tek posle R5 entitlement podataka i access reason kodova.

### K8 — napredni Kompas i AI

- [ ] **K8.1** Najpre izmeriti osnovni Kompas: izbor → otvaranje sadržaja → prelaz u Intake.
- [ ] **K8.2** Definisati konkretnu vrednost „naprednog” tier-a.
- [ ] **K8.3** AI može predlagati topic/goal/audience metadata samo kao reviewable patch.
- [ ] **K8.4** Zod/Pydantic validacija ostaje autoritet ugovora; AI output nikad direktno u objavljenu reviziju.
- [ ] **K8.5** Bez psihološkog profilisanja i bez automatskog kliničkog zaključka.
- [ ] **K8.6** Layout/SEO/CTA agenti rade nad odobrenim blokovima i relacijama, ne menjaju Kompas granice.

---

## 12. Sutrašnji unos od Anje — format koji ne blokira razvoj

### Oblasti (`topic_group`)

| Polje | Primer |
| --- | --- |
| `proposedStableId` | `stress-overload` |
| javni naziv | Stres i preopterećenost |
| kratak opis | Plain-language opis za karticu |
| redosled | 1 |
| javno vidljiva | da |
| aktivna u Kompasu | da |
| ikona/asset | opciono |
| lifecycle | draft |

### Teme

| Polje | Primer |
| --- | --- |
| `proposedStableId` | `burnout` |
| `topicGroupId` | `stress-overload` |
| javni naziv | Burnout |
| sinonimi | sagorevanje; iscrpljenost; preopterećenost |
| put | oba |
| povezane teme | opciono |
| Intake veza | `anxiety_stress` |
| napomena/reviewer | stručna napomena bez javne dijagnoze |

Pravila unosa:

- naziv se može precizirati bez promene stable ID-ja;
- ako se dve teme spoje, stari ID se arhivira i dobija eksplicitnu zamenu;
- ako se tema podeli, stari ID se ne reciklira;
- jedna tema ima jednu primarnu grupu u v1;
- cross-cutting kontekst se ne rešava dupliranjem teme;
- ne unositi „ne znam kako da opišem” kao temu;
- ništa od ovoga ne zahteva izmenu recommendation koda.

---

## 13. Stvarni acceptance tokovi

Kada Milan otvori posebnu fazu testiranja, prioritet su:

1. Admin bira pravi članak i dodeljuje postojeće taxonomy ID-jeve.
2. Nepostojeći/arhivirani ID daje preciznu srpsku grešku i blokira objavu.
3. Clinical/Business reviewer odobrava istu revision metadata.
4. Objavljeni članak se pojavljuje u Kompasu bez frontend izmene.
5. Promena javne labele u DB menja prikaz, ali ne URL/reference/logiku.
6. Sinonim „sagorevanje” pronalazi `topicId: burnout`.
7. Izbor teme odmah menja preporuke bez wizard koraka.
8. Razlog preporuke je jasan i nema numerički skor.
9. Kompas → Intake prenosi neutralni kontekst, ali ne terapeuta.
10. Intake → Kompas vraća korisnika na sadržaj.
11. Registered sadržaj ostaje backend-zaštićen; `staff_only` ne curi u public API.
12. Tenant A nikada ne vidi sadržaj tenant-a B.
13. Stari shared/session izbor sa arhiviranim terminom se oporavlja bez 500.
14. Sirovi topic izbor ne završava u query logu, analytics payload-u ili audit event-u.
15. `/kompas/oblast/stres-i-preopterecenost` i `/kompas/tema/burnout` ostaju kanonske pojedinačne stranice; promena labele ih ne menja, stari slug redirectuje posle eksplicitne korekcije, a izbor više termina ostaje na `/kompas` i ne proizvodi kombinacionu rutu.
16. Bez objavljenog `CompassGuide` prikaz razdvaja oblasti/teme i ne tvrdi da su stručno povezane; objavljeni exact/subset vodič dobija prednost po verziranom pravilu.

Mali broj contract/parity testova može se dodati uz vertikalni tok, ali se izvršava samo u posebno zatraženoj test-fazi po `TODO.md` §0A.

---

## 14. Otvorene odluke koje plan ne sme da izmisli

### Od Milana

- [x] D-053 i ADR-022 prihvaćeni 2026-07-31.
- [ ] Da li je basic Kompas deo R3 Content release-a ili zaseban release iza feature flag-a.
- [ ] Šta tačno daje „napredni Kompas”.
- [ ] Da li eksplicitno deljenje izbora ulazi u v1.
- [ ] Minimalni Layout Engine recept koji mora postojati pre prvog article renderer-a.
- [ ] Da li Kompas v1 preporučuje postojeće usluge/programe ili samo sadržaj uz zaseban Intake CTA.

### Od Anje i stručnog tima

- [ ] Konačne oblasti, javni nazivi, opisi i redosled.
- [ ] Konkretne teme i sinonimi.
- [ ] Topic → Intake support-area veze.
- [ ] `child` i „za drugu osobu” audience odluka.
- [ ] Konkretna raspodela Anje/ovlašćenih članova na postojeće Clinical i Business review capability-je.
- [ ] Koje veze sadržaj → usluga/program su stručno i poslovno opravdane.

### Odloženo drugim domenima

- 🚫 Pretplata/kupovina — R5.
- 🚫 Company entitlement — R4 + ADR-015.
- 🚫 Saved/progress/private collections — O-23.
- ⏸️ Video provider i VideoAsset.
- ⏸️ AI personalizacija i automatsko metadata predlaganje.
- ⏸️ Krizni copy i klinički routing — zasebna pravna/stručna odluka.

---

## 15. Sledeći konkretan korak

D-053, D-054 i ADR-022 Amandman 1 su usvojeni. Sledeće:

1. nastaviti **K2.3 proširenjem uređivih registry polja**, zatim K2.4–K2.10 stvarnim governance tokom na već postavljenom generičkom editoru;
2. povezati registar sa **K3 CMS formama**;
3. Anjinu konačnu tabelu uneti kao stručne podatke čim stigne, bez menjanja arhitekture;
4. završiti K3A katalog i K3B kanonske stranice/`CompassGuide` ugovor, zatim K4/K5 i tek tada javni K6;
5. širiti formate i AI tek posle stvarnog osnovnog toka.
