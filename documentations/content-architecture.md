# Psihointegritet — Arhitektura sadržaja

**Verzija:** 0.2
**Dopunjeno:** 2026-07-23 — pet oblasti podrške, LGBTQIA+ inkluzivnost, guest pristup i content governance

## 1. Pozicioniranje

Psihointegritet je digitalni centar za mentalno zdravlje, ne samo sistem za zakazivanje.

Osnovna vrednost:

individualna psihoterapija;
bračno savetovanje;
stručni edukativni sadržaj;
radionice;
programi ličnog razvoja;
dostupnija i razumljivija podrška na našem jeziku.

Psihointegritet eksplicitno prihvata LGBTQIA+ osobe bez stigme. Ova poruka je deo identiteta celog centra, a ne izdvojena kampanja ili drugačija usluga.

Njena formulacija misije je dobra osnova, ali ćemo je na landing stranici skratiti i usmeriti prema korisniku.

## 2. Prvi tim

MVP počinje sa tri terapeuta:

Anja Stamenković;
Marija Stamenković;
Marjan Janković.

To je dovoljno za stvarni pilot. Svako može odmah dobiti profesionalni profil, svoje oblasti rada, usluge, format rada i termine.

## 3. Početne usluge

Iz dokumenta možemo formirati zajednički katalog:

individualna psihoterapija;
bračno savetovanje;
psihoterapijsko savetovanje;
kontrolisani zahtev za podršku adolescentima;
podrška u roditeljstvu;
radionice i grupni programi.

Cene su trenutno definisane za tri osnovne usluge:

Usluga Trajanje Okvirna cena Format
Individualna psihoterapija 60 min 3.500 RSD online ili uživo
Bračno savetovanje 90 min 5.000 RSD online ili uživo
Psihoterapijsko savetovanje 60 min 3.500 RSD online ili uživo

Ovo već omogućava da projektujemo kartice usluga i booking tok.

> **Napomena:** ove cene su Anjin izvorni nacrt. Aktuelni katalog je od `PRODUCT_DECISIONS.md` D-025 (2026-07-19) drugačiji — Individualna 4.000 RSD, Bračno 5.500 RSD/90min, a „Psihoterapijsko savetovanje" je uklonjeno kao zasebna cenovna stavka i zamenjeno „Roditeljsko savetovanje" (5.000 RSD/60min). Videti `frontend/src/content/services.ts` za tačan živi katalog.

### Važne stvari koje treba normalizovati

Pre unosa u bazu treba da usaglasimo terminologiju.

#### Bračno savetovanje i partnerska podrška

Za MVP se koristi potvrđeni javni naziv:

Bračno savetovanje

„Partnerska podrška" može se koristiti u opisnom tekstu, ali ne kao druga usluga. Izraz „psihološko savetovanje" ne objavljuje se; koristi se potvrđeni naziv „psihoterapijsko savetovanje".

#### Roditeljstvo nije još potpuno definisana usluga

Trenutno se pojavljuje kao usluga kod sva tri terapeuta, ali nema:

trajanje;
cenu;
format;
opis procesa;
informaciju da li je individualno savetovanje roditelja, edukacija ili program.

Zato ga za sada možemo voditi kao oblast podrške, dok Anja ne definiše konkretnu uslugu ili program.

#### Terapeuti ne treba da budu zaključani u stroge kategorije

Anja je dobro primetila da terapeute ne treba svesti na nekoliko kategorija. Njene liste ćemo koristiti kao:

razloge zbog kojih se korisnici javljaju;
javne oblasti iskustva i interesovanja;
kriterijume za guided selection;
filtere koji pomažu da se izbor suzi.

Nećemo korisniku govoriti: „Ovaj problem pripada samo ovom terapeutu."

#### „Trijaža" treba da postane „pomoć pri izboru"

U javnom proizvodu ne bih koristio izraz klinička trijaža. To može implicirati stručnu procenu ozbiljnosti stanja.

Bolji nazivi:

Pomoć pri izboru podrške
Pronađite odgovarajući oblik podrške
Pomozite nam da suzimo izbor

Sistem će povezivati kriterijume sa profilima i dostupnošću, ali neće postavljati dijagnozu niti donositi klinički zaključak.

