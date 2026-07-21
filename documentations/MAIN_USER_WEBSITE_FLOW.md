početna stranica daje brz pregled i direktne ulaze;
svaka usluga, ciljna grupa i važna oblast ima svoju SEO stranicu;
anchor linkovi služe samo za kretanje unutar početne stranice;
zakazivanje se otvara sa već izabranom uslugom, terapeutom ili rezultatom matching-a;
korisnik nikada ne mora da kontaktira tim samo da bi saznao cenu, trajanje, format ili kome je usluga namenjena.

1. Osnovno pravilo: stranica ili anchor?

Posebna ruta je potrebna kada sadržaj:

odgovara na posebnu korisničku nameru;
može samostalno da se pronađe na Google-u;
ima sopstvenu cenu, trajanje, terapeute ili FAQ;
vodi ka posebnom booking flow-u;
bi na početnoj zauzeo previše prostora.

Anchor je dovoljan kada sekcija samo:

daje kratak pregled;
uvodi u detaljniju stranicu;
ne donosi posebnu odluku;
nema dovoljno jedinstvenog sadržaja za svoju stranicu.

Zato globalna navigacija ne treba da vodi na /#usluge, jer taj link nema isto ponašanje sa drugih stranica. U headeru koristimo prave rute, dok anchor linkovi ostaju samo za lokalno kretanje po početnoj.

2. Predložena konačna struktura ruta
   /
   ├── /pronadji-podrsku
   ├── /usluge
   │ ├── /usluge/individualna-psihoterapija
   │ ├── /usluge/bracno-savjetovanje
   │ └── /usluge/psihoterapijsko-savjetovanje
   │
   ├── /podrska-roditeljima
   ├── /podrska-adolescentima
   │
   ├── /oblasti-podrske
   │ └── /oblasti-podrske/[slug]
   │
   ├── /tim
   │ └── /tim/[slug]
   │
   ├── /radionice
   │ └── /radionice/[slug]
   │
   ├── /rad-sa-kompanijama
   ├── /cene
   ├── /o-nama
   ├── /zakazi
   ├── /kontakt
   ├── /hitna-podrska
   │
   └── /pravne
   ├── /pravne/privatnost
   ├── /pravne/uslovi-koriscenja
   ├── /pravne/kolacici
   └── /pravne/pravila-zakazivanja
   Stranice koje bih dodao

U odnosu na trenutni plan, nedostaju:

/usluge
/usluge/[slug]
/tim
/tim/[slug]
/podrska-roditeljima
/podrska-adolescentima
/radionice/[slug]
/cene
/hitna-podrska

Ne bih sada pravio posebne stranice za Niš i Leskovac. Lokacije mogu ostati na /o-nama i profilima terapeuta. Posebne lokalne SEO stranice imaju smisla tek kada postoji dovoljno jedinstvenog sadržaja, adrese, radnog vremena i lokalnih usluga.

3. Globalna navigacija
   Desktop header

Predlažem:

Podrška ▼
Terapeuti
Radionice
Za kompanije
Cene
[Zakaži termin]

Dropdown „Podrška“:

Pomozi mi da pronađem podršku
Sve usluge
Oblasti podrške
Podrška roditeljima
Podrška adolescentima

O nama i Kontakt ne moraju zauzimati glavni header. Dostupni su u mobilnom meniju i footeru.

Mobilni meni
Pronađi podršku
Usluge
Oblasti podrške
Terapeuti
Podrška roditeljima
Podrška adolescentima
Radionice
Za kompanije
Cene
O nama
Kontakt

Na dnu mobilnog prikaza može ostati sticky dugme:

Zakaži termin

Ne prikazivati ga dok je korisnik već u booking flow-u.

