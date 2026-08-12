# Handoff — Usluge i cene: katalog + Wizard „Dodaj uslugu"

**Obim:** ekran `/radni-prostor/usluge` (read model katalog + stalno vidljivo dugme **+ Dodaj uslugu**), **Wizard za kreiranje usluge** (5 koraka, draft-first) i **dijagnostički panel** ispod kartica.
**Vizuelna referenca:** `Psihointegritet Control Center.dc.html` → Usluge i cene (klikni **+ Dodaj uslugu**; wizard je desni drawer na desktopu, bottom sheet ispod 1024px).
**Tokeni i opšta pravila:** `tailwind.config.ts`, `globals.css`, `README.md`.

---

## 1. Model podataka — obavezno razdvajanje

Četiri entiteta se **ne spajaju** ni u UI-ju ni u API-ju. UI ih imenuje eksplicitno (naslovi sekcija u kartici i u wizardu nose imena entiteta) jer to sprečava da se cena „zalepi" na uslugu.

| Entitet | Šta predstavlja | Primeri |
|---|---|---|
| **Service** | Vrstu podrške ili programa | Individualna psihoterapija · Partnersko savetovanje · Savetovanje adolescenata · Podrška roditeljima · Radionica · Program za kompanije |
| **ServiceOffering** | Konkretnu dostupnu kombinaciju: organizacija + usluga + terapeut + format + lokacija + trajanje + buffer + booking režim + booking policy | „Anja · online · 60 min + 15 · puni sat · otkazivanje 24h" |
| **PriceVariant** | Cenu pojedinačne usluge za određeni kriterijum | standardna · studentska · kompanijska · promotivna · druga kontrolisana varijanta |
| **CommercialOffer** | Komercijalni paket koji klijent kupuje | pojedinačna seansa · paket 5× · paket 10× · mesečni program · radionica · kompanijski plan |

Pravila koja UI mora da čuva:
- Jedan **Service** ima **N ServiceOffering-a** — po jedan za svaku kombinaciju terapeut/format/lokacija. Dodavanje terapeuta ne menja Service, kreira novi Offering.
- **PriceVariant** visi o Service-u (ili Offering-u kada se cene razlikuju po formatu), nikad o CommercialOffer-u.
- **CommercialOffer** referiše Service + broj seansi/period; cena paketa je samostalna i **nije** suma PriceVariant-a.
- Booking engine čita **Offering** (dostupnost, trajanje, policy), naplata čita **CommercialOffer**, javni cenovnik čita **PriceVariant**.

```ts
type ServiceStatus = "draft" | "in_review" | "active" | "coming_soon" | "unavailable" | "archived";

interface Service { id: string; orgId: string; name: string;          // javno vidljiv naziv
  kind: "individualna" | "partnersko" | "adolescenti" | "roditelji" | "radionica" | "kompanije";
  code: string;                                                        // interna šifra, unique per org
  status: ServiceStatus; intakeAudience: string[];                     // oblasti iz Intake-a
  createdBy: string; createdAt: string; updatedAt: string; }

interface ServiceOffering { id: string; orgId: string; serviceId: string; therapistId: string;
  format: "online" | "in_person"; locationId: string | null;
  durationMinutes: 45 | 60 | 90 | 120; bufferAfterMinutes: 0 | 15 | 30;
  bookingMode: "hourly_grid" | "flexible_30" | "manual_slots";
  bookingPolicyId: string; active: boolean; }

interface PriceVariant { id: string; serviceId: string; offeringId?: string | null;
  criterion: "standard" | "student" | "company" | "promo" | "custom";
  label: string; amountRsd: number | null;                             // null = „na upit"
  validFrom?: string; validUntil?: string; }

interface CommercialOffer { id: string; serviceId: string;
  kind: "single" | "package" | "monthly" | "workshop" | "company_plan";
  label: string; sessions?: number; periodMonths?: number;
  amountRsd: number | null; expiresAfterDays?: number; }

interface BookingPolicy { id: string; label: string;                   // „Otkazivanje 24h"
  cancellationNoticeHours: number; requiresManualConfirmation: boolean;
  minLeadTimeHours: number; minAge?: number; }
```

---

## 2. Ekran `/radni-prostor/usluge` (read model)

### 2.1 Header

Naslov **Usluge i cene** (serif 34px / mobilno 27px), podnaslov „Centralni katalog iz kojeg Booking i Matching engine čitaju podatke."
Desno: **`+ Dodaj uslugu`** — `.btn-primary` (forest, pill, ikona plus 15px, min-h 46px). **Stalno vidljivo** — i na mobilnom (ne `hidden lg:inline-flex`); na širinama < 480px ide u novi red, puna širina. Ovo je jedini ulaz u kreiranje; nema plus-a u quick action sheetu za usluge.

