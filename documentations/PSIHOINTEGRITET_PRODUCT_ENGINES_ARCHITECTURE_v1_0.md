> ## ℹ️ STATUS — vizija engine-a, vodič a ne propis
>
> **Autoritet #6** u redosledu iz `CLAUDE_CODE_MASTER_PLAN_v1_0.md` §0.
> Master plan i `technical-documentation-architecture-v0.3.md` **pobeđuju** gde god se sudaraju s ovim dokumentom.
>
> **Zašto je u repou:** master plan se na njega poziva **normativno** iz M2.3 (§7.3 — status enum termina)
> i M2.7 (§18 — dijagnostički kolektori), te iz §7.6, §7.7, §8.4, §10.2 i §24.
> Bez njega ti milestone-ovi nisu potpuno specificirani.
>
> **Kako se čita:** engine-i su **granice modula unutar FastAPI monolita** — nikada preuranjeni mikroservisi
> (master plan §0). Ne skaloviti ništa iz R3–R7 (master plan §3).

---

---
title: "Psihointegritet — Product Engines arhitektura"
subtitle: "Prilagođavanje platformskih engine-a za savetovališta i digitalne centre za mentalno zdravlje"
author: "Milan Dražić — Product & Engineering"
date: "15. jul 2026."
lang: sr-Latn
---

# Sadržaj

- **Osnova platforme:** status dokumenta, izvršne odluke, prilagođavanje beauty arhitekture, ciljna platforma i Platform Gateway.
- **Identitet, privatnost i pružanje usluge:** Identity & Organization, Consent & Privacy, Booking i Notification Engine.
- **Sadržaj i rast:** Content, Marketing i AI Content Studio, ThemeLayout, Benefits & Referral, Programs & Workshops i Resource & Access Grant.
- **Operacije i poslovanje:** Communication & Session Operations, Payment & Entitlement i Analytics Engine.
- **Integritet i inteligencija:** Diagnostic Engine, AI Core i AI Skills, Professional Governance, Media i Feature/Plan/Subscription.
- **Isporuka proizvoda:** Event Bus, Superadmin centar, implementacioni redosled, quality gate, repozitorijumska dokumentacija i otvorene odluke.

# Status i svrha dokumenta

**Verzija:** 1.0  
**Status:** preporučeni arhitektonski i proizvodni baseline  
**Prvi potrošač:** Psihointegritet  
**Budući potrošači:** savetovališta, psihoterapijski centri, solo terapeuti i edukativni centri  
**Arhitektonski stil:** Next.js frontend + FastAPI modularni monolit + PostgreSQL

Ovaj dokument rekreira Marysoll Product Engines pristup za Psihointegritet. Beauty engine-i se koriste kao dokazani obrazac za granice domena, adaptere, dijagnostiku, Event Bus i sazrevanje modula, ali se poslovna pravila ne kopiraju automatski. Psihoterapijsko savetovanje zahteva stroža pravila privatnosti, neutralnije poruke, profesionalno odobravanje sadržaja, kontrolisan AI i odsustvo manipulativne gamifikacije.

Dokument je tehnička i proizvodna specifikacija. Ne predstavlja pravno, poresko ili stručno-kliničko mišljenje. Finalna pravila obrade podataka, rada sa maloletnicima, profesionalnih kvalifikacija, marketinga i naplate potvrđuju imenovani stručni i pravni owner-i.

# 1. Izvršne odluke

1. **Engine je prvo granica odgovornosti, ne mikroservis.** Psihointegritet ostaje jedan FastAPI modularni monolit dok stvarna potreba za skaliranjem, izolacijom ili nezavisnim deployment-om ne opravda izdvajanje.
2. **Platforma orkestrira; engine poseduje poslovna pravila.** Frontend, paneli i Platform Gateway pozivaju stabilne klijente/adaptore, a ne interne tabele ili provider SDK-ove.
3. **Svaki engine ima jasan domen, kontrakt, događaje, testove i dijagnostiku.** Promena jednog modula ne sme nepredvidivo menjati drugi.
4. **Backend je autoritativan za tenant, role i feature gate.** Sakrivanje dugmeta u UI-u nije zaštita.
5. **Event-driven, ali bez generičkog bus-a prerano.** Prvi događaji nastaju kroz PostgreSQL outbox i verzionisani Event Registry; potrošači su idempotentni.
6. **Diagnostic Engine je osnovni superadmin ekran.** Svaki rizičan workflow koji menja više modela dobija read-only integrity proveru u istom pull request-u.
7. **AI radi samo na izričit klik korisnika.** Nema automatskog prepisivanja, objavljivanja, generisanja kampanje ili menjanja layout-a.
8. **AI predlog nikada ne prepisuje original.** Rezultat ide u preview/draft granu, prikazuje razlike i zahteva izbor: prihvati deo, prihvati sve, ručno izmeni ili odbaci.
9. **Platforma ne skladišti anamneze, terapijske beleške, dijagnoze, snimke ili transkripte seansi.** Događaji, logovi, analytics i AI kontekst ne sadrže privatne opise razloga dolaska.
10. **„Loyalty” se menja u Benefits & Referral režim.** Nema streak-ova za terapiju, poena za dolaske, pritiska da se kontinuitet ne prekine niti nagrađivanja deljenja osetljivog statusa.
11. **Booking je request-first.** Klijent bira termin, ali ga terapeut potvrđuje ili predlaže alternativu.
12. **Notify Me ne rezerviše automatski.** Korisnik dobija neutralnu, vremenski ograničenu priliku da preuzme novi ili oslobođeni slot.
13. **Marketing saglasnost je odvojena od servisnih obaveštenja.** Korišćenje savetovanja ne upisuje osobu automatski u newsletter.
14. **Google Calendar nije source of truth.** Interni Booking Engine poseduje raspoloživost i status termina; Google služi kao free/busy signal i mirror potvrđenog događaja.
15. **Statistika je operativna i edukativna, ne dijagnostička.** Mogu se meriti termini, dolasci, programi i engagement; ne izračunava se „mentalno stanje” korisnika.

# 2. Šta se prenosi iz beauty arhitekture, a šta se menja

| Beauty obrazac | Psihointegritet odluka | Razlog promene |
|---|---|---|
| Tenant/salon | Organization/centar ili solo praksa | Terapeut je član organizacije, nije automatski tenant |
| Klijent salona | Klijent/korisnik savetovanja | Ne koristi se medicinska terminologija bez potvrđenog statusa |
| Automatsko zakazivanje | Zahtev koji terapeut potvrđuje | Raspoloživost i profesionalna procena formata ostaju pod kontrolom terapeuta |
| Employee calendar | Therapist availability + exceptions + external busy blocks | Potrebne su vremenske zone, online/uživo format i zaštita privatnih Google događaja |
| Loyalty points/streak | Benefits, promo kodovi, poklon-vaučeri i ograničeni referral | Izbegava se pritisak, zavisnost i gamifikacija terapije |
| Referral posle prve usluge | Nagrada tek posle dozvoljene eligible akcije, prvenstveno programa/radionice | Referrer ne sme saznati koju je privatnu uslugu druga osoba koristila |
| Birthday/personalized offer | Isključivo opt-in, neutralna komunikacija i neosetljiv segment | Korišćenje mental-health usluge ne sme biti marketinški signal bez posebne odluke |
| Marketing segment po usluzi | Zabranjen po default-u za individualno savetovanje | Segment može otkriti osetljivo interesovanje ili korišćenje usluge |
| AI „win-back” klijenta | Ne koristi se za terapijske klijente | Sistem ne sme pritiskati osobu da nastavi savetovanje radi retencije |
| Check-in QR | Attendance beleži terapeut/admin ili potvrđeni session event | Javni QR check-in može otkriti korišćenje savetovanja i nije potreban |
| Voucher za sledeću posetu | Vaučer za radionicu, program, edukativni paket ili opšti kredit | Bezbedniji benefit, bez uslovljavanja terapijskog kontinuiteta |
| Revenue analytics po klijentu | Agregirana poslovna analitika; minimalan individualni pregled | Superadmin i marketing nemaju rutinski pristup privatnoj istoriji |
| Theme Engine za salon landing | ThemeLayout Engine za članke, resurse, programe i tenant brending | Layout mora čuvati stručni sadržaj, citate, accessibility i review status |
| Device/browser diagnostics | Prenosi se skoro direktno | Tehnička podrška i dalje zahteva network, storage, permissions i crash podatke |
| Identity & Loyalty Health | Identity, Booking, Consent, Benefits i Access Integrity | Dijagnostičke reference se menjaju prema novom domenu |