Footer
Podrška
Pronađi podršku
Usluge
Oblasti podrške
Roditelji
Adolescenti
Radionice
Psihointegritet
O nama
Tim
Lokacije
Rad sa kompanijama
Cene
Informacije
Kako funkcioniše zakazivanje
Pravila otkazivanja
Privatnost
Uslovi korišćenja
Kolačići
Hitna podrška
Kontakt
info@psihointegritet.com
Niš
Leskovac
Online rad

Ne koristiti kontakt@.

4.  Glavni korisnički flow
    flowchart TD
    H["Početna stranica"] --> I{"Šta korisnik već zna?"}
    I -->|"Nije siguran"| M["Vođeni izbor"]
    I -->|"Zna uslugu"| S["Stranica usluge"]
    I -->|"Zna terapeuta"| T["Profil terapeuta"]
    I -->|"Predstavlja kompaniju"| C["B2B konfigurator"]

        M --> Z["Zakazivanje sa popunjenim izborom"]
        S --> Z
        T --> Z
        C --> P["Preporučeni program i upit"]

Najvažnije putanje
Korisnik nije siguran
Početna
→ Pronađi podršku
→ 5 kratkih pitanja
→ Preporuka terapeuta i usluge
→ Zakaži
Korisnik zna uslugu
Početna
→ Kartica usluge
→ Zakaži sa već izabranom uslugom

Detaljna stranica ostaje dostupna kroz naslov kartice ili link „Saznaj više“.

Korisnik zna terapeuta
Početna ili Tim
→ Profil terapeuta
→ Zakaži kod ovog terapeuta
Roditelj
Početna
→ Podrška roditeljima
→ Izbor individualne konsultacije ili programa
→ Zakaži/prijavi se
Kompanija
Početna
→ Rad sa kompanijama
→ B2B konfigurator
→ Preporučeni plan i okvirna cena
→ Pošalji zahtev 5. Struktura početne stranice

Početna ne treba da bude kopija svih ostalih stranica. Njena svrha je orijentacija i brz ulazak u odgovarajući flow.

Sekcija 1 — Hero

H1:

Stručna podrška za bolje razumevanje sebe i svojih odnosa

Opis:

Psihointegritet povezuje psihoterapiju, psihoterapijsko savjetovanje, edukativne programe i stručne sadržaje — online i uživo u Nišu i Leskovcu.

Primarni CTA:

Pomozi mi da pronađem podršku

Sekundarni CTA:

Upoznaj terapeute

Ispod:

Već znate šta vam je potrebno?
Zakažite termin

Sekcija 2 — Brza orijentacija

Tri kratka izbora:

Nisam siguran/na kome da se obratim

Odgovorite na pet kratkih pitanja i pogledajte predlog terapeuta i usluge.

Pokreni vođeni izbor

Želim da pregledam usluge

Uporedite trajanje, cenu, format i kome je svaka usluga namenjena.

Pogledaj usluge

Već znam kog terapeuta želim

Pogledajte profile, oblasti rada, lokacije i dostupne usluge.

Upoznaj tim

Sekcija 3 — Usluge

Eyebrow:

Usluge

H2:

Podrška prilagođena onome što vam je sada potrebno

Opis:

Pogledajte kome je usluga namenjena, koliko traje, cenu i način rada. Ako niste sigurni, vođeni izbor će vam predložiti naredni korak.

Kartice opisujem u posebnoj sekciji ispod.

Sekcija 4 — Vođeni izbor

Niste sigurni koja usluga ili terapeut vam odgovara?

Kroz nekoliko kratkih pitanja dobićete predlog na osnovu oblasti rada terapeuta, željenog formata i lokacije. Bez unošenja ličnih podataka pre rezultata.

Započni vođeni izbor

Sekcija 5 — Terapeuti

Prikazati tri profilne kartice:

fotografija;
ime;
potvrđeno stručno zvanje;
najvažnije oblasti rada;
online/uživo;
grad;
prima nove klijente;
cena od;
link ka profilu;
direktno zakazivanje.
Sekcija 6 — Roditelji, adolescenti i programi