### 2.2 Kartica usluge — 5 slojeva, tim redom

`.card rounded-card p-[24px_26px] flex flex-col gap-[14px]`, grid `grid-cols-2 gap-[14px]` (mobilno 1 kolona).

1. **Zaglavlje** — eyebrow `Service · {kind}` (sage), naziv (serif 22px), šifra (mono 11.5px, `ink-45`), status bedž desno (`badge-*` iz §6 README-a; `Nacrt`, `Na pregledu`, `Aktivna`, `U pripremi`).
2. **ServiceOffering** — eyebrow + brojač („3 ponude"); po ponudi red u `bg-meadow/14 rounded-tile p-[10px_13px]`: prvi red `terapeut · format · lokacija` (13.5px/600), drugi `trajanje + buffer pauze · režim · policy` (12px, `ink-55`). Bez ponuda → tekst u `st-wait`: „Nema dodeljenog terapeuta — usluga se ne može aktivirati."
3. **PriceVariant** i **CommercialOffer** — dve kolone; varijante kao meadow chips `{label} · {cena}`, ponude kao warm chips. Prazno = kolona bez chipova (bez placeholder teksta).
4. **Intake publika** — neutralni chips (`bg-coffee/5`).
5. **Footer** — `Ručna potvrda: Da/Ne` · `Otkazivanje: 24h`; kod drafta desno **`Nastavi unos →`** (primary, otvara wizard na sačuvanom koraku).

Redosled liste: **draftovi prvi** (najnoviji na vrh), pa aktivne usluge — korisnik vidi nedovršen posao bez traženja.

### 2.3 Dijagnostički panel (ispod kartica)

Kartica `rounded-panel`, eyebrow **„Dijagnostika kreiranja usluge"**, podnaslov „Mockup provere toka — pokreće se ručno, ne dira podatke.", desno **`Pokreni provere`**; dok radi → spinner + „Provere u toku…".

Red testa: grid `22px 1fr auto` — **krug** levo, naziv testa (14px/600, boja prati stanje), mono opis ispod, status desno.

| Stanje | Krug | Boja teksta | Status |
|---|---|---|---|
| Nije pokrenut | prazan krug 15px, `border-2 border-coffee/16` | `ink-45` | „Nije pokrenut" |
| Izvršava se | isti krug + `border-t-[#96562F]` + `animate-spin` (0.8s linear) | `st-wait` | „Izvršava se…" |
| Prošao | krug 19px `bg-meadow/50` + check ikona | `st-ok` | „Prošao" |

Testovi (redom, sekvencijalno ~540ms po testu — **mockup, bez pravih poziva**):

1. **Prikaz konflikta šifre** — `IND-60 je zauzeta → predlog IND-60-2`
2. **Čuvanje minimalnog drafta** — `Naziv + tip usluge → status Nacrt`
3. **Nastavak nedovršenog drafta** — `Wizard se otvara na koraku 3 od 5`
4. **Promena taba preko URL-a** — `?korak=cene otvara korak Cene`
5. **Dodavanje cenovne varijante** — `Studentska · 2.800 RSD → PriceVariant`
6. **Dodavanje paketa** — `Paket 5× · 16.000 RSD → CommercialOffer`

U produkciji: zameniti mock sekvencu pravim smoke testovima (Playwright ili API health-check po koraku); UI ostaje isti, samo se rezultat puni iz odgovora. Panel je vidljiv samo ulozi **vlasnik**.

---

## 3. Wizard „Dodaj uslugu"

**Forma:** desni drawer 560px (`shadow-drawer`, `animate-drawer`); < 1024px full-width **bottom sheet** (radius 26px gore, grab handle, `animate-sheet`, max-h 92vh, scroll). Scrim `bg-coffee/50`, klik zatvara (uz upozorenje ako ima nesačuvanih izmena).

**Zaglavlje:** eyebrow `Nova usluga` / `Nastavak drafta`, naslov = uneti naziv ili „Nova usluga", `×` zatvara.
**Stepper:** 5 krugova + labele — `1 Usluga · 2 Ponuda · 3 Cene · 4 Intake · 5 Aktivacija`; aktivan forest, završen `meadow/50` sa zelenim brojem, budući `coffee/7`. Klik na krug skače na korak (nema forsiranog linearnog toka).
**Footer (sticky u sheetu):** `← Nazad` (od koraka 2) · **`Sačuvaj draft`** (dashed, **uvek dostupan**) · `Sledeći korak →`. Na koraku 5 umesto „Sledeći": `Aktiviraj uslugu` (primary) + `Pošalji na pregled` (outline).

**URL stanje:** `?wizard=1&korak=usluga|ponuda|cene|intake|aktivacija` (+ `&draft={id}` za nastavak). Refresh i deep-link moraju da otvore isti korak — to je test 4.

### Korak 1 · Usluga (Service)

- **Naziv usluge** — text input, „javno vidljiv"; jedino polje koje korisnik peče slobodno.
- **Tip usluge** — pill izbor iz 6 vrednosti (§1). Obavezan za draft.
- **Interna šifra** — read-only prikaz (mono 17px) koji **sistem generiše** iz naziva + trajanja: prve 3 slova prvog reči (transliteracija č/ć/đ/š/ž → c/c/d/s/z) + `-` + trajanje → `Individualna psihoterapija` 60 → **`IND-60`**.
  - Provera zauzetosti u realnom vremenu nad `Service.code` unutar organizacije. Slobodna → `badge-ok` „Šifra je slobodna"; zauzeta → `badge-wait` „Šifra je zauzeta" + warm blok: „Šifra je već u upotrebi. Predlog: **IND-60-2**" + dugme **`Koristi predlog`** (inkrement `-2`, `-3`… do prvog slobodnog).
  - Kad korisnik prihvati predlog ili ručno izmeni šifru, prestaje auto-generisanje (`codeManual = true`) — kasnija promena naziva ne pregazi izbor.
  - Server ponovo validira unique (`409` → prikaži isti konflikt blok; **ne** tiho preimenuj).
- Napomena: „Naziv i tip su dovoljni za minimalni draft — ostalo možete dopuniti kasnije."

### Korak 2 · Ponuda (ServiceOffering)

Explainer kartica: „**ServiceOffering** = usluga + terapeut + format + lokacija + trajanje + buffer + režim + policy. Svaki terapeut dobija svoju ponudu."

Pill grupe: **Trajanje** (45/60/90/120 min) · **Format** (Online / Uživo / Online i uživo) · **Lokacija** (prikazuje se samo kad format nije Online: Niš · Obrenovićeva / Kod kompanije / Bez lokacije) · **Pauza posle termina** (0/15/30 min) · **Booking režim** (Puni sat / Fleksibilno 30 min / Ručno biram termine) · **Booking policy** (Otkazivanje 24h / 48h / Ručna potvrda) · **Dodeljeni terapeuti** (multi-select).

Na snimanju: za svakog izabranog terapeuta kreira se **jedan Offering** sa istim parametrima; kasnija pojedinačna izmena je moguća iz kartice usluge (van obima ovog ekrana). „Ručno biram termine" postavlja `requiresManualConfirmation = true` u prikazu kartice („Ručna potvrda: Da").