# 3. Ciljna platforma

## 3.1 Platforma kao orkestrator

Psihointegritet frontend ne implementira pravila booking-a, marketing saglasnosti, promo kodova, tenant pristupa ili prava na resurs. On prikazuje stanje i šalje komande kroz generisani OpenAPI klijent. FastAPI application layer orkestrira use-case, a odgovarajući engine odlučuje da li je akcija dozvoljena.

Preporučeni deployment ostaje:

- `frontend/` — Next.js na Vercel-u;
- `backend/` — FastAPI modularni monolit na Railway-u;
- PostgreSQL — source of truth za domenske podatke, audit, outbox i delivery evidenciju;
- Redis/QStash — cache, rate limits i durable jobs;
- private object storage — PDF, audio i drugi zaštićeni resursi;
- provider adapteri — Clerk, Resend, Google Calendar, video i buduća plaćanja.

## 3.2 Porodice engine-a

| Porodica | Engine-i |
|---|---|
| Core platform | Identity & Organization, Consent & Privacy, Feature/Subscription, Event Registry |
| Service delivery | Booking, Notification, Communication, Session Operations, Payment/Entitlement |
| Knowledge and growth | Content, Marketing, ThemeLayout, Resource, Programs/Workshops, Benefits & Referral |
| Intelligence and integrity | Analytics, Diagnostic, AI Core, AI Skills, Professional Governance |
| Infrastructure-facing | Media, Provider Registry, Platform Gateway adapters |

## 3.3 Putanja sazrevanja engine-a

1. **Modul/paket u monolitu.** Čisti domen, ugovori, evaluatori i testovi.
2. **Interni API boundary.** Aplikacija komunicira kroz adapter/klijent i stabilan application service.
3. **Odvojen proces ili servis.** Samo kada postoje jasni zahtevi za nezavisno skaliranje, sigurnosnu izolaciju ili deployment.
4. **Poseban data ownership.** Ne uvodi se dok transakcije i reporting još zahtevaju jednu bazu.
5. **Edge/CDN distribucija.** Samo za statičke theme, layout i media manifest-e.

Kriterijumi za izdvajanje servisa su merljivi: različit scaling profil, poseban SLA, regulatorna izolacija, nezavisni tim/release cadence ili provider workload koji ugrožava glavni API. „Engine zvuči važno” nije kriterijum.

# 4. Platform Gateway i adapteri

## 4.1 Odgovornost Gateway-a

Next.js `proxy.ts` ostaje tanak Platform Gateway:

- prepoznaje base, staff/admin, superadmin, tenant subdomen, custom domain i preview host;
- rešava tenant preko `tenant-client` adaptera;
- rano preusmerava neprijavljene korisnike na auth tok;
- radi canonical redirect/rewrite;
- dodaje correlation/trace podatak bez tokena i privatnih detalja;
- nikada ne donosi konačnu domensku authorization odluku.

## 4.2 Bezbednosne invarijante

- Security boundary je `organization_id`, nikada slug ili domen samostalno.
- Nerazrešen tenant završava na not-found/blocked toku.
- Backend ponovo proverava identitet, članstvo, capability, resource ownership i status.
- Direktan pristup internim tenant rutama je blokiran.
- Preview je path-based i koristi isključivo preview/staging resurse.
- Debug trace prikazuje routing odluke, nikada tokene, email adrese, termine ili sadržaj poruka.

## 4.3 Platform klijenti

Preporučeni adapteri:

- `identity-client`;
- `tenant-client`;
- `booking-client`;
- `notification-client`;
- `theme-layout-client`;
- `marketing-client`;
- `diagnostic-client`;
- `feature-client`;
- `resource-client`.

Klijent skriva da li engine trenutno živi kao lokalni modul, application service ili udaljeni servis.

# 5. Identity & Organization Engine

## 5.1 Domen

- users i external auth subject;
- organizations/tenant-i;
- memberships;
- therapist profiles;
- client profiles;
- roles, capabilities i policy context;
- owner/admin delegiranje;
- account merge i canonical identity;
- auditovana suspenzija i offboarding.

## 5.2 Uloge

| Uloga | Osnovne mogućnosti |
|---|---|
| Visitor | javni sadržaj, vođeni izbor i početak zahteva |
| Client | sopstveni termini, programi, resursi, poruke i preference |
| Therapist | sopstvena dostupnost, dodeljeni termini, profil i odobrene profesionalne akcije |
| Content editor | priprema sadržaj bez implicitnog prava objave |
| Organization admin | tim, katalog, termini, sadržaj i poslovne operacije tenant-a |
| Organization owner | billing, plan, vlasničke postavke i admin delegiranje |
| Platform superadmin | tenant status, planovi, feature gate-ovi, usage i diagnostics |

## 5.3 Pravila

- Clerk ili drugi auth provider poseduje identitet/session, ne domenske uloge.
- Role i tenant pravo žive u PostgreSQL-u.
- Svaki organization-owned red sadrži `organization_id`.
- Spajanje naloga je rizičan workflow: dry-run, canonical izbor, idempotentno prevezivanje, audit i integrity check.
- Platform superadmin nema podrazumevan pristup privatnim porukama ili sadržaju seanse.
- Support access je vremenski ograničen, zahteva razlog i ostavlja audit trag.

## 5.4 Dijagnostika

- duplicate identity candidates;
- merged account i dalje kao aktivni owner;
- cross-tenant ili orphan reference;
- membership bez usera/organization-a;
- therapist profile bez aktivnog membership-a;
- client profile duplikat po normalizovanom email-u/telefonu;
- privileged role bez MFA signala;
- support access bez razloga, isteka ili audit događaja.

# 6. Consent & Privacy Engine

Ovaj engine je nova obavezna granica u odnosu na beauty proizvod.

## 6.1 Domen

- privacy notice version;
- terms/cancellation policy acceptance;
- service notification preference;
- marketing consent i kanal;
- optional research/feedback consent;
- resource/program-specific consent;
- data export/deletion request;
- retention class i legal hold signal;
- minor/guardian policy placeholder, ne aktivan adolescent self-service.

## 6.2 Pravila

- Service email nije marketing email.
- Odbijanje newsletter-a ne sme sprečiti potvrdu termina ili obavezno servisno obaveštenje.
- Saglasnost ima verziju, timestamp, source i dokaz prikazanog teksta.
- Nema pre-checked marketing checkbox-a.
- Marketing segment ne nastaje iz korišćenja individualnog savetovanja po default-u.
- Expired ili povučen consent momentalno zatvara buduće marketinško slanje.
- Retention je konfigurisan po klasi podataka i periodično se proverava.

## 6.3 Događaji

- `consent.marketing_granted.v1`;
- `consent.marketing_withdrawn.v1`;
- `privacy.request_submitted.v1`;
- `privacy.retention_due.v1`.

# 7. Booking Engine

## 7.1 Domen

