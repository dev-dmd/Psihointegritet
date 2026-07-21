# Psihointegritet Intake & Matching Engine v0.1

Radi u postojećem Psihointegritet repozitorijumu. Prvo analiziraj stvarnu arhitekturu, postojeći dizajn sistem, javne rute, staff panel, autentifikaciju, feature flag sistem, Booking Engine granice, Notification Engine granice i postojeće modele terapeuta. Ne pretpostavljaj putanje fajlova ako se razlikuju od dokumentacije.

Nakon analize implementiraj **staging-first funkcionalni prototip** klijentskog i timskog toka pod feature flag-om. Cilj prve iteracije je da Anja, Marija i Marijan mogu da vide, koriste i koriguju proizvodni flow pre povezivanja sa stvarnim osetljivim podacima i produkcionim workflow-om.

Nemoj se zaustaviti na planu ili statičkom mockup-u. Implementiraj interaktivni flow end-to-end na staging-u, ali koristi isključivo demo podatke i mock adaptere dok stručni tim ne potvrdi pitanja, pravila i preference.

## 1. Naziv i granica funkcionalnosti

Naziv u proizvodu:

> Intake & Matching Engine — Vođeni izbor i usmeravanje

Ovo nije dijagnostički sistem niti klinička trijaža.

Engine sme da:

- postavi kratka pitanja o uzrastu, vrsti podrške, formatu i preferencijama;
- primeni unapred potvrđena pravila terapeuta;
- filtrira neodgovarajuće opcije;
- rangira odgovarajuće terapeute;
- objasni zašto je neko predložen;
- prikaže alternative;
- prosledi korisnika u Booking Engine;
- napravi nedodeljen zahtev kada nema dovoljno pouzdanog podudaranja;
- omogući timu da preuzme ili preusmeri zahtev.

Engine ne sme da:

- postavlja dijagnozu;
- prikazuje ili računa mental-health risk score;
- koristi kategorije low/medium/high risk;
- predviđa buduće ponašanje korisnika;
- odlučuje ko sme ili ne sme dobiti stručnu pomoć;
- automatski potvrđuje složenije situacije bez pravila stručnog tima;
- šalje slobodan osetljiv tekst celom timu;
- koristi intake odgovore za marketing;
- automatski objavljuje, menja ili dopunjava korisnikove odgovore pomoću AI-a.

Koristi terminologiju **klijent**, **korisnik**, **novi zahtev**, **intake** i **nedodeljen zahtev**. Nemoj koristiti „pacijent” dok stručni i pravni owner-i ne potvrde termin.

## 2. Arhitektonski princip

Engine je prvo jasna domenska granica u postojećem FastAPI modularnom monolitu, a ne novi mikroservis.

Preporučena podela odgovornosti:

- frontend prikazuje pitanja, rezultate, preference i timski red;
- Intake & Matching Engine poseduje taxonomy, hard constraints, scoring, objašnjenja i assignment pravila;
- Booking Engine poseduje slobodne termine, zahtev za termin i potvrdu terapeuta;
- Notification Engine šalje in-app/email obaveštenja;
- AI Skill opciono parsira slobodan tekst u dozvoljene tagove;
- Consent & Privacy Engine beleži saglasnosti i pravila vidljivosti;
- Diagnostic Engine proverava nevalidne preference, nedodeljene zahteve i assignment integritet.

Frontend ne sme samostalno odlučivati rezultat. Za staging prototip koristi isti TypeScript interface koji će kasnije implementirati backend adapter, ali iza njega može stajati `MockMatchingAdapter`.

Predloži i dokumentuj interfejs, na primer:

```ts
interface MatchingAdapter {
  getQuestionnaire(): Promise<MatchingQuestionnaire>;
  evaluate(input: AnonymousMatchingInput): Promise<MatchingResult>;
  listTeamPreferences(): Promise<TherapistMatchingProfile[]>;
  updateTeamPreference(input: UpdatePreferenceInput): Promise<TherapistMatchingProfile>;
  listDemoIntakes(): Promise<IntakeCase[]>;
  claimIntake(intakeId: string, therapistId: string): Promise<IntakeAssignment>;
  reassignIntake(intakeId: string, therapistId: string, reason: string): Promise<IntakeAssignment>;
}
```

Za prvu iteraciju nijedna akcija ne sme upisivati demo odgovore u produkcionu bazu.

## 3. Feature flag i staging bezbednost

Dodaj feature flag, npr.:

```text
intake_matching_preview
```

Pravila:

- uključen samo na staging/preview okruženju;
- isključen na production-u po default-u;
- demo intake podaci jasno označeni kao demo;
- nema stvarnih email poruka, push obaveštenja ili booking rezervacija;
- notification i booking akcije koriste mock adapter i UI simulaciju;
- nema logovanja odgovora u browser console, analytics ili error poruke;
- nema povezivanja demo unosa sa stvarnim korisničkim nalozima.

Ako postojeće okruženje već ima Feature/Plan Engine, koristi njega umesto posebnog ad-hoc env uslova.

## 4. Ulazne tačke na javnom sajtu

Poveži isti Guided Matching flow sa tri mesta:

### Header — `Zakaži termin`

Klik otvara izbor:

1. **Pomozite mi da pronađem terapeuta** — pokreće Guided Matching.
2. **Znam kog terapeuta želim** — vodi na samostalni izbor terapeuta i njegove termine.

Postojeći klijenti ne treba ponovo da prolaze kroz pitanja ako već znaju terapeuta.

### Hero — `Pomozi mi da pronađem podršku`

Direktno pokreće Guided Matching.

### Sekcija `Vođeni izbor`

Koristi sledeći sadržaj:

```text
Vođeni izbor

Pomozite mi da suzim izbor

Kroz pet kratkih pitanja suzićemo izbor terapeuta i formata rada prema vašim potrebama i preferencijama. Rezultat dobijate odmah, bez obaveze i bez ostavljanja kontakt podataka.

Započni vođeni izbor

5 pitanja · oko 1 minut · bez kreiranja naloga
```

Nemoj koristiti tvrdnju da sistem garantuje terapeuta koji „upravo odgovara” korisniku. Prikazuj objašnjiv predlog i izbor ostavi korisniku.

## 5. Klijentski flow

Implementiraj responsive drawer ili postojeći odgovarajući modal/sheet obrazac iz dizajn sistema. Na mobilnom koristi prilagođen bottom/full-height sheet bez horizontalnog overflow-a.

### Pre pitanja

Prikaži nenametljivu sigurnosnu napomenu:

```text
Vođeni izbor ne postavlja dijagnozu i nije hitna služba. Ako vam je potrebna pomoć koja ne može da čeka redovan termin, nemojte čekati standardni online zahtev.
```

Ne implementiraj automatsku procenu hitnosti u ovoj verziji. Stručni tim kasnije potvrđuje zaseban human-review protokol i lokalizovane informacije za neposrednu podršku.

### Pitanje 1 — Za koga tražite podršku?

Opcije:

- Za mene — odrasla osoba
- Za adolescenta
- Za par ili partnerski odnos
- Podrška roditelju
- Rad sa kompanijama

`Rad sa kompanijama` odmah izlazi iz terapeutskog matching toka i otvara poseban B2B tok sa ciljem programa, formatom i poslovnim kontaktom.

### Pitanje 2 — Uzrasna grupa

Opcije:

- 13–15
- 16–17
- 18–25
- 26–45
- 46+

Za maloletnike ne hardkoduj pravna pravila koja stručni tim nije potvrdio. Engine mora imati konfigurabilan `minorPolicy`, a demo rezultat treba jasno označiti kao predmet stručne potvrde.

### Pitanje 3 — Glavna oblast podrške

Početna taxonomy lista:

- stres i anksioznost;
- emocije i samopouzdanje;
- odnosi i životne promene;
- bračno savjetovanje / partnerska podrška;
- podrška roditeljima;
- izazovi adolescencije;
- oporavak nakon nasilja ili kriznog iskustva;
- lični rast i razvoj;
- nisam siguran/na.

Korisnik u v0.1 bira jednu primarnu oblast. Taxonomy mora biti konfigurabilan i verzionisan, ne hardkodovan po UI komponentama.

### Pitanje 4 — Format rada

- Online
- Uživo — Niš
- Uživo — Leskovac
- Svejedno

### Pitanje 5 — Prioritet izbora

- Najbolje stručno uklapanje
- Najraniji dostupan termin
- Želim da vidim više predloga
- Želim da tim potvrdi izbor
- Želim konkretnog terapeuta

Ako korisnik izabere konkretnog terapeuta, prikaži dozvoljene terapeute i nastavi prema Booking Engine-u. Ako terapeut nije dostupan, kasnije će Booking Engine ponuditi `Notify Me`, alternativu ili zahtev za drugi termin.