Ovo je ulaz u tri posebna sadržajna pravca:

Podrška roditeljima
Podrška adolescentima
Grupni programi i radionice

Ne prikazivati ovde sve programe, već najviše jedan aktuelni program iz svake relevantne kategorije.

Sekcija 7 — Kako izgleda prvi korak
Izaberete uslugu ili završite vođeni izbor.
Predložite terapeuta, format i termin.
Terapeut proverava dostupnost.
Dobijate potvrdu ili predlog drugog termina.

Obavezna napomena:

Slanje zahteva ne predstavlja konačnu potvrdu termina.

Sekcija 8 — Online i uživo

Tri kratka bloka:

Online — dostupno u Srbiji i dijaspori
Niš — rad uživo sa Anjom
Leskovac — rad uživo sa Marijom i Marijanom
Sekcija 9 — Za kompanije

Kratak pregled:

individualna podrška zaposlenima;
radionice i vebinari;
podrška menadžerima;
burnout programi;
dugoročni programi;
rezervisani ili fleksibilni termini.

Pogledaj programe za kompanije

Sekcija 10 — Najčešća pitanja

Na početnoj prikazati najviše 5 pitanja:

Kako da izaberem terapeuta?
Da li je moguć online rad?
Kako se potvrđuje termin?
Koliko košta razgovor?
Šta ako nisam siguran/na koja mi je usluga potrebna? 6. Stranica /pronadji-podrsku

Ova stranica treba da bude ulazna tačka, a ne samo promotivni tekst.

Sadržaj
Šta je vođeni izbor
Šta korisnik dobija
Šta upitnik nije
Koliko traje
Dugme za početak
Alternativa za samostalni izbor
Privatnost
Matching Engine

Dva jasna puta:

Vođeni izbor

Odgovorite na nekoliko pitanja i pogledajte terapeute i usluge koji se podudaraju sa vašim izborima.

Započni

Samostalni izbor

Pregledajte oblasti rada, iskustvo, lokacije i načine rada svakog terapeuta.

Upoznaj terapeute

Vođene forme najbolje rade kada postavljaju jedno pitanje po koraku i rano koriste pitanja koja usmeravaju naredne korake. To smanjuje kognitivno opterećenje i nepotrebna pitanja. NHS Service Manual, GOV.UK Design System

7. Usluge i oblasti podrške nisu isto

Ovo treba jasno razdvojiti u CMS-u i korisničkom interfejsu.

Usluge

Odgovaraju na pitanje:

Koji oblik rada mogu da zakažem?

Primeri:

Individualna psihoterapija
Bračno savjetovanje
Psihoterapijsko savjetovanje
Roditeljsko savetovanje
Podrška adolescentima
Grupni program
Oblasti podrške

Odgovaraju na pitanje:

Zbog čega tražim podršku?

Primeri:

anksioznost;
stres i burnout;
odnosi;
roditeljstvo;
emocionalne teškoće;
gubitak i žalovanje;
samopouzdanje;
životne promene;
lični razvoj.

Jedna oblast može voditi ka više usluga i terapeuta. Jedna usluga može pokrivati više oblasti.

8. Stranica /usluge

Ovo je stranica za brzo poređenje.

Svaka kartica prikazuje:

naziv;
kome je namenjena;
trajanje;
cenu;
online/uživo;
dostupne gradove;
terapeute;
direktan CTA.

Na dnu:

paketi;
pravila zakazivanja;
pravila otkazivanja;
načini plaćanja;
link ka celom cenovniku.
Stranica pojedinačne usluge

Redosled sadržaja:

Naziv i kratak odgovor kome je namenjena
Cena, trajanje i format odmah uz hero
Kada ova usluga može biti dobar izbor
Kako izgleda prvi razgovor
Terapeuti koji pružaju uslugu
Online i uživo opcije
Paketi, ako postoje
Pravila zakazivanja i otkazivanja
FAQ
Sticky CTA Zakaži ovu uslugu