## 4. Gost korisnik i trenutak registracije

Bez naloga korisnik može:

- pregledati sve javne oblasti, usluge, cene i profile;
- čitati stručne i edukativne sadržaje;
- koristiti javni video/audio sadržaj i preuzeti besplatne PDF materijale;
- koristiti osnovni vođeni izbor;
- poslati upit ili zahtev za termin;
- poslati prijavu interesovanja ili prijavu za javnu radionicu/program.

Zahtev za termin nije potvrđen termin. Prijava za radionicu/program nije automatski potvrđeno mesto. Nalog se traži tek kada potvrđena usluga, uplata, zaštićen sadržaj ili lični prostor to zahtevaju.

## 5. LGBTQIA+ podrška

LGBTQIA+ podrška je:

- ravnopravna javna oblast i tematski hub;
- cross-cutting kontekst koji može biti povezan sa više životnih tema;
- vidljiva na profilu terapeuta samo kada je terapeut potvrdio odgovarajuću profesionalnu capability oznaku;
- dostupna pod istim cenama, statusima i Booking pravilima kao druga podrška.

Ona nije posebna booking usluga niti razlog da sistem zahteva otkrivanje seksualne orijentacije ili rodnog identiteta. Javni Intake može imati samo opciono neutralno pitanje „Kako želite da vam se obraćamo?".

## 6. Sadržaj koji je odmah spreman za landing

Iz njenog materijala možemo napraviti sledeću strukturu.

### Hero

Stručna podrška za bolje razumevanje sebe i svojih odnosa.

Psihointegritet je digitalni centar za mentalno zdravlje koji povezuje psihoterapiju, savetovanje, edukativne sadržaje, radionice i programe ličnog razvoja.

Primarni CTA:

Pomozi mi da pronađem podršku

Sekundarni CTA:

Upoznaj naše terapeute

### Razlozi dolaska

Početni grid koristi pet širokih puteva:

1. Nemir, strah i preopterećenost
2. Energija, navike i odnos prema sebi
3. Gubitak, promene i životne krize
4. Ljubav, partnerstvo i porodični odnosi
5. Roditeljstvo i odrastanje

LGBTQIA+ podrška se prikazuje kao ravnopravna dodatna oblast/hub, ali se u Content Engine-u vodi i kao cross-cutting kontekst kako ne bi bila izolovana od drugih životnih tema.

CTA ostaje:

Pogledaj sve oblasti podrške

### Prvi razgovor

Tekst koji je poslala je vrlo dobar. Od njega pravimo samostalnu sekciju:

Prvi razgovor je prostor za upoznavanje, ne obaveza.

To je jaka poruka za korisnika koji još nije siguran da li želi da započne terapiju.

### Radionica

„Upoznaj sebe kroz geštalt iskustvo" je dovoljno konkretna da postane prva stvarna radionica na sajtu.

Nedostaju još:

datum;
lokacija ili online format;
cena;
maksimalan broj učesnika;
voditelj ili voditelji;
pravila prijave i otkazivanja.

### Edukativni sadržaj

Za pilot već imamo tri dobra naslova:

Kako prepoznati burnout pre nego što postane ozbiljan problem?
Zašto nije potrebno da dođemo do „pucanja" da bismo došli na psihoterapiju?
Postavljanje granica bez osećaja krivice.

To je dobar početak jer pokriva:

organski Google sadržaj;
Instagram/LinkedIn adaptaciju;
relevantne tematske landing stranice;
unutrašnje linkove prema uslugama i terapeutima.

### Formati sadržaja

Svaka oblast može povezivati:

- stručni članak;
- kratak edukativni tekst;
- preporuku knjige ili podkasta;
- video;
- audio vežbu;
- PDF vodič;
- iskustvenu vežbu ili radni list;
- relevantnu radionicu/program;
- relevantne terapeute.

Terapeut, usluga, radionica i program ostaju zasebni domenski entiteti. Content Engine ih referencira; ne pretvara ih u običan `content_type`.

### Model pristupa

Besplatna prva verzija obuhvata članke, blog, kratke edukativne tekstove, preporuke literature/podkasta/videa, deo audio i PDF sadržaja, profile terapeuta, opis usluga, osnovni Kompas i informacije o programima.