## 6. Rezultat bez email barijere

Nakon pet pitanja odmah prikaži:

- jednog preporučenog terapeuta;
- 2–3 kratka razloga predloga;
- format rada;
- jednu ili dve odgovarajuće alternative;
- dugme `Izaberi i pogledaj termine`;
- dugme `Neka tim potvrdi izbor`;
- opciju `Počni ponovo`.

Ne prikazuj procenat podudaranja klijentu.

Primer razloga:

- radi sa ovom uzrasnom grupom;
- oblast rada odgovara izabranoj potrebi;
- dostupan je željeni format;
- postoji odgovarajući termin;
- pruža izabranu vrstu podrške.

Ispod rezultata prikaži opcioni unos:

```text
Želite li nešto da dodate svojim rečima?
Napišite samo ono što želite da podelite pre zakazivanja.
```

Kontakt podatke traži tek kada korisnik izabere terapeuta/termin ili odluči da pošalje nedodeljen zahtev timu.

## 7. AI parsiranje opcionog teksta

U v0.1 napravi mock AI preview iza posebnog dugmeta:

```text
Predloži teme iz mog teksta
```

AI se ne pokreće automatski dok korisnik kuca.

Rezultat AI-a mora biti ograničen na odobrenu taxonomy listu:

```json
{
  "suggestedTags": ["stress", "relationships"],
  "neutralSummary": "Korisnik traži podršku u vezi sa stresom i odnosima.",
  "confidenceByTag": {
    "stress": 0.88,
    "relationships": 0.73
  }
}
```

UI prikazuje tagove i zahteva da ih korisnik potvrdi ili ukloni.

AI ne sme da:

- vraća dijagnozu;
- generiše risk score;
- menja originalni tekst;
- odlučuje assignment;
- dodaje tag van odobrene taxonomy liste;
- šalje podatke timu pre eksplicitne potvrde korisnika.

Ako AI adapter nije konfigurisan, flow nastavlja bez AI-a.

## 8. Početna demo matrica terapeuta

Koristi isključivo kao promenljive demo preference koje tim može da koriguje:

### Anja Stamenković

- individualni rad sa odraslima;
- bračno savjetovanje;
- podrška roditeljima;
- stres i anksioznost;
- samopouzdanje;
- životne promene;
- lični razvoj;
- online i uživo u Nišu;
- demo minimalni uzrast `18`, uz jasno pitanje timu da li prihvata 16–17.

### Marija Stamenković

- adolescenti i odrasli;
- podrška roditeljima;
- emocije;
- samopouzdanje;
- lični razvoj;
- online i uživo u Leskovcu;
- demo minimalni uzrast `13`, uz stručnu potvrdu.

### Marijan Janković

- adolescenti prema potvrđenom uzrastu i odrasli;
- životne krize;
- stres;
- izazovi u odnosima;
- oporavak nakon nasilja i složenijih kriznih iskustava;
- online i uživo u Leskovcu;
- demo minimalni uzrast `16`, uz stručnu potvrdu.

Nemoj automatski dodeljivati složeniji krizni slučaj samo na osnovu bio taga. Ako je potrebno stručno potvrđivanje, rezultat je `human_review_required` i zahtev ide u kontrolisani nedodeljeni red.

## 9. Matching pravila

Implementiraj deterministic rules-first evaluaciju.

### Hard constraints

Terapeut ne ulazi u rezultat ako ne ispunjava sve relevantne uslove:

- profil je aktivan;
- prima nove klijente;
- prihvata uzrasnu grupu;
- pruža izabranu uslugu;
- podržava izabrani online/uživo format;
- radi na izabranoj lokaciji kada je rad uživo;
- dozvoljen je za taj tenant/organizaciju;
- nije ručno isključen iz matching-a;
- složenost zahteva ne zahteva prethodni human review.

### Soft ranking

Početne težine treba da budu konfigurabilne, na primer:

```text
primary topic match       35
service specialization   25
availability             20
format preference        10
current intake capacity  10
```

Nemoj koristiti cenu, procenjenu vrednost klijenta, marketing segment ili prihod kao matching signal.

Klijent vidi samo razloge, dok staff može videti scoring breakdown radi korekcije pravila.

### Fallback

Vrati `unassigned` ili `human_review_required` kada:

- nema terapeuta koji prolazi hard constraints;
- dva rezultata su praktično izjednačena, a korisnik želi potvrdu tima;
- taxonomy ne može pouzdano da opiše zahtev;
- stručni tim je označio oblast kao `human_review_required`;
- korisnik eksplicitno bira da tim odluči.