- service i service format;
- therapist-service assignment;
- duration, buffer i public price;
- locations i online format;
- recurring availability i exceptions;
- external busy blocks;
- slot computation;
- short technical `SlotHold`;
- appointment request/confirmation;
- alternative proposal;
- cancellation/reschedule policy;
- participants za bračno savjetovanje;
- attendance/completed/no-show;
- Notify Me subscriptions;
- Google Calendar connection i reconciliation.

## 7.2 Request-first booking tok

1. Posetilac bira uslugu ili vođeni izbor.
2. Sistem rešava efektivni `BookingMode` za `Service + Therapist + Format + Location`; svaki override može samo da suzi tok.
3. Kod `slot_request` korisnik bira ponuđeni slot; kod `request` šalje željeni period bez slot pickera.
4. Samo `slot_request` može dobiti kratki tehnički `SlotHold`; sistem zatim traži samo potrebne kontakt podatke.
5. Nastaje `AppointmentRequest`, nikada potvrđen termin.
6. Terapeut počinje review, potvrđuje, odbija ili predlaže alternativu.
7. Alternativa zahteva atomsko prihvatanje klijenta.
8. Tek successful confirmation transakcijski pravi `Appointment(status = confirmed)` koji dobija podsetnike i meeting/calendar vezu.

## 7.3 Canonicalni objekti i statusi

R1.6 `PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.1.md` je merodavan ugovor za Booking. Ovaj dokument ostaje vision/engine vodič, ne paralelni status ugovor.

| Objekat | Statusi / semantika |
|---|---|
| `SlotHold` | Kratko tehničko držanje za `slot_request`; nije rezervacija niti Appointment. |
| `AppointmentRequest` | `submitted`, `under_review`, `alternative_proposed`, `awaiting_client`, `converted`, `declined`, `withdrawn`, `expired`; `type = initial | reschedule`. |
| `Appointment` | `confirmed`, `completed`, `no_show`, `cancelled`. Actor, razlog i naslednik pri pomeranju su audit/event podaci. |

Postojeći potvrđeni Appointment ostaje važeći dok se `reschedule` zahtev ne konvertuje. Konkretni TTL, review SLA, slot after submit, Notify Me i cancellation policy i dalje čekaju BDS approval.

## 7.4 Sprečavanje preklapanja

- slot se računa iz recurring pravila, exceptions, potvrđenih termina, odobrenih buffera i external busy blokova;
- request conversion u Appointment radi u jednoj transakciji;
- potvrđen termin ima DB-level zaštitu od preklapanja za terapeuta/resurs; hold i `pending_request` ponašanje prate BDS-007;
- idempotency key sprečava dupli submit;
- concurrency test pokušava dva istovremena zahteva za isti slot;
- expired hold se oslobađa durable job-om i reconciliation proverom.

## 7.5 Google Calendar adaptacija

Interna platforma je source of truth za radno vreme, service duration i appointment status. Google Calendar doprinosi:

- free/busy blokovima bez preuzimanja naziva privatnih događaja;
- upisom potvrđenog termina;
- izmenom/otkazivanjem mirror događaja;
- watch webhook-om i periodičnim reconciliation-om;
- minimalnim OAuth scope-om prema izabranoj funkciji.

Kvar Google konekcije ne blokira internu administraciju. UI mora prikazati `connected`, `sync_delayed`, `reauth_required` ili `disabled` stanje.

## 7.6 Bračno savjetovanje

- Termin može imati dva klijentska učesnika, ali jednog booking owner-a.
- Drugi učesnik dobija sopstvenu pozivnicu i saglasnost kada je potreban nalog.
- Jedan učesnik ne dobija automatski pristup drugim privatnim podacima ili porukama.
- Otkazivanje, promena i payment pravila moraju definisati ko može pokrenuti akciju.
- Event payload ne sadrži opis odnosa ili razlog dolaska.

## 7.7 Notify Me — specifičan terapeut

Notify Me rešava situaciju kada korisnik želi baš određenog terapeuta, ali nema odgovarajućeg termina.

### Podaci pretplate

- `organization_id`;
- `therapist_id`;
- optional `service_id` samo kada je za računanje trajanja neophodan;
- online/uživo preference;
- dozvoljeni dani i vremenski prozor;
- korisnik/timezone;
- channel preference;
- consent timestamp;
- `expires_at`, preporučeno 60–90 dana;
- status `active`, `paused`, `fulfilled`, `expired`, `unsubscribed`.

### Tok

1. Korisnik klikne „Obavesti me kada se pojavi termin”.
2. Bira širok vremenski prozor; ne unosi razlog dolaska.
3. Booking emituje `SLOT_RELEASED` ili `AVAILABILITY_EXPANDED`.
4. Matching job pronalazi aktivne subscription-e.
5. Notification Engine šalje neutralnu poruku: novi termin je dostupan u Psihointegritetu.
6. Link daje kratki claim window ili vodi na ažuriranu dostupnost.
7. Korisnik sam bira i šalje zahtev; nema automatskog zakazivanja.
8. Posle isteka ili uspešnog zahteva subscription se zatvara ili pita korisnika da li želi da ostane aktivan.

### Fairness pravila

- default je first-come, first-served sa kratkim hold-om;
- ne otkriva se broj ljudi koji čekaju;
- postojeći klijenti mogu imati posebnu poslovnu politiku samo ako je javno i stručno odobrena;
- jedan korisnik ne može držati više slotova istog terapeuta;
- rate limit sprečava spam i bot claim;
- poruka i subject ne pominju temu, dijagnozu ili privatni razlog.

## 7.8 Booking dijagnostika

- overlapping active appointments;
- expired hold koji još blokira slot;
- confirmed termin bez appointment event-a;
- alternative proposal bez expiry-ja;
- participant reference na pogrešan tenant;
- calendar mirror bez appointment-a ili appointment bez mirror-a kada je sync obavezan;
- timezone/offset mismatch;
- notify subscription bez consent-a, isteka ili validnog terapeuta;
- slot notification poslata posle zauzimanja;
- duplicate claim/idempotency mismatch.

# 8. Notification Engine

## 8.1 Domen

- notification intent;
- template i verzija;
- channel policy;
- recipient routing;
- locale i timezone;
- schedule/delay;
- provider adapter;
- delivery attempt;
- retry i dead-letter stanje;
- preference/consent gate;
- neutral privacy mode;
- provider usage i cost signal.

## 8.2 Kanali

- email — obavezan MVP kanal;
- in-app — panel i unread stanje;
- web push — opciono nakon stabilnog email toka;
- SMS — kasnije, za kritične servisne podsetnike i uz troškovni gate;
- webhook — interni/provider događaji;
- Slack/Teams — samo operativna upozorenja bez ličnih podataka.

## 8.3 Vrste poruka

| Kategorija | Primeri | Marketing consent |
|---|---|---|
| Service required | prijem zahteva, potvrda, alternativa, promena, otkazivanje | nije marketing; mora imati drugi pravni osnov |
| Service reminder | podsetnik za potvrđen termin ili program | nije marketing, ali poštuje channel preference gde je moguće |
| Access/security | verifikacija email-a, reset, nova privilegovana prijava | obavezna sigurnosna poruka |
| Notify Me | novi ili oslobođen slot | posebna aktivna pretplata korisnika |
| Program operations | sesija, promena lokacije, novi materijal | vezano za enrollment |
| Marketing | newsletter, nova radionica, javni sadržaj, ponuda | zahteva marketing consent |

## 8.4 Privacy-safe templating

- Email subject je neutralan: „Ažuriranje vašeg zahteva” umesto naziva privatne usluge.
- Lock-screen push ne prikazuje terapeuta, temu ili format bez eksplicitne preference.
- Template dobija minimalne varijable; nema slobodnog teksta iz booking forme.
- Provider log ne sadrži access token, appointment reason ili privatnu poruku.
- Preview prikazuje tačan kanal, subject i sve promenljive pre objave template-a.