Plaćaju se individualni razgovori, bračno savetovanje, grupni programi, radionice, online kursevi i kasniji specijalizovani edukativni paketi.

Kao **„U pripremi"** mogu se prikazati samo realno planirane oblasti: iskustva korisnika uz odobren consent model, moderisana zajednica, online kursevi, napredni Kompas, prošireni programi za kompanije, NTC programi za decu, članski deo i mobilna aplikacija. Oznaka ne aktivira praznu funkcionalnost niti obećava rok.

### Taksonomija i stručna potvrda

Kontrolisane ose su: `support_path`, `topic`, `audience_context`, `goal`, `format`, `access_level` i `review_status`. LGBTQIA+ podrška pripada `audience_context`, uz mogućnost posebnog javnog hub-a.

Sav stručni sadržaj pre objave odobrava početni tim:

- Anja Stamenković;
- Marija Stamenković;
- Marjan Janković.

Za buduće specijalističke oblasti dodaje se imenovani stručni reviewer. Automatsko uključivanje u preporuke dozvoljeno je samo za objavljen i odobren sadržaj.

## 7. Vizuelni pravac

Smernice su dovoljno jasne:

moderan;
minimalistički;
topao;
mnogo svetlog prostora;
zemljani tonovi;
maslinasto zelena;
bež;
bela;
autentične fotografije terapeuta;
bez stereotipnih i dramatizovanih stock fotografija.

To sugeriše dizajn koji kombinuje:

ozbiljnu editorial tipografiju;
prostrane sekcije;
meke kartice i diskretne granice;
stvarne portrete terapeuta;
vrlo smirene animacije;
jasne, ali nenapadne CTA elemente.

Framer Motion treba koristiti minimalno: ulazak sekcija, diskretan card hover i progress kroz guided flow. Bez „lebdećih" i agresivnih animacija.

## 8. Šta nam još treba od Anje

Pre finalnog wireframe-a i seed podataka treba tražiti samo konkretne dopune:

Fotografije sva tri terapeuta.
Grad i lokacija rada uživo.
Da li sva tri terapeuta nude sve navedene formate.
Tačne usluge po terapeutu.
Da li je „roditeljstvo" usluga, radionica ili oblast podrške.
Potvrđeni javni opis bračnog savetovanja i partnerske podrške.
Radno vreme i početna dostupnost svakog terapeuta.
Potvrda capability-ja svakog terapeuta po uzrastu, formatu i LGBTQIA+ oblasti.
Finalna pravila aktivacije kontrolisanog toka za uzrast 16–17 i team review za mlađe od 16.
Pravilo otkazivanja za radionice.
Detalji prve radionice.
Logo, ako postoji.
Kontakt email, telefon i društvene mreže.
Da li Psihointegritet već ima fizičku adresu centra.
Ko prima uplate i izdaje račune.
Da li cenu prikazujemo javno ili tek u flow-u usluge.

## 9. Sledeći plan rada

Sada bih napravio tri interna dokumenta:

### A. Content map

Svaki Anjin tekst mapiramo na:

landing sekciju;
profil terapeuta;
uslugu;
tematsku stranicu;
FAQ;
radionicu;
blog.

### B. Component map

Na osnovu sadržaja definišemo:

HeroSection
ReasonForVisitGrid
SupportPathSelector
TherapistCard
TherapistProfile
ServiceCard
FirstSessionSection
WorkshopCard
ResourceCard
TrustAndPrivacySection
FAQAccordion
GuidedSelectionDrawer
FinalCTA

### C. Seed data model

Njen PDF postaje prvi strukturisani dataset:

Organization
└── Psihointegritet

Therapists
├── Anja
├── Marija
└── Marjan

Services
├── Individualna psihoterapija
├── Bračno savetovanje
└── Psihoterapijsko savetovanje

Support paths
├── Nemir, strah i preopterećenost
├── Energija, navike i odnos prema sebi
├── Gubitak, promene i životne krize
├── Ljubav, partnerstvo i porodični odnosi
└── Roditeljstvo i odrastanje

Audience/context
└── LGBTQIA+ podrška

Workshop
└── Upoznaj sebe kroz geštalt iskustvo

Articles
└── 3 pilot naslova