## 10. Predloženi domenski objekti

Za staging TypeScript modele i buduće backend ugovore predvidi najmanje:

```text
MatchingQuestionnaire
MatchingQuestionnaireVersion
MatchingQuestion
MatchingOption
SupportTaxonomyTag
TherapistMatchingProfile
TherapistAvailabilitySummary
AnonymousMatchingSession
MatchingAnswer
MatchingCandidate
MatchingResult
IntakeCase
IntakeAssignment
IntakeAssignmentHistory
AIExtractionPreview
ConsentRecord
```

`TherapistMatchingProfile` treba da sadrži:

```ts
{
  therapistId: string;
  organizationId: string;
  enabled: boolean;
  acceptingNewClients: boolean;
  minAge: number | null;
  maxAge: number | null;
  supportedAudience: string[];
  serviceTags: string[];
  preferredTopicTags: string[];
  excludedTopicTags: string[];
  humanReviewTopicTags: string[];
  formats: Array<"online" | "in_person">;
  cities: string[];
  languages: string[];
  weeklyNewIntakeCapacity: number;
  currentNewIntakeCount: number;
  pausedUntil: string | null;
  updatedAt: string;
  updatedBy: string;
}
```

## 11. Intake state machine

Za buduću produkcionu implementaciju modeluj jasna stanja:

```text
anonymous_draft
matched
contact_pending
submitted
unassigned
human_review_required
assigned
appointment_requested
therapist_confirmed
alternative_proposed
reassignment_requested
reassigned
closed
```

Staging prototip može simulirati ova stanja u memoriji, ali UI i adapter ugovor treba da koriste finalne nazive.

## 12. Timski panel — Anja, Marija i Marijan

Dodaj staging preview rutu unutar postojećeg staff/admin panela, na primer:

```text
/staff/intake-matching
```

ili prilagodi postojećoj strukturi ruta.

Panel ima četiri taba:

### A. Novi zahtevi

Filteri:

- Nedodeljeni
- Potreban stručni pregled
- Dodeljeni meni
- Svi aktivni
- Zatvoreni

Kartica zahteva u zajedničkom redu prikazuje samo minimalan operativni sažetak:

- demo intake ID;
- uzrasna grupa;
- vrsta podrške;
- format i grad;
- potvrđeni taxonomy tagovi;
- željeni vremenski okvir;
- vreme prijema;
- matching razloge;
- status.

Ne prikazuj opcioni slobodan tekst celom timu.

Akcije:

- `Preuzmi zahtev`;
- `Dodeli terapeutu` ako uloga dozvoljava;
- `Otvori objašnjenje matching-a`;
- `Vrati u nedodeljene`;
- `Preusmeri` uz obavezan razlog.

### B. Moji zahtevi

Nakon preuzimanja dodeljeni terapeut vidi:

- potvrđene odgovore;
- klijentski odobren neutralni AI sažetak;
- originalni opcioni tekst samo ako je korisnik odobrio deljenje;
- izabrani termin ili vremensku preferenciju;
- assignment istoriju;
- akcije za nastavak Booking Engine toka.

### C. Preference terapeuta

Svaki terapeut može menjati sopstveni profil:

- prima/ne prima nove klijente;
- minimalni i maksimalni uzrast;
- publike i usluge;
- preferirane oblasti;
- isključene oblasti;
- oblasti koje zahtevaju stručni pregled;
- online/uživo;
- gradove;
- jezike;
- nedeljni kapacitet novih zahteva;
- privremenu pauzu;
- učešće u zajedničkom nedodeljenom redu.

Owner/admin može videti sve profile i, uz audit, korigovati organizaciona pravila. Terapeut ne može menjati preference drugog terapeuta bez odgovarajuće role.

### D. Matching pregled

Za svaki demo scenario prikaži:

- hard constraints koji su prošli/pali;
- soft score breakdown;
- zašto je kandidat prvi;
- zašto je neko isključen;
- koja verzija questionnaire/taxonomy/rules je korišćena;
- dugme `Pokreni ponovo sa novim pravilima` samo za demo scenario.

Ovaj tab služi timu da koriguje pravila, ne da ocenjuje korisnike.

## 13. Claim i reassignment integritet

U staging prototipu simuliraj, a u interfejsu dokumentuj sledeće produkciono pravilo:

- `Preuzmi zahtev` mora biti atomska operacija;
- prvi uspešan claim dobija assignment;
- drugi paralelni claim dobija conflict odgovor;
- nakon assignment-a zahtev nestaje iz zajedničkog reda;
- svaka promena terapeuta upisuje `fromTherapistId`, `toTherapistId`, razlog, vreme i actor;
- klijent dobija obaveštenje kada realni Notification Engine bude povezan;
- vraćanje u pool zahteva razlog;
- assignment ne briše prethodnu istoriju.

## 14. Booking Engine integraciona tačka

U prototipu dugme `Izaberi i pogledaj termine` otvara mock slotove.

Definiši budući ugovor:

```ts
getEligibleSlots({ therapistId, serviceId, format, city, timezone })
createAppointmentRequest({ intakeId, therapistId, slotId, contact, consent })
```

Booking Engine ostaje source of truth za:

- raspoloživost;
- sprečavanje preklapanja;
- slot hold;
- request-first potvrdu terapeuta;
- alternativni termin;
- Notify Me.

Matching Engine ne sme sam rezervisati termin.

## 15. Notification integraciona tačka

U staging-u prikaži samo simulirane toast/in-app rezultate.

Predvidi događaje:

```text
intake.submitted.v1
intake.unassigned.v1
intake.claimed.v1
intake.assigned.v1
intake.reassigned.v1
matching.completed.v1
appointment.requested_from_intake.v1
```

Buduće notifikacije:

- novi nedodeljen zahtev za dozvoljeni tim;
- zahtev dodeljen terapeutu;
- zahtev preusmeren;
- korisnik poslao zahtev za termin;
- terapeut predložio alternativu.

## 16. Privatnost i vidljivost

U prototipu prikaži pravila kroz UI i dokumentuj ih u kodu:

- pet pitanja radi anonimno;
- nema email gate-a pre rezultata;
- kontakt se traži tek pri slanju zahteva;
- korisnik potvrđuje koje AI tagove prihvata;
- opcioni tekst ne ide u zajednički pool;
- zajednički pool prikazuje samo minimalan sažetak;
- puni odobreni unos vidi samo dodeljeni terapeut i ovlašćeni koordinator;
- analytics dobija agregirane funnel događaje bez odgovora i slobodnog teksta;
- definirati retention policy pre produkcije;
- ne logovati payload u observability sistem.

## 17. Research Drawer nije deo ovog engine-a

Postojeći floating `?` i Research Drawer ostaju poseban modul za istraživanje online/uživo iskustva.

Ne mešaj research pitanja sa Guided Matching pitanjima.

Intake & Matching optimizuje izbor i zakazivanje. Research Drawer prikuplja opciono mišljenje korisnika i ne utiče na matching rezultat.

## 18. Demo scenariji

Dodaj neutralne, potpuno izmišljene scenarije bez stvarnih ličnih podataka:

1. odrasla osoba, stres, online, najbolje uklapanje;
2. roditelj, podrška roditeljima, Niš;
3. adolescent, emocije, Leskovac;
4. par, bračno savjetovanje, online;
5. korisnik bira najraniji termin;
6. korisnik želi konkretno izabranog terapeuta;
7. nema terapeuta koji prolazi hard constraints;
8. korisnik bira da tim potvrdi izbor;
9. zahtev zahteva stručni pregled;
10. poslovni korisnik bira `Rad sa kompanijama`.

Svaki scenario mora dati stabilan, objašnjiv rezultat.

## 19. UX zahtevi

- koristi postojeći Psihointegritet dizajn sistem;
- mobile-first;
- tastatura i screen-reader podrška;
- vidljiv focus;
- native controls gde je moguće;
- progress `Pitanje N od 5`;
- back bez gubitka odgovora;
- restart;
- loading, empty, error i retry stanja;
- AI loading/error/fallback;
- rezultat bez naloga;
- kontakt tek na kraju;
- nema agresivnih pop-up poruka;
- nema manipulativnog urgency copy-ja;
- nema numeričkog match procenta za klijenta;
- staff vidi objašnjenje pravila i score breakdown.

## 20. Predloženi implementacioni milestones

### M0 — Analiza i ugovori

- pregled postojećeg repozitorijuma;
- route/component/model mapa;
- odluka o feature flag-u;
- TypeScript domain interfaces;
- mock adapter contract;
- kratka dokumentacija `docs/intake-matching-preview.md`.

### M1 — Client Guided Matching