## 8.5 Delivery arhitektura

1. Engine dobija `NotificationIntent`, ne gotov provider poziv.
2. Policy proverava category, consent/preference, locale, quiet hours i channel fallback.
3. PostgreSQL beleži notification job kao source of truth.
4. QStash izvršava delayed/retry delivery.
5. Provider rezultat ulazi u `notification_deliveries`.
6. Reconciliation hvata stuck, missing i duplicate delivery.

## 8.6 Dijagnostika

- job bez delivery pokušaja;
- `sent` bez provider ID-ja;
- permanent failure koji se i dalje retry-uje;
- marketing poruka bez aktivnog consent-a;
- service notification pogrešno klasifikovana kao marketing;
- template koristi zabranjenu varijablu;
- notify-me poruka poslata posle isteka subscription-a;
- provider usage iznad plana ili budžeta.

# 9. Content Engine

## 9.1 Domen

- article, guide, interview, FAQ i static page;
- author i professional reviewer;
- topic/category/tag;
- structured rich content;
- SEO metadata;
- content status;
- version, diff i rollback;
- scheduled publish;
- related content veze;
- localization;
- legal/professional review flag.

## 9.2 Status workflow

`draft → in_review → approved → scheduled/published → archived`

Objavljen sadržaj se ne menja direktno. Izmena pravi novu draft verziju, prolazi review i zamenjuje published verziju tek nakon odobrenja. Developer ili AI može pripremiti sadržaj, ali ne može izmisliti kvalifikaciju, cenu, stručnu tvrdnju ili zakonsko obećanje.

## 9.3 Content ownership

- autor poseduje nacrt i odgovara na komentare;
- stručni reviewer odobrava profesionalne tvrdnje;
- organization admin odobrava brend, CTA, cenu i objavu;
- legal reviewer odobrava privacy, uslove i druge označene tekstove;
- AI je alat za predlog, nikad owner ili approver.

# 10. Marketing Engine i AI Content Studio

Marketing Engine obuhvata kampanje, newsletter, landing CTA, promo kodove, content distribution i AI alate za pripremu sadržaja. Content Engine ostaje source of truth za članak; Marketing Engine koristi odobrenu verziju za distribuciju.

## 10.1 Osnovni domen

- audience contact;
- marketing consent;
- safe segment;
- campaign;
- email template;
- schedule i cadence;
- content distribution plan;
- coupon/promo code;
- UTM/attribution;
- delivery i engagement metrike;
- suppression/unsubscribe;
- AI content job i suggestion set.

## 10.2 Zabranjeni default segmenti

Bez posebne stručne i pravne odluke nije dozvoljeno segmentiranje po:

- korišćenju individualne psihoterapije ili bračnog savjetovanja;
- razlogu dolaska, temi vođenog izbora ili sadržaju poruke;
- dodeljenom terapeutu;
- no-show ili prekidu savetovanja radi „win-back” kampanje;
- procenjenom emocionalnom stanju;
- adolescent statusu.

Dozvoljeni početni segmenti su neutralni: jezik, timezone, javno izabrane teme newsletter-a, prisustvo javnoj radionici uz odgovarajući consent, interesovanje za budući javni program i opšte preference kanala.

## 10.3 AI princip: sve se pokreće na dugme

AI Content Studio nema background auto-run i nema auto-apply. Svaka funkcija ima odvojeno dugme, procenu troška i jasan rezultat:

1. **Proveri pravopis i gramatiku**
2. **Analiziraj sadržaj i copy**
3. **Izračunaj SEO skor**
4. **Istraži temu i interese na internetu**
5. **Predloži poboljšanu verziju**
6. **Predloži layout** — delegira ThemeLayout Engine-u

Korisnik bira tačno koju akciju želi. Nema implicitnog lanca „analiziraj → prepiši → objavi”.

## 10.4 Pravopis i gramatika sa preciznim highlight-om

### Kontrakt predloga

Svaka sugestija sadrži:

- `suggestion_id`;
- snapshot/version izvornog teksta;
- stabilan anchor: block ID + start/end offset ili token range;
- originalni fragment;
- predloženi fragment;
- kategoriju: spelling, grammar, punctuation, capitalization, style ili consistency;
- kratko objašnjenje;
- confidence;
- status `pending`, `accepted`, `rejected`, `manually_resolved`.

### UI ponašanje

- Highlight obuhvata samo pronađeni deo rečenice, ne ceo pasus.
- Hover/click otvara original, predlog i objašnjenje.
- Akcije: „Prihvati”, „Odbaci”, „Izmeni ručno”, „Prihvati sve iz ove kategorije”.
- „Ispravi automatski” znači primeni odabrane sugestije u novu draft verziju; nikad u published tekst.
- Ako je korisnik u međuvremenu promenio tekst, offset se ponovo validira. Konflikt se prikazuje, ne primenjuje naslepo.
- Sistem čuva undo/redo i version history.
- Za srpski sadržaj proverava se dogovorena jezička varijanta i ne meša ekavicu/jekavicu bez eksplicitnog pravila sadržaja.

## 10.5 Analiza sadržaja i copy-ja

Na klik „Analiziraj sadržaj”, AI vraća strukturisan izveštaj:

- ciljna publika koju tekst trenutno adresira;
- jasnoća naslova i uvoda;
- logički tok i struktura;
- čitljivost i dužina pasusa;
- ton: topao, stručan, neutralan, prodajan ili neusklađen;
- CTA jasnoća i pozicija;
- ponavljanje i prazne formulacije;
- tvrdnje koje zahtevaju stručni izvor/review;
- potencijalno stigmatizujući, dijagnostički ili previše siguran jezik;
- predlog šta nedostaje, bez automatskog menjanja teksta.

Rezultati su savetodavni. Svaka tvrdnja o stručnom radu ostaje u profesionalnom review workflow-u.

## 10.6 SEO skor

SEO skor je objašnjiv skup podskorova, ne obećanje rangiranja:

- search intent i podudaranje teme;
- title i meta description;
- H1/H2 struktura;
- uvod i odgovor na korisničko pitanje;
- semantička pokrivenost teme;
- čitljivost;
- internal links;
- relevantni FAQ;
- author/reviewer trust signali;
- image alt i media metadata;
- canonical/indexability;
- structured data eligibility;
- ažurnost i last-reviewed datum.

Svaki podskor prikazuje zašto je umanjen i konkretnu ručnu akciju. Keyword stuffing se označava kao problem.

## 10.7 Analiza teme i internet interesovanja

Akcija koristi samo javne i agregirane spoljne izvore. Ne koristi klijentske termine, poruke, vođeni izbor ili privatne resurse.

Rezultat može sadržati:

- srodna pitanja koja ljudi javno pretražuju;
- sezonski ili rastući interes;
- regionalne/jezičke varijante upita;
- content gap ideje;
- predlog naslova i podtema;
- javne izvore i datum analize;
- upozorenje kada je signal slab ili neproveren.

Trend signal nikada ne postaje stručna činjenica. Izvor i datum snapshot-a čuvaju se uz AI job.

## 10.8 Poboljšana verzija u preview sekciji

AI kreira `ContentVariant`, ne menja original. Preview prikazuje:

- original i poboljšanu verziju side-by-side;
- inline diff;
- promene po pasusu/sekciji;
- obrazloženje većih strukturnih promena;
- upozorenja za novu tvrdnju ili izostavljen smisao;
- komande „Koristi ovaj deo”, „Zameni sekciju”, „Koristi celu verziju”, „Kopiraj”, „Odbaci”.

Primena bilo kog dela pravi novu draft reviziju. Za stručni sadržaj status se vraća na `in_review` čak i kada je prethodna verzija bila approved.

## 10.9 AI audit i privatnost

