# ADR-022 — Kompas registar, panel i CMS granica

**Status:** Accepted  
**Datum:** 2026-07-31  
**Vlasnik tehničke odluke:** Milan Dražić (CTO)  
**Vlasnik stručnih podataka:** Anja Stamenković i ovlašćeni stručni tim  
**Povezano:** D-047 · D-048 · D-051 · D-052 · D-053 · D-054 · ADR-016 · ADR-018 · budući ADR-019/ADR-021 · `KOMPAS_TODO.md`

**Amandman 1 — 2026-07-31:** D-054 razdvaja kanonske stranice oblasti/tema od dinamičkog kombinovanog prikaza, uvodi „Oblast” kao UI naziv za postojeći `topic_group` i rezerviše opcioni revisioned `CompassGuide` za authored/approved stručne veze između tema.

---

## 1. Kontekst

Kompas treba da preporučuje objavljen sadržaj po stabilnim temama, putu korisnika, cilju sadržaja, publici, formatu i nivou pristupa. Te vrednosti danas nisu jedan domen:

- Intake & Matching ima pet stabilnih D-052 oblasti, ali ih postojeći profili još nose kao JSON listu;
- javne stranice i CMS slotovi sadrže slobodne nazive oblasti;
- Kompas topic grupe, konkretne teme, sinonimi, publike i ciljevi još nemaju DB autoritet;
- `ContentRevision` nema kontrolisane Kompas metadata reference;
- frontend seed ili ručno održavan niz ponovo bi napravio drift između panela, API-ja i javne površine;
- terapeuti ne treba da uređuju tehničke ugovore kao što su lifecycle, approval tip ili semantika access nivoa.

Konačna Anjina mapa grupa i tema može da se dopunjuje i precizira. To je promena stručnih podataka, ne razlog da se arhitektura ili kod menjaju pri svakoj korekciji.

---

## 2. Odluka

Kompas koristi jedan kanonski, revisioned i auditovan DB registar. Redosled implementacije je obavezujući:

1. backend foundation registra;
2. frontend panel „Kompas” za upravljanje registrom;
3. kontrolisana Kompas metadata polja u CMS formama;
4. recommendation read-model/API i javni Kompas.

Ne pravimo javni Kompas nad seedovanim ili hardkodovanim kategorijama. Panel i CMS moraju koristiti stvarni backend ugovor. AI, Layout Engine i article renderer nisu preduslov za prva dva koraka; ADR-019 i ADR-021 ostaju preduslov tek za stvarni `article` tok i prikaz članka.

Javna arhitektura ima tri odvojene površine:

- `/kompas/oblast/[slug]` — kanonska stranica jedne `topic_group` oblasti;
- `/kompas/tema/[slug]` — kanonska stranica jedne konkretne `topic` teme;
- `/kompas` — dinamički prikaz trenutnog multi-select izbora, bez kombinacione SEO rute i bez čitljivih topic query parametara.

Kombinovani prikaz ne dobija novu taxonomy vrednost ili stranicu. Engine sme da grupiše i deduplikuje odobrene sadržaje, ali ne sme da napiše stručnu tvrdnju o povezanosti tema. Takva tvrdnja postoji samo u opcionom, ljudski napisanom i odobrenom `CompassGuide` vodiču.

---

## 3. Vlasništvo modula

`backend/modules/content` je v1 vlasnik:

- registra i njegovih revizija;
- administrativnog i javnog taxonomy API-ja;
- revision-bound content metadata;
- content eligibility i publication validacija;
- determinističkog recommendation read-modela;
- kontrolisanih veza sadržaja ka uslugama/programima;
- topic → Intake support-area mosta.

`backend/modules/guidance` ostaje jedini vlasnik:

- Intake pitanja i odgovora;
- hard constraint-a;
- terapeuta, capability-ja i matching rangiranja;
- Team Queue i ljudskog handoff-a.

Ne otvara se `modules/compass` u v1. Javni Kompas je proizvodna površina nad Content domenom, a ne novi vlasnik iste taksonomije. Novi modul zahteva zaseban ADR tek ako Kompas dobije sopstveni lifecycle ili perzistentne korisničke podatke.