- tri javne ulazne tačke;
- 5 pitanja;
- company branch;
- back/restart/progress;
- rezultat i alternative;
- opcioni tekst;
- mock AI tag preview;
- mock booking slots.

### M2 — Team panel

- novi zahtevi;
- moji zahtevi;
- therapist preferences;
- matching pregled;
- demo claim/reassignment;
- audit timeline u memoriji.

### M3 — Rules engine i scenariji

- hard constraints;
- configurable soft weights;
- explainability;
- fallback/human review;
- 10 demo scenarija;
- unit testovi evaluatora.

### M4 — QA i review paket

- responsive test;
- accessibility provera;
- feature flag potvrda;
- production write guard;
- build/lint/typecheck/test;
- screenshot/video ili staging uputstvo za Anju i tim;
- lista odluka koje tim treba da potvrdi.

## 21. Testovi

Dodaj ciljane testove za:

- hard constraint isključivanje;
- uzrasne granice;
- online/uživo lokaciju;
- accepting-new-clients toggle;
- paused therapist;
- topic ranking;
- availability preference;
- capacity tie-break;
- human-review fallback;
- unassigned fallback;
- objašnjenje rezultata;
- client ne vidi raw score;
- zajednički pool ne vidi opcioni tekst;
- therapist ne menja tuđe preference;
- claim conflict;
- reassignment history;
- AI failure ne blokira matching;
- company branch ne ulazi u terapeut matching;
- production feature flag je isključen.

Pokreni sve postojeće quality gate-ove repozitorijuma i ne menjaj test runner bez potrebe.

## 22. Obavezne stručne odluke pre produkcije

U staff preview-u dodaj checklist ili poseban review panel sa otvorenim pitanjima:

1. Da li Anja radi sa uzrastom 16–17 ili samo sa odraslima?
2. Koji je minimalni uzrast za Marijana?
3. Koje oblasti zahtevaju obavezni human review?
4. Ko može da vidi i preuzme nedodeljene zahteve?
5. Ko sme da dodeli zahtev drugom terapeutu?
6. Kako se dobija saglasnost za maloletnike?
7. Koliki je maksimalni nedeljni intake kapacitet svakog terapeuta?
8. Koji odgovori se dele sa dodeljenim terapeutom?
9. Koliko dugo se čuvaju nezavršene anonimne sesije i poslati intake zahtevi?
10. Koji lokalizovani safety/human-support protokol se prikazuje pre produkcije?
11. Da li tim želi jedan predlog ili top 3 rezultata?
12. Kako se rešava situacija kada korisnik želi terapeuta koji ne prima nove klijente?

Dok ova pitanja nisu potvrđena, vrednosti ostaju jasno označene kao demo i engine ne ide na production.

## 23. Definition of Done za v0.1

V0.1 je završen kada:

- na staging-u postoji kompletan petokoračni klijentski flow;
- Header, Hero i Guided Selection sekcija otvaraju isti engine;
- samostalni izbor terapeuta ostaje dostupan;
- rezultat se dobija bez email-a;
- prikazan je glavni predlog, razlozi i alternative;
- company branch je odvojen;
- mock booking i notification tokovi rade;
- staff vidi demo intake rezultate;
- svaki terapeut može menjati sopstvene demo preference;
- owner vidi sva demo pravila;
- nedodeljeni red, claim i reassignment rade u demo režimu;
- opcioni tekst nije vidljiv zajedničkom redu;
- matching pregled objašnjava svaku odluku;
- svi demo scenariji imaju očekivani rezultat;
- feature flag je potvrđeno isključen u production-u;
- build, typecheck, lint i testovi prolaze;
- postoji lista odluka koje Anja, Marija i Marijan treba da potvrde.

## 24. Završni odgovor Codex-a

Na kraju prikaži:

1. rezime postojeće arhitekture koju si pronašao;
2. spisak novih i promenjenih fajlova;
3. route map klijentskog i staff toka;
4. MatchingAdapter i domenske modele;
5. hard/soft rules implementaciju;
6. privatnost i production guards;
7. rezultate build/typecheck/lint/test provera;
8. staging URL ili tačno uputstvo kako tim otvara preview;
9. checklist odluka za Anju, Mariju i Marijana;
10. šta ostaje za produkcionu integraciju sa FastAPI, PostgreSQL, Booking, Notification, Consent, AI i Diagnostic Engine-ima.

Ne implementiraj produkciono prikupljanje osetljivih podataka dok stručni tim ne potvrdi pitanja, routing matricu i pravila vidljivosti.