- beleže se user, tenant, action, provider, model, prompt-template version, input content version, trošak i rezultat status;
- raw draft se ne upisuje u application log;
- sadržaj klijentskih poruka, termina ili privatnih beležaka nije dozvoljen AI input;
- provider retention i data-use podešavanja ulaze u Provider Registry;
- AI output ima expiry/retention politiku;
- korisnik može prijaviti loš predlog;
- admin može isključiti pojedinačni skill ili provider.

## 10.10 Kampanje

Campaign workflow:

`draft → audience preview → content review → test send → scheduled → sending → completed/paused`

Pre slanja se prikazuje:

- broj eligible kontakata;
- zašto je kontakt u segmentu;
- suppressed/unsubscribed broj;
- predmet i preview tekst;
- schedule, timezone i cadence;
- procenjeni provider trošak;
- linkovi i CTA;
- test email.

## 10.11 Marketing dijagnostika

- contact u kampanji bez validnog consent-a;
- unsubscribe koji nije u suppression listi;
- segment koristi zabranjeno osetljivo polje;
- scheduled kampanja bez approved content version;
- AI variant primenjen na published tekst bez nove revizije;
- accepted suggestion više ne odgovara source version-u;
- campaign delivery event bez message ID-ja;
- duplicate send za isti campaign/contact;
- coupon van tenant-a ili van validnog perioda.

# 11. ThemeLayout Engine

## 11.1 Svrha

ThemeLayout Engine omogućava da blog, vodič, intervju, program ili landing stranica ne izgleda uvek isto, ali bez generisanja proizvoljnog koda. Engine radi nad odobrenim blokovima, tokenima i layout pravilima.

## 11.2 Odgovornosti

- brand/theme tokeni;
- typography, spacing, colors i contrast rules;
- section/block registry;
- layout preset-i po content type-u;
- content-to-block mapping;
- responsive pravila;
- accessibility constraints;
- preview, versioning i rollback;
- tenant override u bezbednim granicama;
- AI layout suggestion contract.

## 11.3 Raspoloživi blog blokovi

- article hero;
- author/reviewer strip;
- lead paragraph;
- key takeaways;
- standard rich text;
- quote/callout;
- steps/process;
- checklist;
- FAQ;
- image/media with caption;
- downloadable resource card;
- therapist/author card;
- related article grid;
- related service/program CTA;
- references/source list;
- disclaimer/important note.

## 11.4 Content-aware layout suggestion

Na klik „Predloži layout”:

1. Content Engine šalje strukturisani dokument, tip sadržaja i dozvoljene blokove.
2. AI Skill vraća `LayoutPlan`, ne JSX/HTML.
3. Plan mapira postojeće block ID-jeve u odobrene section type-ove.
4. Validator proverava obavezne blokove, kontrast, heading order, CTA limits i unsupported konfiguraciju.
5. Preview renderuje novu varijantu bez menjanja published stranice.
6. Editor može prihvatiti sekciju, promeniti preset ili odbaciti ceo predlog.
7. Publish zahteva content i layout approval.

## 11.5 Pravila

- AI ne izmišlja sadržaj da bi popunio layout.
- Layout ne sme sakriti autora, reviewer-a, datum pregleda ili disclaimer.
- Samo jedan H1.
- Heading hijerarhija se ne bira samo vizuelno.
- CTA broj i tip su ograničeni po content type-u.
- Na mobilnom se čuva redosled značenja, ne samo desktop kompozicija.
- Tenant ne unosi proizvoljan JavaScript/CSS.
- Neobjavljen block ili feature gate ne može biti renderovan kroz stari theme JSON.

## 11.6 Verzije

- `draft`;
- `preview`;
- `published`;
- `archived`.

Published verzija je immutable. Rollback vraća prethodni manifest i ostavlja audit događaj.

## 11.7 Dijagnostika

- layout referencira nepostojeći block;
- block nije dozvoljen za content type/plan;
- published layout koristi draft asset;
- missing H1 ili pogrešna heading hijerarhija;
- contrast/accessibility validator fail;
- tenant override probija dozvoljeni token set;
- source content version i layout plan nisu usklađeni;
- archived preset je i dalje aktivan.

# 12. Benefits & Referral Engine

## 12.1 Zašto se ne prenosi klasičan Loyalty

Beauty Loyalty Engine povećava učestalost povratka kroz points, streaks, tiers i personalizovane ponude. U savetovanju isti mehanizmi mogu stvarati pritisak, otkrivati osetljiv status ili pretvoriti profesionalni odnos u gamifikovan retention loop. Zato Psihointegritet koristi ograničen Benefits & Referral Engine.

## 12.2 Dozvoljeni rani slučajevi

- promo kod za javnu radionicu;
- vaučer za edukativni program ili PDF paket;
- poklon-kredit koji primalac sam koristi za eligible ponudu;
- popust za paket unapred definisanih edukativnih sesija, nakon poslovne i pravne potvrde;
- pozivnica prijatelju na javni događaj ili sadržaj;
- benefit za redovne učesnike programa, bez vezivanja za emocionalno stanje.

## 12.3 Zabranjeno po default-u

- streak za terapijske dolaske;
- poeni za otkrivanje razloga dolaska, popunjavanje mental-health upitnika ili deljenje privatnog iskustva;
- „niste bili X dana” kampanja za individualno savetovanje;
- automatski VIP status na osnovu broja terapijskih seansi;
- javni referral badge;
- obaveštavanje referrer-a koju je uslugu pozvana osoba koristila;
- benefit koji otežava ili obeshrabruje prekid savetovanja;
- uslovljavanje pristupa osnovnoj podršci marketing pristankom.

## 12.4 Referral model

Referral pozivnica je neutralna i može voditi na:

- Psihointegritet početnu stranicu;
- javnu radionicu;
- program;
- poklon-vaučer;
- opšti kredit bez naziva privatne usluge u URL-u ili poruci.

### Privatnost

- kod je random/pseudoniman, ne sadrži ime ili email referrer-a;
- primalac ne mora saznati da referrer koristi savetovanje;
- referrer vidi samo neutralan status `invited` ili `eligible_completed`, ne izabranu uslugu;
- reward se izdaje samo na dozvoljen eligible event;
- referral događaj ne sadrži service/topic detalje;
- invitee može koristiti ponudu bez marketing consent-a, osim za buduće promotivne poruke.

## 12.5 Modeli

- `BenefitProgram`;
- `BenefitRule`;
- `PromoCode`;
- `Voucher`;
- `ReferralInvite`;
- `BenefitGrant`;
- `BenefitRedemption`;
- `BenefitLedger` kada je potreban finansijski trag;
- `EligibilityPolicy`.

## 12.6 Cross-engine odgovornost

- Marketing poseduje coupon kampanju i komunikaciju.
- Benefits poseduje eligibility, grant, redemption i anti-abuse.
- Booking/Program proverava benefit kroz stabilan API.
- Payment računa finansijski efekat.
- Notification šalje neutralnu poruku.
- Analytics meri agregirani rezultat bez osetljivog segmenta.

## 12.7 Anti-abuse

- reward tek posle definisane eligible completion akcije;
- self-referral i duplicate identity provera;
- jedan grant po pravilu/periodu;
- tenant, currency i expiry validacija;
- reservation i redemption su idempotentni;
- refund/cancellation može opozvati benefit prema pravilima;
- manual override zahteva razlog i audit.

## 12.8 Dijagnostika

- voucher owner/referral reference ne postoji ili je drugi tenant;
- grant i ledger mismatch;
- redemption bez eligible event-a;
- referrer dobio osetljiv service detalj;
- promo code aktivan van perioda/plan-a;
- refunded purchase i dalje daje benefit;
- duplicate reward za isti event;
- pozivnica bez expiry-ja ili neutralnog template-a.

# 13. Programs & Workshops Engine

## 13.1 Domen