Ne koristiti CTA „Kontaktirajte nas da saznate više“.

9. Predlog sadržaja kartica usluga

Postoji razlika između starih cena na početnoj i poslednjih podataka koje je Anja poslala.

Poslednji dostavljeni podaci navode:

individualna psihoterapija: 4.000 RSD;
Bračno savjetovanje: 5.500 RSD;
roditeljsko savetovanje: 5.000 RSD.

Zato ne treba zadržati stare iznose 3.500 i 5.000 bez ponovne potvrde.

Individualna psihoterapija

Oznaka:

Najčešći izbor

Opis:

Prostor za lične teme, emocije, odnose i životne promene, u ritmu koji vam odgovara.

Trajanje: 60 minuta
Cena: 4.000 RSD
Format: online ili uživo

Zakaži prvi razgovor

Bračno savjetovanje

Sekundarni opis:

Partnerska podrška

Opis:

Zajednički rad na komunikaciji, bliskosti, konfliktima i obrascima koji se ponavljaju u odnosu.

Trajanje: 90 minuta
Cena: 5.500 RSD
Format: online ili uživo

Zakaži termin

Psihoterapijsko savjetovanje

Fokusirana podrška kada želite da razjasnite konkretnu životnu situaciju, odluku ili promenu.

Trajanje: 60 minuta
Cena: potrebno potvrditi
Format: online ili uživo

Saznaj više

Nemoj koristiti naziv „Psihološko savjetovanje“.

Ako nema posebne cene i jasno definisane razlike u odnosu na individualnu psihoterapiju, ovu uslugu treba spojiti sa individualnom psihoterapijom. Ne treba praviti dve gotovo identične usluge samo radi broja kartica.

Podrška adolescentima

Individualni rad prilagođen uzrastu, razvojnim potrebama i tempu mlade osobe.

Trajanje: 60 minuta
Cena: potrebno potvrditi
Format: online ili uživo
Terapeut: Marija, prema trenutno potvrđenim podacima

Pogledaj kako izgleda rad

Cena za adolescente ne treba da se izmisli, jer je ranije najavljena posebna niža cena. Kartica može biti aktivirana tek kada Anja potvrdi iznos i kriterijume.

Roditeljsko savetovanje

Podrška roditeljima u razumevanju deteta, postavljanju granica i građenju sigurnijeg odnosa.

Trajanje: 60 minuta
Cena: 5.000 RSD
Format: online ili uživo

Zakaži razgovor

Radionice i grupni programi

Vođeni programi sa jasno definisanom temom, brojem susreta, formatom i cenom.

Trajanje: prema programu
Cena: prikazana uz svaki program
Format: online ili uživo

Pogledaj programe

Cena na ovoj kartici kasnije može automatski prikazivati:

Programi od X RSD

ali samo kada najmanje jedan aktivan program ima potvrđenu cenu.

Raspored kartica

Na desktopu:

individualna psihoterapija ostaje vizuelno najveća;
ostalih pet kartica imaju istu visinu;
metadata redovi uvek imaju isto mesto;
CTA je poravnat uz donju ivicu.

Na mobilnom:

individualna je prva;
sve kartice imaju istu širinu;
featured kartica se razlikuje bojom, borderom i oznakom, ne nepraktičnom visinom;
ne koristiti hover kao jedini način otkrivanja dodatnih informacija. 10. Stranica /podrska-roditeljima

Ova stranica je opravdana jer obuhvata više različitih usluga i programa.

Struktura
Hero i kome je podrška namenjena
Brzi izbor prema uzrastu deteta
Individualno roditeljsko savetovanje
Programi za roditelje
Terapeuti
Kako izgleda prvi razgovor
Cena, trajanje i format
Najčešća pitanja
Zakazivanje

Kartice prema fazi:

Od rođenja do 3 godine
Od 3 do 7 godina
Školski period, 7–12 godina
Roditelji tinejdžera

