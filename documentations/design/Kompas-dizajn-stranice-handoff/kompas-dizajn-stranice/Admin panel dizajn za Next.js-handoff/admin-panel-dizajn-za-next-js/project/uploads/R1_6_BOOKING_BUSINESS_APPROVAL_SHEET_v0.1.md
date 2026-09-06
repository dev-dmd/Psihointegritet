# R1.6 BOOKING - BUSINESS APPROVAL SHEET v0.1

- **Za:** Anju i Psihointegritet tim
- **Status:** predlog za poslovni i stručni review
- **Datum:** 2026-07-22
- **Prateća tehnička verzija:** `PRE_R2_BOOKING_ENGINE_DECISION_SPEC_v0.1.md`

## Kako se koristi

Za svaku stavku je dovoljan jedan odgovor:

```text
Odobravam
ili
Želim izmenu: [kratko napišite šta menjamo]
```

Bez odgovora nijedna predložena operativna vrednost ne ulazi u produkciju. Ne tražimo od tima tehničku specifikaciju; tražimo potvrdu da predloženi način rada odgovara praksi Psihointegriteta.

## Predlog u jednoj rečenici

Korisnik bira uslugu ili prođe Intake, može videti preporuku bez ostavljanja kontakta, a kada pošalje zahtev dobija jasnu poruku da terapeut proverava dostupnost i potvrđuje termin ili predlaže drugu mogućnost.

## 1. Kako korisnik započinje zakazivanje

| Usluga / ulaz | Predlog | Šta korisnik vidi |
| --- | --- | --- |
| Individualna psihoterapija za odrasle | Bira raspoloživi termin i šalje zahtev za taj termin. | Izbor nije rezervacija; terapeut potvrđuje ili predlaže drugu opciju. |
| Bračno savetovanje | Šalje željeni period, bez izbora javnog slota. | Tim proverava trajanje, oba učesnika i raspoloživost. |
| Podrška roditeljima za odrasle | Bira raspoloživi termin i šalje zahtev. | Isti jednostavan request-first tok. |
| Team review iz Intake-a | Šalje zahtev da tim preporuči sledeći korak. | Tim određuje odgovarajućeg terapeuta. |
| Usluga bez potvrđenog terapeuta ili pravila | Nema booking CTA-a. | Jasan informativni sledeći korak, bez lažnog obećanja dostupnosti. |
| Maloletnici, radionice i B2B | Ne ulaze u početni R2 booking. | Poseban tok tek kada postoje odobrena pravila. |

**Odgovor:** `Odobravam / Želim izmenu`

## 2. Šta se dešava kada korisnik pošalje zahtev za konkretan slot

**Preporuka:** prvi validno poslati zahtev privremeno uklanja taj slot iz javne ponude dok terapeut ne odluči ili zahtev ne istekne.

Zašto: drugi korisnik ne dobija utisak da je isti termin dostupan, a timu je jednostavnije da obradi jedan jasan zahtev.

Korisnik dobija poruku:

> Poslali ste zahtev za izabrani termin. Terapeut će proveriti dostupnost i potvrditi termin ili predložiti drugu mogućnost.

**Odgovor:** `Odobravam / Želim izmenu`

## 3. Predloženi rok za pregled zahteva

| Tačka | Predlog |
| --- | --- |
| Terapeut pregleda zahtev | u roku od 12 radnih sati |
| Prvi podsetnik terapeutu | posle 4 radna sata |
| Drugi podsetnik | posle 8 radnih sati |
| Obaveštenje vlasniku / zameni | posle 12 radnih sati |
| Zahtev ističe i slot se ponovo otvara | posle 3 radna dana |

Potrebno je dopuniti: radno vreme, vikende/praznike, ko preuzima tokom odsustva i da li slot ostaje zatvoren posle probijenog roka.

**Odgovor:** `Odobravam / Želim izmenu`

## 4. Notify Me kada se slot oslobodi

**Preporuka:** korisnici koji žele da čekaju stoje u redu. Prvi dobija privatnu ponudu sa rokom od četiri radna sata. Ako ne prihvati, ponuda ide sledećoj osobi. Ne šaljemo svima istovremeno poziv da se takmiče za isti termin.

Ako neko pokuša da prihvati već preuzetu ponudu, platforma jasno kaže da je termin u međuvremenu preuzet i ponudi najbliže raspoložive opcije.

**Odgovor:** `Odobravam / Želim izmenu`

## 5. Promena i otkazivanje termina

**Predlog za promenu:** postojeći potvrđeni termin ostaje važeći dok terapeut i klijent ne prihvate novi. Ne može se slučajno izgubiti termin zato što nova opcija nije uspela.

**Potrebna poslovna odluka za otkazivanje:** koliko ranije klijent može da otkaže, šta se dešava kod kasnog otkazivanja ili nedolaska i ko može da napravi izuzetak. Sistem u R2 ne obračunava naplate, penale niti refundacije.

**Odgovor za promenu:** `Odobravam / Želim izmenu`

**Odgovor za otkazivanje:** `Odobravam / Želim izmenu`

## 6. Granice početnog R2

U početnom booking izdanju ostaju isključeni maloletnici, radionice, B2B rezervacije, paketi, pretplate, plaćanja, refundacije i fakture. Oni dobijaju zasebne politike i odobrenja pre aktiviranja.

**Odgovor:** `Odobravam / Želim izmenu`

## 7. Pre aktiviranja javnog Bookinga

Ovo nije pitanje za tehnički ili stručni tim da sam piše pravni tekst. Potrebna je pravna potvrda za obavezne potvrde pri slanju zahteva, verziju teksta, rok čuvanja booking podataka i sigurnosni izlaz. Dok to ne postoji, javni R2 Booking ne ide u produkciju.

**Vlasnik pravne potvrde i očekivani datum:**

## Završna potvrda

```text
Potvrđujem predlog R1.6 kao osnovu za R2 Booking Engine.

Ime i uloga:
Datum:
Odobravam / Želim izmenu:
Napomena ili korekcija:
```

Pisana potvrda ne zamenjuje pravni tekst ili posebnu pravnu proveru za maloletnike, obradu podataka, otkazivanje i finansijske obaveze.
