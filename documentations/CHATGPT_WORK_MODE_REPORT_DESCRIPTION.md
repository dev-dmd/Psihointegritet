# Izvestaj za ChatGPT Work mode — javni website flow

**Datum:** 2026-07-21  
**Repo:** Psihointegritet digitalni centar  
**Svrha:** dati ChatGPT Work mode-u tacan presek: sta je zamisljeno, sta stvarno postoji u kodu, sta nedostaje i sta treba definisati pre sledece implementacije user-flow-a.

---

## 0. Kreiraj TODO Web Flow poseban gde cemo pratiti šta je uradjeno.

Plan treba prilagoditi tako da ne pravimo novu arhitekturu preko već dobrog prototipa.

Najbolji pravac je:

zadržati sadašnji sticky header sa šest linkova, Login i Zakaži termin;
postojeće anchor destinacije postepeno prebaciti na prave rute;
postojeće drawere i komponente ponovo koristiti na novim stranicama;
prvo napraviti centralni /zakazi i ugovor za prenošenje booking konteksta;
ne razvijati sve planirane SEO stranice odjednom;
ne dirati Control Center, Superadmin i backend u ovoj iteraciji;
statički sadržaj organizovati kao buduće CMS modele, da kasnije menjamo izvor podataka, a ne UI i flow.

1. Šta zadržavamo bez većih promena

Postojeći projekat već ima dovoljno kvalitetan temelj. Ne treba ponovo praviti:

početnu stranicu;
/tim;
profile terapeuta;
/usluge;
/znanje;
/rad-sa-kompanijama;
Guidance Drawer;
Matching Engine;
B2B konfigurator;
Research Drawer;
Booking email formu;
Control Center preview;
Superadmin preview;
postojeći dizajn i animacije;
sticky header;
Login dugme;
sticky Zakaži termin CTA.

Ključna promena nije novi dizajn, već povezivanje postojećih delova u dosledan route-level flow.

2. Revidirana struktura headera

Ne treba dodavati sve nove stranice u header. Sadašnjih šest linkova je dovoljno.

Label Trenutno Nova destinacija
Pronađi podršku /#podrska /pronadji-podrsku
Terapeuti /tim ostaje /tim
Usluge /usluge ostaje /usluge
Radionice /#radionice /radionice
Znanje i resursi /znanje ostaje /znanje
O nama /#onama /o-nama
Login/Moj nalog Clerk ruta ostaje
Zakaži termin otvara drawer postepeno vodi na /zakazi

Ne treba dodavati u header:

Cene
Kompanije
Roditelje
Adolescente
Kontakt
Pravne stranice
Oblasti podrške

Te stranice će biti dostupne kroz:

početnu;
/usluge;
relevantne kartice;
footer;
kontekstualne linkove;
Google rezultate;
breadcrumb navigaciju.
Prelazak sa drawera na /zakazi

Ne treba odmah obrisati postojeći drawer.

Predlažem migraciju u tri koraka:

Napraviti /zakazi koristeći postojeću BookingRequestForm.
Sve nove CTA linkove usmeriti na /zakazi.
Kada nova ruta dostigne funkcionalnu jednakost, header CTA prebaciti sa otvaranja drawera na rutu.

Guidance Drawer može ostati za vođeni izbor, ali rezultat više ne treba da otvara inline booking formu. Rezultat vodi na /zakazi sa već izabranim terapeutom i uslugom.

3. Revidirana mapa ruta
   R1 — zadržati postojeće
   Ruta Status Potrebna promena
   / Postoji Povezati CTA sa novim rutama
   /tim Praktično gotova Dodati booking prefill
   /tim/[slug] Postoji Dodati Zakaži kod terapeuta
   /usluge Postoji Povezati kartice sa detaljima i bookingom
   /znanje Postoji Ostaviti kao „u pripremi“
   /rad-sa-kompanijama Postoji Dopuniti planovima i objašnjenjima
   R1 — dodati sada

Ovo su rute koje direktno popravljaju glavni korisnički flow:

Ruta Zašto je potrebna
/pronadji-podrsku Daje deljiv i SEO ulaz u postojeći Matching Engine
/zakazi Postaje centralna tačka za sve zahteve za termin
/usluge/[slug] Daje detalje i direktan booking za tri postojeće usluge
/radionice Zamenjuje homepage anchor i koristi postojeće podatke o programima
/radionice/[slug] Detaljna stranica programa i prijavljivanje interesovanja
/cene Centralni transparentni cenovnik
/o-nama Zamenjuje anchor, uključuje vrednosti i lokacije
/kontakt Administrativni i opšti kontakt, bez mešanja sa bookingom
/podrska-roditeljima Postoji dovoljno sadržaja i programa da opravda posebnu stranicu
R1.5 — dodati nakon primarnog flow-a
Ruta Razlog odlaganja
/oblasti-podrske Ne blokira zakazivanje; prvo zaključati taksonomiju
/oblasti-podrske/[slug] Zahteva kvalitetan jedinstveni SEO sadržaj
/podrska-adolescentima Čeka cenu, uzrast, saglasnosti i precizan proces rada
puna /znanje biblioteka Čeka CMS i stvarni sadržaj
kompanijski payment flow Čeka potvrđene B2B cene i modele naplate
Obavezno pre produkcije, ali trenutno blokirano sadržajem
Ruta Blokada
/pravne/privatnost Pravno potvrđen tekst
/pravne/uslovi-koriscenja Pravno potvrđen tekst
/pravne/kolacici Stvarna cookie/analytics konfiguracija
/pravne/pravila-zakazivanja Potvrđena pravila otkazivanja i pomeranja
/hitna-podrska Stručno i pravno odobren sadržaj i zvanični kontakti

Ne treba objavljivati izmišljene pravne ili bezbednosne tekstove samo da bi rute postojale.

Za pravne rute preporučujem /pravne/\*. Ako se kasnije pojave stari linkovi /privatnost, /uslovi i slično, dodati permanentne redirecte.

4.  Glavni javni flow
    flowchart TD
    H["Početna"] --> N{"Šta korisnik zna?"}
    N -->|"Nije siguran"| M["Pronađi podršku"]
    N -->|"Zna uslugu"| S["Usluga"]
    N -->|"Zna terapeuta"| T["Profil terapeuta"]
    N -->|"Kompanija"| C["B2B konfigurator"]

        M --> B["Zakazivanje sa prefill kontekstom"]
        S --> B
        T --> B
        C --> Q["Model saradnje i strukturisan upit"]

Korisnik nije siguran
Početna
→ /pronadji-podrsku
→ postojeći Matching Engine
→ preporuka terapeuta i usluge
→ /zakazi sa prefill podacima
→ slanje zahteva
Korisnik zna uslugu
Početna ili /usluge
→ /usluge/[slug]
→ /zakazi?service=[slug]

Korisniku ne treba nametati detaljnu stranicu. Na kartici može postojati:

naslov kartice koji vodi na detalje;
primarno dugme Zakaži termin koje ide direktno na /zakazi.
Korisnik zna terapeuta
/tim
→ /tim/[slug]
→ /zakazi?therapist=[slug]

Ako terapeut pruža samo određene usluge, booking prikazuje samo validne kombinacije.

Kompanija
Početna ili footer
→ /rad-sa-kompanijama
→ postojeći B2B konfigurator
→ predloženi model
→ strukturisana kontakt forma 5. /pronadji-podrsku

Ova ruta ne treba da duplira novu matching logiku. Treba izdvojiti zajednički sadržaj iz GuidanceDrawer komponente.

Predložena komponentna struktura:

GuidanceFlow
├── GuidanceIntro
├── GuidanceQuestions
├── GuidanceResult
└── GuidanceActions

GuidanceDrawer
└── GuidanceFlow

GuidancePage
└── GuidanceFlow

Na taj način:

drawer ostaje na početnoj;
ruta koristi isti flow;
scoring postoji samo na jednom mestu;
izmene pitanja se automatski vide na obe površine;
stranica dobija canonical URL;
korisnik može da podeli početak flow-a.
Sadržaj stranice
Kratak uvod
Šta korisnik dobija
Napomena da upitnik nije dijagnostički alat
Započni vođeni izbor
Alternativa Samostalno upoznajte terapeute
Matching pitanja
Rezultat
CTA ka /zakazi

Matching odgovore ne stavljati u URL. U URL se prenose samo bezbedni identifikatori:

terapeut;
usluga;
format;
izvor dolaska. 6. Centralna ruta /zakazi

Ovo je najvažnija nova ruta.

Booking context contract

Podržati:

/zakazi
/zakazi?service=individualna-psihoterapija
/zakazi?therapist=anja-stamenkovic
/zakazi?service=bracno-savetovanje&therapist=anja-stamenkovic
/zakazi?service=individualna-psihoterapija&format=online
/zakazi?service=individualna-psihoterapija&therapist=anja-stamenkovic&source=matching

Dozvoljeni parametri:

Parametar Svrha
service Kanonski slug usluge
therapist Kanonski slug terapeuta
format online ili uzivo
source Izvor dolaska bez ličnih podataka

Dozvoljene source vrednosti:

header
homepage
service
therapist
matching
workshop

Ne stavljati u URL:

ime;
email;
telefon;
slobodan opis;
odgovore iz Intake-a;
oblasti zbog kojih se osoba javlja;
matching score.
Ponašanje bez parametara

Ako korisnik otvori /zakazi direktno, prikazati tri izbora:

Želim vođeni izbor

Nisam siguran/na koja podrška ili terapeut mi odgovara.

Vodi na /pronadji-podrsku.

Želim da izaberem uslugu

Otvara izbor aktivnih usluga.

Želim da izaberem terapeuta

Otvara izbor terapeuta koji primaju zahteve.

Koraci forme
Korak 1 — Usluga i terapeut
izabrana usluga;
izabrani terapeut ili „Neka tim predloži“;
korisnik može da promeni prefill.
Korak 2 — Format
online;
uživo;
lokacija ako je uživo.

Ne prikazivati terapeuta na lokaciji na kojoj ne radi.

Korak 3 — Željeni termin
željeni datum;
željeno vreme ili period dana;
alternativni datum opciono.

Jasno napisati:

Ovo je zahtev za termin. Terapeut će nakon provere dostupnosti potvrditi termin ili predložiti drugu mogućnost.

Korak 4 — Kontakt
ime i prezime;
email;
telefon opciono;
način na koji želi da dobije odgovor;
opciona kratka poruka.

Slobodan tekst ne logovati u analitiku.

Korak 5 — Pregled i saglasnost

Prikazati:

uslugu;
terapeuta;
format;
lokaciju;
predloženo vreme;
kontakt;
link ka pravilima zakazivanja;
checkbox saglasnosti.
Success state

Vaš zahtev je uspešno poslat

Ovo još nije konačna potvrda termina. Terapeut ili član tima će proveriti dostupnost i poslati potvrdu ili predlog drugog termina.

Prikazati:

šta je poslato;
na koju email adresu stiže odgovor;
šta korisnik može očekivati dalje;
dugme Nazad na početnu;
opciono Pogledajte stručne sadržaje. 7. Validacija booking konteksta

Query parametri se ne smeju slepo prikazati.

Potrebno je:

pronaći service u kanonskom katalogu;
pronaći therapist u kanonskoj listi;
proveriti da terapeut pruža tu uslugu;
proveriti da terapeut radi u izabranom formatu;
proveriti lokaciju za rad uživo;
ignorisati nepoznate parametre;
omogućiti korisniku da ispravi izbor.

Ako kombinacija nije validna:

Izabrana kombinacija trenutno nije dostupna. Možete promeniti terapeuta, uslugu ili način rada.

Ne prikazivati tehničku grešku.

8. /usluge i detaljne stranice

Postojeći /usluge ostaje centralni katalog.