- workshop/program;
- cohort;
- facilitator;
- session schedule;
- capacity i waitlist;
- enrollment;
- attendance;
- module/resource sequence;
- access grant;
- cancellation/refund policy;
- completion kroz edukativne module;
- B2B sponsor/organization context;
- anonymous question intake gde je odobreno.

## 13.2 Roditeljski programi

Roditeljstvo ostaje podrška koja može imati više formata:

- individualna konsultacija kroz Booking;
- javni članak/resurs kroz Content/Resource;
- radionica kroz Workshop;
- višenedeljni program kroz Program Engine;
- mogućnost prethodnog anonimnog pitanja sa jasnom retention politikom.

## 13.3 B2B granica

Kompanija može dobiti agregirani izveštaj o realizaciji, attendance-u i anonimnom feedback-u samo kada je tako ugovoreno. Ne dobija individualnu istoriju savetovanja, izbor terapeuta, teme ili privatne resurse zaposlenih.

# 14. Resource & Access Grant Engine

## 14.1 Domen

- public/private resource;
- PDF/audio/video/workbook metadata;
- content version;
- object storage key;
- signed access;
- grant source;
- expiry/revocation;
- download/stream policy;
- therapist-assigned resource;
- program/purchase entitlement.

## 14.2 Pravila

- Browser nikada ne dobija trajni storage URL za privatan resurs.
- Access se proverava na backend-u pri svakom izdavanju signed URL-a.
- Grant može doći iz uloge, programa, kupovine, vaučera ili ručne dodele.
- Opoziv i refund odmah utiču na budući pristup.
- PDF radni list može biti čitan/preuzet bez čuvanja odgovora.
- Standardizovani testovi i automatsko tumačenje nisu deo engine-a bez licence i posebnog modula.

# 15. Communication & Session Operations Engine

## 15.1 Administrativne poruke

Thread je vezan za appointment ili program i služi za:

- potvrdu vremena;
- predlog promene;
- tehničku informaciju;
- meeting link;
- logistiku i dodeljeni resurs.

Nije neograničen kanal za terapijski razgovor. UI prikazuje svrhu, očekivano vreme odgovora i informaciju da kanal nije namenjen hitnim situacijama.

## 15.2 Online seansa

- provider-neutral meeting adapter;
- link se kreira tek za confirmed termin;
- pristup samo učesnicima i terapeutu;
- link se prikazuje vremenski ograničeno;
- nema snimanja, transkripta ili AI analize;
- fallback procedura se čuva kao organizacijska postavka;
- provider status ulazi u dijagnostiku.

# 16. Payment & Entitlement Engine

## 16.1 Domen

- payment order;
- provider intent/event;
- manual payment;
- payment status;
- refund;
- reconciliation;
- invoice/receipt reference, bez računovodstvenog zaključka;
- entitlement/access grant izdavanje;
- tenant subscription billing kasnije.

## 16.2 Pravila

- Platforma ne čuva kartične podatke.
- Webhook ima signature verification i idempotency.
- Payment event ne otključava UI direktno; application use-case izdaje entitlement.
- Manual payment ostaje fallback.
- Ko prima uplatu i izdaje račun je poslovno-pravna odluka pre live integracije.
- Split payout ne ulazi pre marketplace faze.

# 17. Analytics Engine

## 17.1 Dozvoljene metrike

- booking funnel;
- request-to-confirmation vreme;
- popunjenost i raspoloživost;
- cancellation/no-show;
- prihod i payment status;
- program enrollment/attendance/completion;
- content views, search i engagement;
- campaign delivery i neutralna konverzija;
- provider usage/cost;
- platform performance/errors;
- benefit redemption na agregiranom nivou.

## 17.2 Nedozvoljeni zaključci

- automatsko mentalno stanje;
- dijagnoza ili risk score;
- poređenje terapeuta po „uspehu lečenja” bez profesionalno odobrenog modela;
- marketing profil izveden iz privatne usluge;
- B2B izveštaj koji identifikuje pojedinca;
- superadmin drill-down u privatnu poruku radi obične analitike.

## 17.3 Event catalog

Svaki analytics event ima owner-a, schema verziju, dozvoljena polja i PII klasifikaciju. Slobodan tekst, email, telefon, access token, appointment reason i message body su zabranjeni.

# 18. Diagnostic Engine

Diagnostic Engine ima dve porodice iza iste platform granice.

## 18.1 Browser/runtime diagnostics

- device/OS/browser/viewport;
- network i API reachability;
- storage, cookies i IndexedDB;
- push/service worker support;
- permissions snapshot;
- crash beacon i unhandled error;
- performance collector kada je odobren;
- prolazni report sa ograničenim payload-om i retention-om.

Pravila iz beauty verzije ostaju:

- dijagnostika nikada ne sme srušiti host stranicu;
- svaki collector radi izolovano i može vratiti `failed`;
- javni report endpoint ima hard size cap i whitelist;
- report je moguć i kada login ne radi;
- report ne sadrži token, privatnu poruku ili detalj termina.

## 18.2 Server-side integrity diagnostics

Svaka provera vraća:

- `key` i `version`;
- `status`: `ok`, `info`, `warning`, `error`, `failed`;
- safe evidence identifikatore;
- broj nalaza;
- tekst preporuke;
- trajanje i collector metadata.

`failed` znači „provera nije izvršena” i nikada se ne prikazuje kao nula problema.

## 18.3 Registry provera

| Grupa | Primeri provera |
|---|---|
| Identity | duplicate, merged references, orphan membership, cross-tenant profile |
| Booking | overlap, expired hold, invalid participant, status/event mismatch, calendar drift |
| Notify Me | missing consent/expiry, duplicate subscription, stale notification |
| Notification | stuck job, permanent failure, duplicate delivery, unsafe template variable |
| Consent | marketing send bez consent-a, withdrawal bez suppression-a, outdated notice version |
| Content | published bez reviewer-a, archived author, missing last-reviewed, invalid claim flag |
| AI Content | source-version conflict, auto-apply bez approval-a, provider/model bez registry-ja |
| ThemeLayout | missing block, invalid preset, draft asset u published manifest-u, accessibility fail |
| Benefits | invalid owner, duplicate grant, ledger mismatch, sensitive referral leakage |
| Programs | capacity mismatch, enrollment bez access grant-a, orphan session/facilitator |
| Resource | grant bez usera, wrong tenant, expired grant aktivan, missing storage object |
| Payment | order/event mismatch, duplicate webhook, paid bez entitlement-a, refund bez revoke-a |
| Feature/Plan | funkcija aktivna van plana, expired trial aktivan, usage iznad hard limita |

## 18.4 Repair pravilo

Diagnostic je read-only. Repair akcije su zaseban application workflow:

1. korisnik vidi nalaz i preporuku;
2. pokreće dry-run;
3. dobija tačan scope promene;
4. potvrđuje razlog;
5. backend ponovo proverava capability i precondition;
6. transakcija izvršava promenu;
7. audit beleži pre/posle identifikatore;
8. collector se ponovo pokreće;
9. rollback/manuelni plan je dokumentovan.

Nema automatskog repair-a samo zato što je diagnostic našao problem.

# 19. AI Core i AI Skills

## 19.1 AI Core

AI Core je provider-neutral infrastruktura:

- completion/streaming;
- model/provider registry;
- prompt template versioning;
- structured output validation;
- usage/cost metering;
- moderation/safety adapters;
- evaluation hooks;
- timeout/retry/fallback;
- audit metadata;
- feature/plan enforcement.

AI Core ne zna šta je SEO članak ili booking. To znaju AI Skills.

## 19.2 AI Skills

- Grammar & Style Reviewer;
- Content/Copy Analyst;
- SEO Reviewer;
- Topic Research Assistant;
- Content Rewrite Preview;
- Layout Composer;
- Campaign Draft Assistant;
- FAQ/Metadata Assistant;
- kasnije Knowledge Navigator nad odobrenim sadržajem.