### Korak 3 · Cene (PriceVariant + CommercialOffer)

Dve sekcije razdvojene linijom, obe po istom obrascu **kriterijum (pills) → cena (input) → `+ Dodaj` → lista chipova sa `×`**:

- **PriceVariant** — „Cena pojedinačne usluge za određenu grupu klijenata." Kriterijumi: Standardna / Studentska / Kompanijska / Promotivna. Bez ni jedne varijante: crvenkasta napomena „Bez najmanje jedne cenovne varijante usluga ne može da se aktivira."
- **CommercialOffer** — „Ono što klijent zaista kupuje: seansa, paket, mesečni program, radionica ili kompanijski plan." Tipovi: Pojedinačna seansa / Paket 5× / Paket 10× / Mesečni program / Radionica / Kompanijski plan. Prazna cena → `Na upit`.

Validacija: iznos je ceo broj RSD (bez decimala), duplikat istog kriterijuma se ne dodaje dva puta (drugi unos menja prvi, uz toast).

### Korak 4 · Intake publika

Multi-chips iz Intake taksonomije (Anksioznost, Burnout, Partnerski odnosi, Adolescenti, Roditeljstvo, Kompanije, Lični razvoj). Napomena (meadow): „Povezivanje je pomoć pri usmeravanju — ne prikazuje se klijentu kao dijagnoza ni kao obavezujuća preporuka."

### Korak 5 · Aktivacija (Readiness)

**Readiness kartica:** procent (serif 21px) + `x / 9`, progress traka (`sage`), pa 9 redova sa tačkom (`st-ok` / `st-wait`) i statusom `Uneto` / `Nedostaje`:

`Naziv usluge` · `Tip usluge` · `Slobodna šifra` · `Trajanje i format` · `Dodeljen terapeut` · `Booking policy` · `Cenovna varijanta` · `Komercijalna ponuda` · `Intake publika`

Ispod: „Nedostaje: …" (spisak malim slovima) ili „Svi obavezni podaci su uneti — usluga može da se aktivira."