Ne treba dodavati „Psihoterapijsko savetovanje“ kao posebnu cenovnu uslugu, jer je odlukom D-025 uklonjeno kao zasebna stavka.

Kanonske booking usluge ostaju:

Individualna psihoterapija
Bračno savjetovanje
Roditeljsko savetovanje
/usluge/[slug]

Za početak napraviti samo tri statički generisane stranice iz services.ts.

Svaka stranica:

H1
Kratak opis
Cena, trajanje i format
Kome je namenjena
Oblasti sa kojima može biti povezana
Kako izgleda prvi korak
Terapeuti koji pružaju uslugu
Online i uživo opcije
Paketi, ako postoje
Pravila zakazivanja
FAQ
CTA sa prefill kontekstom

Primer:

/zakazi?service=individualna-psihoterapija&source=service

Nepoznat slug vraća notFound().

9. Homepage kartice usluga

Postojeće kartice ne treba ponovo projektovati. Potrebno je uskladiti sadržaj i visinu.

Predloženi model kartice
type HomepageOfferCard = {
id: string;
kind: "service" | "audience" | "program";
title: string;
description: string;
durationLabel: string;
priceLabel: string;
formatLabel: string;
detailsHref: string;
bookingHref?: string;
badge?: string;
featured?: boolean;
status: "active" | "coming-soon";
};
Kartice
Individualna psihoterapija
60 minuta
4.000 RSD
online ili uživo
Najčešći izbor
vizuelno najveća kartica
direktno zakazivanje
Bračno savjetovanje
90 minuta
5.500 RSD
online ili uživo
direktno zakazivanje
Roditeljsko savetovanje
60 minuta
5.000 RSD
online ili uživo
vodi i na /podrska-roditeljima
Adolescenti
trajanje treba potvrditi;
cena treba potvrditi;
online/uživo prema terapeutu;
dok cena nije potvrđena, nema direktnog bookinga;
vodi na buduću /podrska-adolescentima.
Radionice
trajanje prema programu;
cena prikazana uz svaki program;
online ili uživo;
vodi na /radionice.

Ne treba zadržavati posebnu karticu „Psihološko savjetovanje“.

Visina i raspored

Na desktopu:

Individualna psihoterapija može biti veća featured kartica;
sve ostale kartice imaju identičnu minimalnu visinu;
facts i CTA su poravnati na istim pozicijama;
koristiti flex flex-col i mt-auto za CTA;
ne hardkodovati visinu teksta.

Na mobilnom:

featured kartica je prva;
sve kartice imaju punu širinu;
istaknuta kartica se razlikuje bojom, borderom i badge-om;
ne koristiti nepraktično skaliranje ili horizontalni overflow. 10. /radionice

Podaci o sedam programa već postoje. Ne treba ih ponovo hardkodovati po komponentama.

/radionice treba da koristi isti izvor podataka koji sada koristi /usluge.

Katalog prikazuje
naziv;
ciljnu grupu;
kratak opis;
broj susreta;
trajanje;
broj učesnika;
format;
cenu;
status;
CTA.

Program bez potvrđene cene prikazuje:

Cena će biti objavljena pre otvaranja prijava.

Takav program ne sme imati aktivno dugme za prijavu.

/radionice/[slug]

Svaki program dobija detaljnu stranicu:

opis;
teme;
ciljeve;
format;
broj susreta;
trajanje;
broj učesnika;
cenu;
voditelja;
status prijava;
FAQ;
CTA.

Za programe koji još nisu aktivni:

Obavestite me kada prijave budu otvorene

To kasnije ide kroz Notification Engine. U demo verziji može slati strukturisan email.

11. /podrska-roditeljima

Ovu stranicu vredi dodati sada jer za nju već postoji dovoljno sadržaja.

Sadržaj
Kome je podrška namenjena
Individualno roditeljsko savetovanje
Kako izgleda razgovor
Cena, trajanje i format
Programi prema uzrastu deteta
Terapeuti
Česta pitanja
Booking CTA