---

## 4. Dve klase registara

### 4.1 Stručni registri koje tim uređuje

Org-scoped i revisioned registri su:

- `topic_group`;
- `topic`;
- `audience`;
- `content_goal`.

U panelu i javnom UI-ju `topic_group` se zove **Oblast**. `support_area` se uvek prikazuje kao **Intake oblast podrške** i dostupna je samo kao zaključana sistemska vrednost u topic → Intake povezivanju. Amandman ne uvodi novu taxonomy osu.

Anja i ovlašćeni članovi tima mogu da uređuju:

- javni naziv i kratak opis;
- sinonime i pojmove za pretragu;
- primarnu grupu teme;
- redosled prikaza;
- ikonu ili budući asset;
- javnu vidljivost;
- aktivnost u Kompasu;
- povezane teme;
- dozvoljeni put korisnika;
- internu stručnu napomenu;
- lifecycle `draft | in_review | approved | published | archived`.

Managed stable ID koristi lowercase kebab-case, na primer `stress-overload` i `burnout`. Formira se pri prvom kreiranju, proverava se pre čuvanja i posle toga se ne menja niti reciklira.

### 4.2 Sistemski registri i ugovorne vrednosti

Platforma definiše:

- `support_area`;
- `journey_intent`;
- `content_format`;
- `access_level`;
- lifecycle statuse;
- tipove approval-a;
- druge kodove koje recommendation/access engine očekuje.

Tenant ne može proizvoljno da kreira, obriše, preimenuje ID ili menja semantiku ovih vrednosti. Može da koristi odobren lokalizovan javni naziv gde je to dozvoljeno. Na primer:

```text
stable ID: professional_support
javna labela: Želim stručnu podršku
```

Labela kasnije može postati „Želim razgovor sa stručnom osobom”, dok `professional_support` i ponašanje sistema ostaju isti. Sistemski ID koristi snake_case zbog postojećih backend ugovora.

---

## 5. Zaključani sistemski rečnici

### Put korisnika

Jedna kontrolisana vrednost:

- `explore`;
- `professional_support`;
- `both`.

`both` je prava ugovorna vrednost, ne niz koji svaki klijent tumači drugačije.

### Format sadržaja

Ciljni ugovor:

- `article`;
- `pdf`;
- `video`;
- `audio`;
- `worksheet`;
- `program`.

Vrednost se bira samo kada postoji odgovarajući domenski entitet/renderer i backend validacija. `contentFormat` se izvodi iz entiteta kad god je jednoznačan; administrator ga ne može lažirati. Knjige, spoljni partneri, klinike i affiliate preporuke nisu format — dobijaju zasebne relation entitete i disclosure pravila kada budu formalno usvojeni.

### Nivo pristupa

Ciljni javni ugovor rezerviše:

- `public`;
- `registered`;
- `subscriber`;
- `purchased`.

Trenutno izvršive i dodeljive javne vrednosti su samo `public` i `registered`; `staff_only` ostaje interni access kod koji nikada nije javna Kompas kartica. `subscriber` i `purchased` mogu u panelu biti prikazani samo kao onemogućene vrednosti „U pripremi”. Ne smeju se sačuvati, dodeliti ili objaviti dok R5 ne obezbedi entitlement podatke, evaluator i stabilne access reason kodove.

Do tada `subscriber` i `purchased` nisu DB taxonomy redovi niti vrednosti persistiranog access enum-a; predstavljaju samo zaključan ciljni naziv u dokumentaciji/UI capability manifestu.

Ovaj ADR ne menja i ne slabi D-048/ADR-018.

### Lifecycle i approval tipovi

Zaključani lifecycle je:

- `draft`;
- `in_review`;
- `approved`;
- `published`;
- `archived`.

Zaključani approval tipovi ostaju postojeći:

- `legal` — Pravno;
- `clinical` — Stručno;
- `business` — Poslovno.