**Kartica sažetka entiteta** — po jedan red za `Service` / `ServiceOffering` / `PriceVariant` / `CommercialOffer` (mono ime entiteta + vrednost + kratko objašnjenje). Ovo je poslednja provera da korisnik razume šta pravi.

**Capability:**
| Uloga | Ponašanje |
|---|---|
| Vlasnik | `Aktiviraj uslugu` aktivna kad je readiness 100%; nota „Vaša uloga može direktno da aktivira uslugu." |
| Terapeut | `Aktiviraj` je vizuelno onemogućena (`bg-coffee/12`, `text-coffee/40`), klik daje toast „Aktivaciju odobrava vlasnica centra."; koristi `Pošalji na pregled` → status **Na pregledu** |

`Pošalji na pregled` zahteva „core" set: naziv + tip + slobodna šifra + terapeut + ≥1 cena. Nedovoljno → toast „Unesite naziv, tip, terapeuta i najmanje jednu cenu."

---

## 4. Tok stanja i draft ponašanje

```
[+ Dodaj uslugu] → korak 1 … 5
   ├─ Sačuvaj draft  (u svakom trenutku, i sa samo nazivom+tipom) → status draft → lista
   ├─ Pošalji na pregled (core set)                              → status in_review → lista
   └─ Aktiviraj (readiness 100% + capability)                    → status active → lista + javni katalog
Kartica drafta → [Nastavi unos →] → wizard na sačuvanom koraku (draftStep)
```

- **Draft je prvoklasan zapis:** posle `Sačuvaj draft` usluga se **odmah pojavljuje u pravom read modelu liste** sa bedžom `Nacrt` — ne u nekom odvojenom „nedovršeno" ekranu.
- Draft pamti **korak** na kojem je prekinut (`draftStep`) i sve unete vrednosti; nastavak ne traži ponovni unos.
- Autosave: pri prelasku između koraka snimaj tiho (PATCH), tako da zatvaranje taba ne gubi rad; `Sačuvaj draft` je eksplicitna potvrda + izlaz.
- Toast potvrde: „Draft je sačuvan — nalazi se u listi kao Nacrt." / „Usluga je poslata na pregled." / „Usluga je aktivirana i vidljiva u katalogu."
- Nikad ne aktivirati uslugu bez Offering-a i cene — javni booking bi prikazao uslugu bez termina i bez cene.

**Predlog endpoint-a:** `GET /services` (read model sa offerings/variants/offers/intake) · `POST /services` (minimalni draft: name+kind) · `PATCH /services/{id}` · `GET /services/code-check?name=&duration=` · `POST /services/{id}/offerings` · `POST /services/{id}/price-variants` · `POST /services/{id}/commercial-offers` · `POST /services/{id}/submit-review` · `POST /services/{id}/activate` (403 bez capability).

---

## 5. Mobilno

- `+ Dodaj uslugu` puna širina ispod naslova; wizard = bottom sheet sa grab handle-om i sticky footerom; stepper labele ostaju (kratke su), krugovi 24px.
- Pill grupe se wrap-uju; sve mete ≥ 44px; input font ≥ 14.5px (bez zooma na iOS-u).
- Kartice usluga u jednoj koloni; PriceVariant/CommercialOffer kolone se stakuju.
- Dijagnostički redovi ostaju grid `22px 1fr auto` (status desno se skraćuje na „Prošao").

---

## 6. Acceptance kriterijumi

- [ ] `+ Dodaj uslugu` je vidljivo na svim širinama i jedini ulaz u kreiranje.
- [ ] Šifra se generiše iz naziva + trajanja, transliterira dijakritike i menja se dok se naziv piše (dok korisnik ne preuzme kontrolu).
- [ ] Konflikt šifre prikazuje predlog i `Koristi predlog`; server 409 prikazuje isti blok bez tihe promene.
- [ ] „Sačuvaj draft" radi samo sa nazivom + tipom; usluga se pojavljuje u listi kao `Nacrt` na vrhu.
- [ ] `Nastavi unos →` otvara wizard na sačuvanom koraku sa svim unetim vrednostima.
- [ ] `?wizard=1&korak=cene` otvara direktno korak 3; refresh čuva korak.
- [ ] Dodavanje varijante i paketa pravi **odvojene** zapise (PriceVariant vs CommercialOffer) i vidi se u kartici u odvojenim kolonama.
- [ ] Readiness pokazuje 9 provera i tačno imenuje šta nedostaje; aktivacija je nedostupna dok nije 100%.
- [ ] Terapeut ne može da aktivira; dobija objašnjenje i put „Pošalji na pregled".
- [ ] Lista, kartica i javni katalog čitaju iz istog read modela (nema duplog izvora istine).
- [ ] Dijagnostički panel prolazi kroz 3 stanja po testu i ne menja podatke.
