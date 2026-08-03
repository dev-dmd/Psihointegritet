# ADR-025 — Kompas flow definition, answer mapping, result composition i admin preview

**Status:** Accepted  
**Datum:** 2026-08-03  
**Odluka:** D-058  
**Povezano:** D-053 · D-054 · D-056 · D-057 · ADR-022 Amandman 3 · ADR-023 · ADR-024

## Kontekst i granice

Kompas taxonomy, kanonske rute, CMS discovery metadata i content eligibility već pripadaju `modules/content`. Statična React pitanja, međutim, ne omogućavaju atomsku verziju, review, preview i bezbednu objavu toka. Research ankete mere anonimni feedback i ne smeju postati recommendation flow šema.

`modules/compass` zato poseduje samo lifecycle flow-a, validaciju/evaluaciju njegove definicije, mapiranje odgovora u trenutni `CompassSelection` i Result Composer. Ne poseduje CMS, taxonomy, kanonske rute, Intake pitanja/matching niti korisničku istoriju.

## Perzistentni model

- `compass_flows`: org-scoped stabilni identitet (`stable_id`) i timestamps.
- `compass_flow_versions`: flow/organization, monoton `version`, locale, JSONB `definition`, `draft | in_review | approved | published | archived`, optimistic `lock_version` i actor/timestamp evidence. Najviše jedna published verzija po flow/locale granici.
- `compass_flow_review_decisions`: odluka za tačnu verziju i capability (`clinical`, `business`), actor i timestamp. Odluke se ne prenose na novu verziju.

Nema session/answer/result tabela. Selection je React/sessionStorage stanje sa kratkim TTL-om; rezultat je neperzistentni read-model.

## Flow ugovor

`definition` sadrži `schemaVersion`, `entryQuestionId`, `questions` i `resultSections`. Pitanje ima stabilni `questionId`, prompt/help, `selectionTarget` (`topic_group | topics | audience | content_goals | journey_intent | none`), `inputMode`, `optionSource`, opcione dozvoljene term reference, topic filter po izabranoj oblasti, default/skip prelaz i kontrolisane statičke opcije.

Sva javna pitanja su opciona (D-056), teme imaju najviše dva izbora, a sentinel „Nisam siguran/na šta mi se događa” završava u polaznom paketu i nije taxonomy termin. Nema težina, slobodnog rule DSL-a, JavaScript izraza ili petlji. Grananje je dozvoljeno samo kroz single-select ili kontrolisanu statičku opciju.

Publish validator dokazuje jedinstvene stabilne ID-jeve, dostižnost, acikličnost i terminal svakog puta; organization/locale granicu; postojanje, status i aktivnost taxonomy referenci; maksimalne izbore; i ispravna mapiranja result sekcija. Dinamičke opcije dolaze iz published DB registra, a flow čuva samo reference i svoj UI copy.

## Result Composer

Postojeći Content ranking ostaje autoritet za eligibility, redosled, razloge i public-only granicu. Composer aditivno vraća stabilne sekcije: `selection-summary`, `understanding`, `practical-tools`, zaključanu `professional-support`, `related-areas`, `related-topics` i `other-topics-in-area`. Konfiguracija mapira prve dve sadržajne sekcije na objavljene `content_goal` termine, limit i kontrolisano empty-state ponašanje.

V1 `related_area` read-model jednoznačno se izvodi kao skup objavljenih primarnih oblasti review-ovanih `related_topic` targeta izabranih tema. Time se ne uvodi druga relacija sa istim značenjem: izvor stručne tvrdnje ostaje eksplicitni `related_topic`, dok naslov „Srodne oblasti” dobija samo njegove deduplikovane parent oblasti. Jedan sadržaj ide samo u najprioritetniju odgovarajuću sekciju. Backend poseduje deduplikaciju i redosled; frontend samo renderuje sekcije.

## API i preview

- Public GET vraća samo published flow za organization/locale.
- Public POST normalizuje odgovore/selection i vraća sekcionisane preporuke bez čuvanja inputa.
- Staff CRUD/lifecycle API koristi optimistic lock, capability review i actor evidence.
- Staff preview adresira tačnu draft verziju i koristi isti evaluator, eligibility i Composer kao javni tok.

## Admin i objavljivanje

Admin površina se deli na Pregled, Registar, Tok pitanja, Sadržaj, Prikaz rezultata, Testiranje i Pregled/objavljivanje. Ne uvodi node canvas niti kopiju CMS/taxonomy editora. Stabilni ID/UUID su sekundarni „Tehnički detalji”. Stručna podrška je zaključana sistemska sekcija i ne tvrdi da je K5 kontekst prenet.

Objava zahteva uspešnu validaciju, Clinical i Business odluku kada konfiguracija utiče na stručnu prezentaciju, tačan actor evidence i jedinstvenu published verziju. Demo kartice nisu deo ranking-a, vidljive su samo iza development/preview flag-a i jasno označene.

## Acceptance gates

Gate-ovi su faze 0–7 iz `KOMPAS_TODO.md`: dokumentacija; Research korekcije; flow domen; Composer; javni tok; demo seed; admin IA; zatim puni frontend/backend/E2E/Alembic/CI skup. Migracija mora biti ručna i ne sme sadržati D19 `intake_cases.age_group` drift.

## Posledice

Dobijamo objašnjiv i administrativno podesiv tok bez privacy troška čuvanja odgovora. Cena je mali novi lifecycle modul i stroga koordinacija sa Content autoritetom. Stručni nazivi, početna taxonomy i mapiranje ciljeva ostaju odluke Anje i ovlašćenog tima; engine ne kodira kliničke zaključke niti rangira terapeute.