Panel prikazuje razumljive javne labele, ali tenant ne kreira nove statuse ili approval semantiku.

---

## 6. Kanonski model podataka

Tačna imena tabela mogu se prilagoditi postojećem SQLAlchemy stilu, ali sledeće granice su obavezne.

### 6.1 Stabilan identitet

`taxonomy_terms`

- `id` — UUID;
- `organization_id` — obavezan za managed termine; `NULL` samo za platform system termine;
- `axis`;
- `stable_id`;
- `system_defined`;
- `created_at`;
- `created_by_user_id`;
- unique identitet po osi i vlasniku;
- stable ID je nepromenljiv i nikada se ne koristi za novo značenje.

### 6.2 Revizije termina

`taxonomy_term_revisions`

- `term_id`;
- `version`;
- `locale`;
- `public_label`;
- `short_description`;
- `internal_expert_note`;
- `primary_parent_term_id` za `topic → topic_group`;
- `journey_intent_term_id` za kontrolisani put konkretne teme;
- `sort_order`;
- `icon_key` ili nullable `asset_id`;
- `public_visible`;
- `compass_enabled`;
- lifecycle status;
- `lock_version`;
- `created_by`, `updated_by`, `published_by`, `archived_by` i datumi.

`public_visible`, `compass_enabled` i lifecycle nisu isto:

- lifecycle kaže gde je revizija u governance toku;
- `public_visible` određuje da li se termin sme prikazati javno;
- `compass_enabled` određuje da li učestvuje u Kompas izboru i preporukama.

Javni API vraća samo `published + public_visible + compass_enabled` revizije.

### 6.3 Sinonimi i veze

`taxonomy_term_search_terms`

- vezan za konkretnu revision;
- locale;
- originalna i normalizovana vrednost;
- služi pretrazi i sinonimima;
- nije recommendation autoritet.

`taxonomy_term_relations`

- revision-bound izvor i stabilni target;
- kontrolisani `relation_kind`, počev od `related_topic`;
- nema slobodan URL, score ni therapist ID.

### 6.4 Metadata sadržaja

`content_revision_taxonomy_terms`

- veza ka tačnoj `ContentRevision`;
- term reference;
- kontrolisana uloga reference;
- unique ograničenja po revision/term/ulozi.

`content_revision_discovery`

- jedna `journey_intent` vrednost;
- izvedeni ili kontrolisano potvrđen `content_format`;
- postojeći access policy;
- bez terapeuta, dijagnoze i slobodnih taxonomy stringova.

`content_revision_relations`

- kontrolisane veze ka objavljenim uslugama/programima;
- budući partner/affiliate target tek posle zasebnog ugovora.

Metadata pripada reviziji sadržaja. Promena nakon odobrenja pravi novu radnu verziju i poništava njena odobrenja kao i svaka druga sadržajna izmena.

### 6.5 Kompas → Intake most

`taxonomy_intake_links`

- `topic_term_id`;
- `support_area_term_id`;
- Clinical review evidence;
- lifecycle/audit;
- bez score-a, težine ili therapist reference.

Most samo priprema neutralan kontekst. Intake i dalje postavlja obavezna pitanja i sam računa rezultat.

### 6.6 Migracija D-052 oblasti

Pet D-052 ID-jeva ulazi u sistemsku osu `support_area`:

- `anxiety_stress`;
- `relationships`;
- `parenting`;
- `trauma_crisis`;
- `personal_growth`.

Postojeći `therapist_matching_profiles.areas` prelazi na referencijalni model kroz:

1. kreiranje system termina;
2. backfill join veza iz postojećeg JSON-a;
3. privremeni dual-read/parity period;
4. prebacivanje matching read-a na reference;
5. uklanjanje starog JSON autoriteta tek nakon posebne verifikacione faze.

Ne menjaju se D-052 značenje, matching score niti Anjina `addiction_related_support` capability oznaka.

### 6.7 Opcioni `CompassGuide`

`CompassGuide` je tenant-scoped sadržajni entitet u `modules/content`, ne taxonomy termin i ne slobodan page builder. Uvodi se tek kada postoji objavljeni katalog koji može da referencira.