Programske kategorije:

period od rođenja do 3 godine;
3–7 godina;
školski period;
roditelji tinejdžera.

Podaci o programima treba da se filtriraju iz zajedničkog programs izvora, ne da se kopiraju.

12. Podrška adolescentima

Ovu rutu ne treba finalizovati dok tim ne potvrdi:

minimalni i maksimalni uzrast;
koji terapeut radi sa kojim uzrastom;
cenu;
trajanje;
online/uživo dostupnost;
ulogu roditelja ili staratelja;
pravila saglasnosti;
način prvog kontakta.

Može se pripremiti model sadržaja, ali stranicu ne treba objaviti ili indeksirati dok odluke nisu zaključane.

13. /cene

/cene ne mora biti u headeru.

Dostupna je kroz:

homepage sekciju;
/usluge;
footer;
kartice;
FAQ;
direktne Google rezultate.

Stranica čita podatke iz centralnih izvora:

services.ts;
paketi;
programi;
budući company plans.

Sekcije:

Individualne usluge
Paketi
Grupni programi
Načini plaćanja
Otkazivanje i pomeranje
Link ka booking pravilima

Ne kopirati cenu ručno u page component.

Posebno proveriti paket:

5 seansi — 15.000 RSD;
10 seansi — 38.000 RSD.

Cena od pet seansi deluje kao moguća sadržajna neusaglašenost, ali je ne treba samostalno menjati. Označiti je internim TODO komentarom za potvrdu Anje.

14. /o-nama

Ne treba praviti veliku korporativnu stranicu.

Sadržaj:

Šta je Psihointegritet
Misija digitalnog centra
Vrednosti i pristup
Kako je organizovan tim
Online rad
Lokacija Niš
Lokacija Leskovac
Link ka /tim
Link ka uslugama
CTA ka zakazivanju

Detaljne biografije ostaju isključivo na profilima terapeuta.

15. /kontakt

Kontakt stranica ostaje važna, ali nije zamena za informacije koje nedostaju.

Treba da sadrži:

info@psihointegritet.com;
telefon kada bude potvrđen;
Niš;
Leskovac;
online rad;
radno vreme za odgovaranje;
opštu kontakt formu;
posebne ulaze za zakazivanje i kompanije.

Na vrhu jasno razdvojiti:

Želite termin?
→ Zakaži termin

Niste sigurni kome da se obratite?
→ Pronađi podršku

Predstavljate kompaniju?
→ Programi za kompanije

Imate opšte ili poslovno pitanje?
→ Kontakt forma

Tako info@ ostaje dostupan, ali ne postaje prepreka korisničkom flow-u.

16. Rad sa kompanijama

Postojeću stranicu i drawer treba zadržati.

Ne treba sada ponovo razvijati B2B konfigurator. Potrebno je dodati sadržaj oko njega.

Sekcije
Kako možemo pomoći organizaciji
Vrste podrške
Modeli saradnje
Plan kartice
Fleksibilni i rezervisani termini
Način plaćanja
Privatnost zaposlenih
Kako izgleda saradnja
FAQ
Konfigurišite program
Plan kartice
Pojedinačni pristup
Team Flex
Rezervisani kapacitet
Program po meri

Pošto B2B cene nisu potvrđene, plan modeli mogu biti prikazani u demo verziji, ali se ne smeju predstaviti kao konačna javna ponuda.

Pre produkcije moraju postojati:

početna ili tačna cena;
broj uključenih termina;
period obračuna;
dodatni termin;
rok važenja;
način plaćanja;
politika neiskorišćenog kapaciteta.

CTA sa plan kartice treba da otvori postojeći konfigurator sa unapred izabranim modelom.

17. Footer preuzima sekundarnu navigaciju

Pošto header ostaje sa šest linkova, footer treba da ponese širu mapu sajta.

Podrška
Pronađi podršku
Usluge
Roditeljska podrška
Radionice
Cene
Psihointegritet
Tim
O nama
Znanje i resursi
Rad sa kompanijama
Kontakt
Informacije