## 19.3 Obavezna pravila

- svaki skill ima eksplicitno dugme;
- structured output prolazi schema validation;
- AI ne objavljuje;
- AI ne koristi privatne klijentske podatke;
- provider/model/prompt version se beleži;
- rezultat je suggestion, ne istina;
- stručne tvrdnje idu u professional review;
- korisnik može odbaciti ili ručno izmeniti svaki predlog;
- svi skill-ovi imaju feature gate i cost limit;
- provider failure ne gubi originalni tekst.

# 20. Professional Governance Engine

Ovo je novi mental-health-specifičan modul koji beauty platformi nije bio potreban u istom obimu.

## 20.1 Domen

- professional title i credential record;
- verification/review status;
- biography approval;
- service terminology policy;
- content reviewer assignment;
- professional claim flags;
- adolescent feature prerequisites;
- crisis/emergency public notice approval;
- allowed/disallowed AI content categories;
- review expiry i renewal reminder.

## 20.2 Pravila

- Developer i AI ne potvrđuju kvalifikaciju.
- Stara biografija ne postaje published seed data.
- Javni naziv usluge „bračno savjetovanje” ostaje zaključan poslovni termin dok owner ne promeni odluku.
- „Psihološko savetovanje” se ne objavljuje ako nije profesionalno i pravno odobreno; koristi se potvrđeni naziv „psihoterapijsko savetovanje”.
- Sadržaj sa stručnom tvrdnjom mora imati imenovanog reviewer-a i datum pregleda.
- Adolescent self-service feature gate ostaje off dok svi prerequisites nisu potvrđeni.

# 21. Media Engine

## 21.1 Domen

- public image/video asset;
- private audio/PDF/video object;
- variants, compression i responsive format;
- alt/caption/credit;
- owner/tenant;
- review status;
- storage/CDN adapter;
- signed access;
- usage reference i orphan cleanup.

## 21.2 Pravila

- Stock portret se ne objavljuje pod imenom terapeuta.
- Privatni materijali ne idu na javni CDN URL.
- Content/Theme referencira media asset ID, ne provider URL.
- Brisanje asset-a proverava aktivne reference.
- AI generisana ilustracija mora biti označena prema content policy-ju.

# 22. Feature, Plan & Subscription Engine

## 22.1 Domen

- plan catalog;
- feature registry;
- trial;
- tenant subscription;
- entitlement;
- usage meter;
- soft/hard limit;
- override sa razlogom;
- showcase/upgrade metadata;
- billing lifecycle;
- grace/read-only state.

## 22.2 Gate pravilo

Frontend pita `canUse(featureKey)`, ali backend ponovo proverava:

- tenant subscription status;
- feature u planu;
- trial/override;
- usage limit;
- actor capability;
- resource scope.

Novi feature nije završen dok nema:

1. registry key;
2. plan mapping;
3. backend gate;
4. frontend UX/showcase;
5. analytics event;
6. diagnostic check gde je rizičan;
7. dokumentaciju i testove.

## 22.3 Primer ključeva

- `booking.google_calendar`;
- `booking.notify_me`;
- `content.ai_grammar`;
- `content.ai_seo`;
- `content.ai_rewrite`;
- `theme.ai_layout`;
- `marketing.campaigns`;
- `benefits.referrals`;
- `resources.private`;
- `programs.structured`;
- `analytics.advanced`;
- `tenant.custom_domain`.

# 23. Event Bus i ugovori između engine-a

## 23.1 Pravilo

Ne postoji direktna veza `Booking → Marketing` ili `Booking → Benefits`. Booking emituje činjenicu, a zainteresovani engine-i reaguju preko outbox događaja.

## 23.2 Event envelope

Svaki događaj sadrži:

- `event_id`;
- `event_type` i verziju;
- `occurred_at` UTC;
- `organization_id`;
- `aggregate_type` i `aggregate_id`;
- actor reference kada je dozvoljeno;
- correlation/causation ID;
- minimalni payload bez slobodnog privatnog teksta;
- schema version.

## 23.3 Početni event catalog

Booking semantika i imena su iz R1.6 ugovora; stvarni outbox može dodati schema verziju bez menjanja značenja:

- `SLOT_HOLD_CREATED`, `SLOT_HOLD_EXPIRED`, `SLOT_RELEASED`;
- `APPOINTMENT_REQUEST_SUBMITTED`, `APPOINTMENT_REQUEST_REVIEW_STARTED`, `APPOINTMENT_ALTERNATIVE_PROPOSED`;
- `APPOINTMENT_REQUEST_CONVERTED`, `APPOINTMENT_REQUEST_DECLINED`, `APPOINTMENT_REQUEST_WITHDRAWN`, `APPOINTMENT_REQUEST_EXPIRED`;
- `APPOINTMENT_CONFIRMED`, `APPOINTMENT_RESCHEDULE_REQUESTED`, `APPOINTMENT_RESCHEDULED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_COMPLETED`, `APPOINTMENT_NO_SHOW`;
- `WAITLIST_OFFER_CREATED`, `WAITLIST_OFFER_CLAIMED`, `WAITLIST_OFFER_EXPIRED`, `BOOKING_REVIEW_SLA_BREACHED`, `AVAILABILITY_EXPANDED`;
- `notification.intent_created.v1`;
- `notification.delivered.v1`;
- `notification.failed.v1`;
- `content.submitted_for_review.v1`;
- `content.approved.v1`;
- `content.published.v1`;
- `content.ai_suggestion_created.v1`;
- `marketing.campaign_scheduled.v1`;
- `marketing.campaign_completed.v1`;
- `program.enrollment_confirmed.v1`;
- `program.completed.v1`;
- `payment.confirmed.v1`;
- `payment.refunded.v1`;
- `benefit.granted.v1`;
- `benefit.redeemed.v1`;
- `consent.marketing_withdrawn.v1`;
- `feature.subscription_changed.v1`.

## 23.4 Delivery pravila

- domain change i outbox insert su ista DB transakcija;
- publisher može ponoviti event;
- consumer mora biti idempotentan;
- consumer failure ne vraća originalnu domensku transakciju;
- retry je bounded sa dead-letter vidljivošću;
- event schema je kompatibilna ili dobija novu verziju;
- sensitive field ne ulazi samo zato što bi consumer-u bilo zgodno.

# 24. Superadmin operativni centar

## 24.1 Početni ekran

1. Critical platform health;
2. Diagnostic findings;
3. provider incidents i failed jobs;
4. tenant-i sa risk/error signalom;
5. subscription/trial problem;
6. usage/cost anomalija;
7. recent privileged audit events.

## 24.2 Sekcije

- Diagnostics;
- Tenants/organizations;
- Plans & feature registry;
- Subscription/trials;
- Provider usage/cost;
- Notification/jobs;
- Payment reconciliation;
- Content/AI usage governance;
- Audit/security events;
- Support access.

## 24.3 Granice

- metadata-first pregled;
- nema globalnog search-a kroz privatne poruke;
- support pristup je time-bound i auditovan;
- repair akcija nije isto što i diagnostic;
- tenant owner vidi organizacijski nalaz, platform superadmin vidi cross-tenant health bez nepotrebnog sadržaja.

# 25. Implementacioni redosled

## Milestone E0 — Engine governance

- canonical engine catalog;
- ownership matrix;
- module/public API granice;
- Feature Registry skeleton;
- Event Registry + outbox contract;
- Diagnostic Registry contract;
- Provider Registry;
- data classification i zabranjena event/log polja.

**Izlaz:** novi feature više ne ulazi kao nepovezana logika.

## Milestone E1 — Identity, Consent i Diagnostic baseline