- stabilni `compass_guides` identitet odvaja se od revisioned title/summary/sections/status/audit podataka; njegov slug/ID je administrativni identitet i ne proizvodi javnu kombinacionu rutu ili sitemap zapis;
- match ugovor razdvaja `matchTopicGroupIds` i `matchTopicIds`; opcioni audience/goal kriterijumi su kontrolisane taxonomy reference;
- sekcije su ograničena diskriminisana unija: topic overview, topic connection, recommended content, practical resources, media, books, programs i professional support;
- sekcije referenciraju objavljene domenske entitete, bez slobodnih URL-ova, therapist ID-ja i recommendation score-a;
- vodič traži najmanje Clinical + Business review i koristi isti lifecycle, optimistic lock i actor evidence kao ostali governed content;
- objava se blokira ako je match/reference termin arhiviran ili referencirani sadržaj nije objavljen i dozvoljen.

Engine prvo traži exact vodič za normalizovan skup izbora, zatim jedan najkonkretniji subset vodič po verziranom stabilnom tie-break pravilu, a zatim generički prikaz. Preostale teme se u subset slučaju prikazuju odvojeno. Generički prikaz nikad ne tvrdi da su teme stručno povezane.

### 6.8 Kanonski javni route identitet

Interni `stable_id` i javni SEO slug nisu ista odgovornost. Managed `topic_group`/`topic` termini dobijaju locale-aware route registry:

- jedan lowercase ASCII kebab kanonski slug po terminu i locale-u, unique unutar tenant + route-kind granice;
- slug se potvrđuje pre prve objave i ne izvodi se ponovo kada se promeni javna labela;
- korekcija objavljenog sluga pravi novi kanonski route, dok prethodni ostaje istorijski alias koji vraća `308` ka aktuelnoj kanonskoj putanji;
- route zapis nosi actor evidence i ne briše se dok termin postoji;
- javni resolver razrešava samo objavljen termin i nikada ne otkriva draft route/alias podatke;
- recommendation, CMS metadata i Intake most i dalje referenciraju stabilni term ID, nikada slug.

---

## 7. Tenant i bezbednosna granica

- Managed termini pripadaju organizaciji i ne mogu se čitati ili referencirati iz drugog tenant-a.
- System termini su platform contract; tenant može dobiti samo dozvoljeni revisioned label override.
- Javni taxonomy i recommendation upit uvek polazi od organizacije i locale-a.
- Content revision može referencirati samo termine koji su system ili pripadaju istoj organizaciji.
- Internal expert note, draft, review evidence i actor podaci nikada ne ulaze u public API.
- Arhiviranje čuva istorijske reference; fizičko brisanje termina koji ima reference nije dozvoljeno.
- Za spajanje/podelu tema koristi se archive + eksplicitna replacement relacija; stable ID se ne prepisuje.

---

## 8. Uloge, odobrenja i audit

Ne uvodimo novu Clerk rolu.

- `org_admin` uređuje registar i panel; Anja i ovlašćeni članovi tima dobijaju postojeću dozvolu kroz organizaciju.
- Postojeći Content review capability model određuje ko daje Clinical i Business odobrenje.
- Oblasti (`topic_group`), teme, publike, ciljevi i topic → support-area veze prolaze najmanje Clinical + Business review pre objave.
- System contract izmena nije tenant operacija.
- D-051 superadmin može da radi iste dozvoljene operacije bez therapist profila, ali svaka radnja nosi stvarnog actor-a i u panelu prikazuje mali badge ko je kreirao, izmenio, odobrio, objavio ili arhivirao.
- Internal expert note je samo za osoblje i nikada se ne kopira u javni opis.

---

## 9. API granica

Administrativni API mora omogućiti:

- listanje po axis/status/search uslovima;
- create managed termina;
- novu radnu reviziju i optimistic locking;
- izmenu labela, opisa, sinonima, hijerarhije, reda, ikone/asset-a i flagova;
- dodavanje kontrolisanih veza;
- submit for review, odluke, publish i archive;
- preciznu proveru referenci i razumljive srpske greške;
- čitanje actor/audit evidence;
- listanje zaključanih sistemskih vrednosti za select kontrole.