Svaka kartica vodi ka odgovarajućem programu ili unapred popunjenom zahtevu za roditeljsko savetovanje.

11. Stranica /podrska-adolescentima

Ne treba da bude samo kartica na početnoj.

Sadržaj
Kome je podrška namenjena
Kako izgleda prvi razgovor
Oblasti podrške
Uloga roditelja ili staratelja
Privatnost i njene granice
Terapeut koji radi sa adolescentima
Trajanje, cena i format
Kako se zakazuje
Najčešća pitanja

Pravila o uzrastu, saglasnosti roditelja i privatnosti moraju biti stručno i pravno potvrđena pre objavljivanja.

12. Stranica /radionice

Ovo treba da bude katalog, a ne statična promotivna stranica.

Filteri:

Za odrasle
Za roditelje
Za adolescente
Za kompanije
Online
Uživo
Prijave otvorene
Uskoro

Svaka kartica:

naziv;
ciljna grupa;
kratak opis;
broj susreta;
trajanje susreta;
broj učesnika;
format;
terapeut/voditelj;
cena po susretu;
cena celog programa;
datum početka;
preostala mesta;
status prijave.

Statusi:

Prijave otvorene
Popunjeno
Lista čekanja
Uskoro
Završeno

Svaki program dobija /radionice/[slug] i direktnu prijavu.

13. Stranica /rad-sa-kompanijama

Ovo treba da bude kompletan B2B prodajni flow.

Redosled sadržaja
Hero
Šta kompanija može da reši
Vrste podrške
Planovi
Modeli korišćenja termina
Konfigurator
Privatnost zaposlenih
Kako izgleda saradnja
Način plaćanja
FAQ
Rezime i zahtev za ponudu
Planovi
Individualni pristup
pojedinačni voucher ili kredit;
bez pretplate;
plaćanje po korišćenju;
cena po terminu odmah prikazana.
Team Flex
zajednički fond termina;
mesečna ili tromesečna pretplata;
fleksibilno korišćenje;
prikazan broj termina i mesečna cena.
Rezervisani kapacitet
garantovani termini svakog meseca;
ugovor na 6 ili 12 meseci;
definisan prenos neiskorišćenih termina;
mesečna i godišnja cena.
Program po meri
individualni termini;
radionice;
podrška menadžerima;
edukacije;
konfigurator daje indikativnu cenu.

Umesto „Kontaktirajte nas za cenu“, kompanija popunjava konfigurator i odmah dobija:

preporučeni plan;
izabrani kapacitet;
okvirnu mesečnu cenu;
godišnju cenu;
šta je uključeno;
način plaćanja;
strukturisan zahtev za konačnu ponudu.
Načini plaćanja

Prikazati samo stvarno podržane opcije:

plaćanje po fakturi;
mesečno;
tromesečno;
godišnje unapred;
prepaid fond termina. 14. Stranica /cene

Transparentan cenovnik treba da postoji kao zasebna ruta.

Sekcije:

individualne usluge;
Bračno savjetovanje;
roditeljsko savetovanje;
adolescenti;
paketi;
radionice;
kompanijski programi;
načini plaćanja;
otkazivanje i pomeranje;
rok važenja paketa;
šta cena uključuje.

Sve kartice i stranice treba da čitaju cenu iz istog Service Catalog podatka. Cena se ne sme ručno kopirati na pet stranica.

15. Booking flow bez ponavljanja

Ruta /zakazi mora da prihvati prethodni kontekst:

/zakazi?service=individualna-psihoterapija
/zakazi?therapist=anja-stamenkovic
/zakazi?service=bracno-savjetovanje&therapist=anja-stamenkovic

U URL nikada ne stavljati ime klijenta, odgovor iz Intake-a ili druge lične podatke.