Prikazati samo stranice koje zaista postoje i imaju odobren sadržaj:

Pravila zakazivanja
Privatnost
Uslovi korišćenja
Kolačići
Hitna podrška

Ne postavljati dead linkove pre kreiranja stranica.

Kontakt
info@psihointegritet.com
Niš
Leskovac
online i uživo 18. CMS priprema bez izrade CMS-a

Sadašnji statički content treba organizovati tako da kasnije može da ga zameni backend CMS.

Predložena podela:

content/
├── services.ts
├── programs.ts
├── therapists.ts
├── support-areas.ts
├── audience-pages.ts
├── company-plans.ts
├── faqs.ts
├── site-navigation.ts
└── site-settings.ts

Komponente ne treba da znaju da li sadržaj dolazi iz TypeScript fajla ili API-ja.

Na primer:

<ServiceCard service={service} />

Kasnije:

const service = await contentApi.getService(slug);
<ServiceCard service={service} />

UI ostaje isti.

Šta CMS kasnije može da menja
naslove;
opise;
cene;
trajanje;
format;
fotografije;
FAQ;
SEO;
statuse;
programe;
termine programa.
Šta CMS ne treba da menja
globalni booking flow;
matching logiku;
rute;
sistemske CTA tipove;
autorizaciju;
bezbednosne napomene;
feature gate-ove;
navigacionu strukturu;
način prenosa booking konteksta. 19. Redosled implementacije
Slice 1 — Bezbedne korekcije
promeniti /zakazivanje u /zakazi;
ukloniti zastarelo pominjanje posebnog psihoterapijskog savetovanja;
promeniti footer email;
dodati Leskovac;
ukloniti zastarele komentare;
ne dirati ponašanje drawera.
Slice 2 — Booking contract
parser query parametara;
validacija usluge i terapeuta;
/zakazi;
postojeća email forma;
success state;
booking prefill;
unit testovi.
Slice 3 — Guided route
izdvojiti GuidanceFlow;
zadržati GuidanceDrawer;
napraviti /pronadji-podrsku;
rezultat povezati sa /zakazi.
Slice 4 — Postojeći sadržaj kao rute
/usluge/[slug];
/radionice;
/radionice/[slug];
/cene;
/o-nama;
/kontakt;
/podrska-roditeljima.
Slice 5 — Navigacija i CTA
ažurirati šest header destinacija;
header booking CTA;
homepage kartice;
profile terapeuta;
footer;
breadcrumb;
canonical metadata.
Slice 6 — B2B dopuna
plan kartice;
načini saradnje;
privatnost;
modeli plaćanja;
prefill postojećeg konfiguratora.
Slice 7 — Blokirane stranice

Tek nakon odluka:

adolescenti;
oblasti podrške;
pravne stranice;
hitna podrška;
B2B cene. 20. Definition of done

Ovaj javni flow je završen kada:

svih šest header linkova vode na prave rute;
/zakazi radi sa i bez query parametara;
matching rezultat vodi na prefilled booking;
profil terapeuta vodi na booking tog terapeuta;
kartica usluge vodi na booking te usluge;
korisnik može da promeni prefilled izbor;
nevalidna kombinacija ne ruši stranicu;
cene se čitaju iz jednog izvora;
homepage i detaljne stranice ne dupliraju podatke;
B2B konfigurator ostaje funkcionalan;
Research Drawer ostaje funkcionalan;
Control Center i Superadmin nisu regresirani;
nema dead linkova;
nema ličnih ili osetljivih podataka u URL-u;
svi postojeći testovi prolaze;
dodati su testovi booking konteksta i CTA putanja;
mobile flow radi bez horizontalnog overflow-a;
touch kontrole su najmanje 44 px kada je praktično.

Pristup „jedno pitanje po koraku“ i rano usmeravanje korisnika odgovaraju preporukama za zdravstvene digitalne servise, dok 44×44 px predstavlja sigurniji mobilni cilj za interaktivne kontrole.