Amandman 1 additivno uvodi staff route komande za managed oblast/temu: predlog/potvrdu sluga i eksplicitnu korekciju koja zadržava stari alias. Public taxonomy vraća samo aktuelni `canonicalPath` objavljenog termina; alias istorija i draft route podaci ostaju staff-only.

Javni API vraća samo objavljeni read-model oblasti/tema i vrednosti potrebne Kompasu. Ne vraća interne napomene, approval podatke, neobjavljene revizije ni termine drugog tenant-a.

OpenAPI klijent se regeneriše kada backend ugovor bude završen, pre povezivanja panela.

---

## 10. Panel „Kompas”

Jedna panel površina koristi generički editor registra sa pravilima po tipu, umesto posebnog ekrana za svaki mali registar.

Tabovi:

1. Oblasti;
2. Teme;
3. Publike;
4. Ciljevi sadržaja;
5. Povezivanja;
6. Pregled i odobrenja.

Panel jasno razlikuje:

- promenljiv javni tekst;
- zaključan stable ID;
- sistemsku vrednost koju je moguće samo izabrati;
- lifecycle;
- javnu vidljivost;
- aktivnost u Kompasu.

„Oblasti” koriste postojeću `topic_group` osu. D-052 `support_area` ne dobija svoj javni tab; u Povezivanjima se prikazuje samo kao „Intake oblast podrške”. K2 predlaže/potvrđuje slug pre prve objave i prikazuje preview buduće kanonske rute, ali ne implementira javni renderer niti uređuje `CompassGuide`.

Klik na check, select ili uređivanje pomoćnog polja ne sme neočekivano skrolovati formu. Nalaz validacije vodi na konkretno polje, a globalna serverska greška na vrh error bannera. Badge uz reviziju/radnju prikazuje ime i ulogu actor-a.

---

## 11. CMS integracija

Odmah nakon panela, CMS dobija DB-backed kontrolisana polja. Ne unose se slobodni stringovi.

Tehničko ime se ne prikazuje terapeutu. UI postavlja jasna pitanja:

- „Kojim oblastima pripada ovaj sadržaj?”
- „Kome je prvenstveno namenjen?”
- „Šta korisnik može da dobije iz njega?”
- „Da li je koristan nekome ko samo istražuje, traži stručnu podršku ili oboma?”
- „Ko može da mu pristupi?”

Ispod pitanja može stajati kratak primer i objašnjenje. Panel šalje stabilne ID-jeve; javne labele služe prikazu.

CMS metadata se prvo primenjuje na discoverable edukativni sadržaj. Postojeći pravni dokumenti, saglasnosti i `custom_document` nisu automatski Kompas sadržaj. PDF/radni list u Kompasu znači odobren `ResourceAsset`, ne pravni `.docx` import u editor.

---

## 12. Publication i reference pravila

Termin ne može biti objavljen ako:

- stable ID ili hijerarhija nisu validni;
- managed oblast/tema nema potvrđen unique kanonski route za svoj tenant i locale;
- roditelj nije aktivan;
- veza pokazuje na nepostojeći/arhivirani termin;
- nedostaju obavezna odobrenja;
- system vrednost pokušava da promeni semantiku;
- plaćeni access nema evaluator.

Sadržaj ne može u Kompas katalog ako:

- nema objavljenu grupu i najmanje jednu objavljenu temu;
- tema ne pripada izabranoj grupi;
- nema kontrolisan put, cilj i publiku;
- format nije podržan stvarnim domenom;
- access nije proverljiv backendom;
- metadata revision nije odobrena;
- referencira terapeuta radi preporuke.

Sadržaj može ostati objavljen na svojoj ruti, a ipak biti isključen iz Kompasa dok ne prođe Compass eligibility gate.

---

## 13. Javni Kompas

Javni Kompas dolazi tek kada backend registar, panel i CMS reference rade. On čita samo:

- objavljene i javno vidljive grupe/teme;
- objavljene i dostupne sadržaje;
- potvrđene veze;
- revision-bound metadata;
- backend-procenjen access rezultat.

Kompas v1 je determinističan i objašnjiv. Ne koristi AI kao preduslov, ne pravi psihološki profil i ne rangira terapeute. Prelaz ka Intake-u prenosi samo neutralan, verzionisan kontekst koji korisnik vidi i potvrđuje.

### Kanonske stranice i dinamički prikaz

- kanonska oblast objašnjava jednu oblast, lista njene objavljene teme i odobrene sadržaje;
- kanonska tema objašnjava jednu konkretnu temu i linkuje njenu oblast;
- dinamički `/kompas` prikazuje „Vaš trenutni izbor”, dozvoljava dodavanje/uklanjanje čipova i linkuje svaki izbor ka kanonskoj stranici;
- ne kreiraju se rute tipa `/kompas/tema/stres-burnout-odnosi`;
- route segment je posebno potvrđen javni slug, ne interni `stableId` niti vrednost koja se automatski menja sa javnom labelom; stari slug ostaje permanent redirect posle eksplicitne korekcije;
- izraz „profil” se ne koristi za gosta ili njegov trenutni izbor;
- `/kompas/putanja/[opaqueId]` ostaje kasniji privatni saved-path domen i zahteva zasebnu retention/access odluku.

### Stanje i privatnost v1

- trenutni izbor živi u React memoriji;
- nastavak i jednokratni Intake handoff koriste verzionisan `sessionStorage` zapis sa kratkim TTL-om;
- topic ID-jevi ne idu u query parametre, server/proxy logove niti identifikovan analytics payload;
- v1 ne upisuje Kompas izbor u bazu i ne pravi psihološki profil korisnika;
- eksplicitno deljenje izbora ostaje zasebna produkt odluka.

---

## 14. Posledice

Pozitivno:

- stručne izmene ne traže deployment;
- stabilni ID-jevi sprečavaju drift;
- panel, CMS i javni Kompas koriste isti autoritet;
- audit pokazuje ko je uneo, izmenio, odobrio i objavio podatak;
- Anjina konačna kategorizacija ne blokira početak backend foundation-a.

Cena:

- registar zahteva sopstveni revision/review lifecycle;
- migracija postojećih `areas` mora imati kontrolisan cutover;
- javni Kompas se namerno odlaže dok administrativni tok i CMS reference ne budu stvarni;
- article i dodatni formati i dalje imaju zasebne domenske kapije.

---

## 15. Odbačene alternative

### Frontend seed kao autoritet

Odbačeno: svaka stručna izmena bi tražila kod/deployment i brzo bi nastao drift.

### Slobodni tagovi u CMS-u

Odbačeno: sinonim postaje lažni semantički ključ i preporuke nisu pouzdane.

### Jedna „areas” lista za Kompas i Intake

Odbačeno: discovery tema i routing oblast imaju različitu odgovornost. Povezuju se odobrenim mostom.

### Javni Kompas pre panela

Odbačeno: poslovna logika bi završila u UI-ju, bez lifecycle-a, audit-a i zaštite referenci.

### AI kao autoritet kategorizacije

Odbačeno: AI kasnije može predložiti reviewable patch, ali schema, registar i ljudsko odobrenje ostaju autoritet.

---

## Amandman 2 — javni tok, anonimni access i operativna granica

- **Datum:** 2026-08-01
- **Status:** accepted
- **Odluka:** D-056
- **Menja:** javnu v1 granicu iz §13 i precizira K3B–K6 redosled; ostale odluke ovog ADR-a ostaju na snazi.

### A2.1 Odvajanje od Intake-a

Kompas je discovery i content-recommendation površina. Intake je jedini autoritet za hard constraints, uslugu, terapeuta i timski handoff. Kompas ne koristi `GuidanceFlow`, `IntakeStep`, `IntakeAnswers` ni Intake `QuestionsScreen`; postojeći ekran bezuslovno renderuje klinički `SafetyNotice`, koji ne pripada Kompasu. Dozvoljena je ponovna upotreba samo neutralnog drawer/surface obrasca.