Pravila
sa kartice usluge dolazi unapred izabrana usluga;
sa profila dolazi unapred izabran terapeut;
iz Matching Engine-a dolaze usluga, terapeut i format;
korisnik može da promeni svaki izbor;
browser Back ne briše odgovore;
ne postavljati ponovo pitanje na koje je korisnik već odgovorio;
pre slanja prikazati kratak pregled;
nakon slanja prikazati sledeći korak i očekivano vreme odgovora. 16. CMS ne treba da dozvoli menjanje flow-a

Anja i tim mogu uređivati sadržaj, ali ne treba da imaju slobodan page builder koji može da pokvari navigaciju.

Mogu da menjaju
naslove;
uvodne tekstove;
opis sekcija;
FAQ;
fotografije;
SEO title i description;
status usluge;
cenu;
trajanje;
format;
lokaciju;
terapeute;
program i termine radionica.
Ne mogu direktno da menjaju
globalnu navigaciju;
redosled booking koraka;
matching algoritam;
obavezne bezbednosne napomene;
pravila privatnosti u formama;
sistemske CTA destinacije;
URL nakon objavljivanja bez redirecta;
feature gate-ove;
strukturu templejta.
CMS modeli
Service
SupportArea
Therapist
AudiencePage
Program
CompanyPlan
FAQ
StaticPage
LegalPage

Svaka vrsta sadržaja dobija kontrolisan templejt.

Publish gate

Usluga ne može postati aktivna bez:

naziva;
opisa;
cene;
trajanja;
formata;
najmanje jednog terapeuta;
booking pravila;
SEO naslova;
SEO opisa.

Program ne može postati aktivan bez:

datuma;
broja susreta;
trajanja;
kapaciteta;
cene;
formata;
voditelja;
pravila prijave.

Tako kartica „Adolescenti“ neće slučajno biti objavljena bez cene.

17. Mobile-first i accessibility pravila
    jedna primarna akcija po ekranu;
    pitanje po pitanje u Intake i booking flow-u;
    touch kontrole ciljano najmanje 44×44 px;
    jasni label elementi;
    jedna jasna H1 oznaka po stranici;
    logičan redosled H2 i H3;
    kartice ne smeju zahtevati hover;
    fokus se posle navigacije pomera na naslov;
    statusi ne zavise samo od boje;
    sticky CTA ne sme prekriti sadržaj;
    dovoljno donjeg razmaka zbog mobilnog browser bara;
    prefers-reduced-motion;
    čitljiv tekst i bez stručnog žargona.

WCAG 2.2 propisuje minimum od 24×24 CSS px za target, dok je 44×44 sigurniji cilj za mobilne interfejse. Forme moraju imati jasne labele i predvidivo ponašanje. W3C WCAG 2.2, W3C target-size guidance, W3C labels and instructions

18. Redosled realizacije
    R1.1 — Informaciona arhitektura
    zaključati route map;
    zaključati header i footer;
    definisati CTA sistem;
    definisati modele sadržaja;
    definisati vezu usluga, oblasti i terapeuta.
    R1.2 — Ključne odluke
    potvrditi nedostajuće cene;
    odlučiti da li je psihoterapijsko savjetovanje posebna usluga;
    potvrditi cenu za adolescente;
    potvrditi pravila za rad sa maloletnicima;
    potvrditi cene svih aktivnih programa;
    potvrditi B2B planove.
    R1.3 — Javni flow
    početna;
    pronađi podršku;
    usluge;
    oblasti;
    tim;
    roditelji;
    adolescenti;
    radionice;
    kompanije;
    cenovnik;
    zakazivanje.
    R1.4 — CMS templejti
    usluge;
    oblasti;
    terapeuti;
    programi;
    kompanijski planovi;
    FAQ;
    SEO;
    preview/publish workflow.

Suština je: početna usmerava, detaljna stranica objašnjava, a booking pamti kontekst. Korisnik koji tačno zna šta želi dolazi do forme jednim klikom, dok korisnik koji nije siguran dobija vođeni izbor bez email prepiske i čekanja.