- internal identity/organization;
- role/capability/tenant policy;
- consent versions i marketing separation;
- browser diagnostic adapter;
- identity/tenant/consent integrity collectors;
- superadmin Diagnostics shell.

**Izlaz:** bezbedna osnova za sve panele i engine-e.

## Milestone E2 — Booking + Notification

- availability, exceptions, holds i request-first appointments;
- bračno savjetovanje participants;
- Google Calendar adapter;
- Notify Me;
- notification intent, templates, jobs, retries i neutral privacy mode;
- booking/notification/calendar diagnostics.

**Izlaz:** operativni MVP termina.

## Milestone E3 — Content + Marketing AI + ThemeLayout

- Content workflow i versioning;
- AI Core provider/prompt/usage baseline;
- grammar diff/highlight;
- content/copy analysis;
- SEO score;
- topic research;
- rewrite preview;
- block registry, layout plan i preview;
- campaign/consent integration;
- AI/content/layout diagnostics.

**Izlaz:** stručni tim samostalno kreira, proverava, poboljšava i objavljuje sadržaj uz potpunu kontrolu.

## Milestone E4 — Resources + Programs + Benefits

- private resource storage/access grants;
- workshop/program/enrollment/capacity;
- roditeljski i B2B program support;
- promo code/voucher/referral u sensitive-safe režimu;
- entitlement i cross-engine diagnostics.

**Izlaz:** edukativni i program business sloj.

## Milestone E5 — Payment + Analytics + Feature/Subscription

- manual/online payment abstraction;
- payment/entitlement reconciliation;
- analytics event catalog i dashboard-i;
- plans, trials, feature gates i usage metering;
- provider cost monitoring;
- superadmin operativni centar.

**Izlaz:** kontrolisano poslovanje i priprema za SaaS.

## Milestone E6 — SaaS/multi-tenant hardening

- tenant onboarding;
- custom domain i Platform Gateway tenant flow;
- Tenant ThemeLayout;
- subscription billing lifecycle;
- cross-tenant E2E i integrity suite;
- pilot sa jednim eksternim tenant-om.

**Izlaz:** Psihointegritet engine-i postaju proizvod za druge centre.

# 26. Quality gate

## Frontend

- TypeScript strict;
- ESLint i format check;
- unit/component testovi;
- production build;
- Playwright kritični tokovi;
- axe accessibility;
- tenant/feature UI matrix.

## Backend

- Ruff format/check;
- Pyright strict;
- domain/use-case testovi;
- PostgreSQL integration testovi;
- Alembic upgrade/check;
- authorization i cross-tenant testovi;
- idempotency/concurrency testovi;
- outbox/consumer retry testovi;
- provider webhook signature testovi.

## Kritični E2E tokovi

- visitor → therapist/service → slot → request → therapist confirm;
- visitor → no slot → Notify Me → neutral notification → claim/request;
- therapist → availability → Google busy block → confirmed mirror event;
- editor → grammar suggestions → accept selected → new draft → review → publish;
- editor → topic research → rewrite preview → use section → review;
- editor → layout suggestion → validated preview → publish/rollback;
- admin → campaign → audience consent preview → test → schedule → unsubscribe suppression;
- admin → workshop → capacity → payment → enrollment → resource access;
- user → referral invite → eligible action → benefit without service disclosure;
- superadmin → diagnostic → dry-run repair → approved action → rerun collector.

# 27. Dokumenti koje treba dodati u repozitorijum

- `PRODUCT_ENGINES.md` — ovaj dokument kao canonical katalog;
- `ENGINE_OWNERSHIP_MATRIX.md`;
- `EVENT_CATALOG.md`;
- `DIAGNOSTIC_REGISTRY.md`;
- `FEATURE_CATALOG.md`;
- `ROLE_CAPABILITY_MATRIX.md`;
- `DATA_CLASSIFICATION_RETENTION.md`;
- `CONSENT_POLICY.md`;
- `BOOKING_POLICY.md`;
- `NOTIFICATION_POLICY.md`;
- `CONTENT_GOVERNANCE.md`;
- `AI_CONTENT_STUDIO_SPEC.md`;
- `THEME_LAYOUT_CONTRACT.md`;
- `BENEFITS_REFERRAL_POLICY.md`;
- `PROVIDER_REGISTRY.md`;
- `ANALYTICS_EVENT_CATALOG.md`;
- `RUNBOOKS/` za auth, booking, calendar, notification, payment, storage i AI provider.

# 28. Otvorene odluke

1. Da li Notify Me obaveštava sve eligible korisnike istovremeno ili u kratkim talasima?
2. Da li postojeći klijenti imaju prioritet za novootvorene termine i kako se to javno objašnjava?
3. Koliki je default expiry Notify Me pretplate i claim linka?
4. Koji Google Calendar scope i koji kalendar svaki terapeut povezuje?
5. Ko odobrava AI content skill i maksimalni mesečni budžet po tenant-u?
6. Koji javni trend/SEO izvori su dozvoljeni i kako se čuvaju citati/snapshot-i?
7. Ko može prihvatiti AI grammar/style suggestion, a ko stručnu content promenu?
8. Koji blog block preset-i ulaze u prvi ThemeLayout registry?
9. Da li su promo kodovi dozvoljeni za individualno savetovanje ili samo za programe, radionice i resurse?
10. Koji eligible event može završiti referral bez otkrivanja privatne usluge?
11. Ko prima uplatu i izdaje račun za termine, programe i tenant pretplate?
12. Koji provider se koristi za meeting link i da li centar poseduje naloge?
13. Koliki su retention periodi po klasi podataka?
14. Ko je professional reviewer za svaku kategoriju sadržaja?
15. Kada je obavezna dodatna pravna/data-protection procena pre aktivacije novog modula?

# 29. Zaključak

Beauty Product Engines arhitektura je dobar temelj zato što razdvaja odgovornosti, uvodi stabilne adaptere, Event Bus i Diagnostic pravilo. Za Psihointegritet je potrebno promeniti incentive, privacy i professional-governance slojeve, ne tehničku filozofiju.

Najvažniji rezultat prilagođavanja je sledeći:

- Booking ostaje snažan, ali request-first i privacy-safe;
- Notify Me rešava tražnju za određenim terapeutom bez automatskog zakazivanja;
- Notification centralizuje kanale i neutralne poruke;
- Marketing dobija moćan AI Content Studio, ali sve radi isključivo na dugme, kroz diff i preview;
- ThemeLayout generiše kompoziciju iz odobrenih blokova, ne proizvoljan kod;
- Loyalty postaje Benefits & Referral bez gamifikacije terapije;
- Diagnostic postaje operativni nervni sistem cele platforme;
- svaki feature ima plan gate, event, test i integrity proveru;
- SaaS se gradi tek kada prvi Psihointegritet tenant potvrdi realne tokove.

# 30. Referentni izvori

- European Commission — Sensitive data: <https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/legal-grounds-processing-data/sensitive-data_en>
- European Commission — Retention: <https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/how-long-can-data-be-kept-and-it-necessary-update-it_en>
- European Commission — DPIA guidance: <https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/when-data-protection-impact-assessment-dpia-required_en>
- Regulation (EU) 2024/1689 — AI Act: <https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng>
- Google Calendar API — sharing/free-busy: <https://developers.google.com/workspace/calendar/api/concepts/sharing>
- Google Calendar API — OAuth scopes: <https://developers.google.com/workspace/calendar/api/auth>
- Google Calendar API — Events watch: <https://developers.google.com/workspace/calendar/api/v3/reference/events/watch>
- OWASP Application Security Verification Standard: <https://owasp.org/www-project-application-security-verification-standard/>

---

**Status:** v1.0 — spremno za product/engineering review.  
**Sledeći korak:** zaključati otvorene odluke za Booking + Notify Me, AI Content Studio i Benefits & Referral, pa ih pretvoriti u zasebne milestone specifikacije.