Kompas → Intake prenosi verzionisan `CompassHandoffContextV1` bez free text-a, kontakta, dijagnoze, risk procene, therapist ID-ja ili recommendation skora. Intake prikazuje preneti izbor i traži potvrdu; ambiguous topic → support-area veza ne prefill-uje razlog.

### A2.2 Opcion inline tok

Pitanja su opciona inline interakcija na `/kompas`, ne obavezan wizard i ne posebna ruta. Nema jezika „korak X od Y”. Korisnik uvek može da preskoči sva pitanja, prikaže preporuke iz delimičnog izbora, vrati se na oblasti ili pređe ka stručnoj pomoći.

Ose su oblast, najviše dve teme, publika, cilj i put (`explore | professional_support | both`). Sve stručne opcije dolaze iz objavljenog DB registra. „Nisam siguran/na šta mi se događa” je sentinel akcija koja odmah otvara Polazni prikaz; nikada se ne čuva kao `topicId`. Multi-select tema je nova kontrola i ne prilagođava se postojećem single-select/auto-advance UI-ju.

### A2.3 Javne rute i CMS granica

Kanonski skup je:

- `/kompas` — kontrolisana interaktivna struktura, Polazni ili prilagođeni prikaz;
- `/kompas/oblasti` i `/kompas/teme` — liste objavljenog registra;
- `/kompas/oblast/[slug]` i `/kompas/tema/[slug]` — pojedinačne kanonske stranice.

Nema public `[id]`, kombinacionih SEO ruta ni taxonomy izbora u query parametrima. Runtime taxonomy aliasi ostaju DB autoritet za 308 i ne upisuju se u compile-time `redirectRegistry`. `Location` se pre Next `permanentRedirect()` validira kao interna kanonska Kompas putanja bez query/hash dela i bez self-loop-a.

Editabilni hero/uvod/SEO na `/kompas` može koristiti postojeći `static_page + static_information` entitet, ali CMS ne kontroliše interaktivnu strukturu. `kompas` je rezervisan custom-document slug na frontend i backend granici.

### A2.4 Anonimni access

Anonimni page aggregate i recommendation endpoint vraćaju samo objavljen sadržaj u istom `organization_id`/locale scope-u čiji je efektivni access eksplicitno `public`. `registered`, `staff_only`, budući `subscriber`/`purchased` i `NULL` ne izlaze. Backend vraća stvaran access podatak na kartici i ostaje jedina bezbednosna granica; UI skrivanje nije autorizacija.

Eligibility se primenjuje pre determinističkog rangiranja. Engine ne izlaže numerički score, therapist reference ni slobodan URL; vraća najviše tri stabilna plain-language razloga, verziju pravila i neutralni handoff kandidat.

### A2.5 Discoverability i feedback

Objavljeni i odobreni pojedinačni Kompas termini mogu biti `index`, uz `BreadcrumbList`; `CollectionPage` se ne uvodi bez izmene iscrpnog JSON-LD registra. Preduga javna labela/opis daje urednički warning/Content Health finding umesto tihog skraćivanja.

Kompas feedback je anonimni UX-only survey sa zasebnim `surveyId`-jem. Prikazuje se najviše jednom po browser sesiji posle smislenog angažovanja ili eksplicitnog završetka; ne pokušava da presretne zatvaranje browser taba i nikada ne utiče na recommendation request, scoring, profil ili Intake handoff.

### A2.6 Redosled i dizajn

Dokumentacija i API ugovori prethode produkcionom UI-ju. Kanonske stranice i aggregate prethode verziranom recommendation endpoint-u, a Engine prethodi dinamičkom prilagođenom prikazu. Finalni vizuelni F3 implementira se tek nad Milanovim Kompas design handoff-om; izostanak mockup-a ne blokira dokumentaciju, K3B aggregate/kanonske granice, K4 Engine niti preduslovni refaktor/admin „Brzi unos”.
