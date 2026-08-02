# ADR-024 — Research modul: dve generičke tabele i dve odvojene ankete

**Status:** Accepted
**Datum:** 2026-08-02
**Vlasnik tehničke odluke:** Milan Dražić (CTO)
**Povezano:** **D-057** · D-021 · D-024 · ADR-016 · ADR-018 · ADR-022 · ADR-023 · MP §6.2 · `KOMPAS_TODO.md`

---

## 1. Kontekst

Postojeća anketa je bila demo: `app/api/survey/route.ts` je slao odgovore mejlom preko Resend-a i **nije čuvao ništa**. Posledica je da ne postoji ni broj odgovora, ni raspodela po pitanju, ni period — panel „Istraživanja" je prikazivao statičke `data.ts` vrednosti.

Uz to je Kompasu potreban sopstveni feedback („Da li vam je Kompas pomogao da vidite sledeći korak?"), koji je **druga anketa sa drugom svrhom**, a ne varijanta postojeće.

## 2. Odluka

**Jedan `modules/research`, dve generičke tabele, dve odvojene ankete, jedan konfigurabilan drawer, jedan panel sa tabovima.**

### 2.1 Dve tabele, ne tabela po anketi

`research_surveys` drži **jednu verziju jedne ankete**; `research_submissions` drži sve odgovore bez obzira na anketu. Dodavanje ankete je time **operacija nad podacima, ne migracija**.

`stable_id` imenuje anketu (`online-experience`, `compass-experience`), `version` numeriše set pitanja. **Verzija nije deo stabilnog ID-ja** — to je ono što omogućava da panel tab grupiše sve verzije jedne ankete, a i dalje prikazuje rezultate po verziji.

### 2.2 Privatnost je svojstvo šeme

`research_submissions` **nema** `user_id`, email, IP adresu, izabrane Kompas oblasti/teme ni recommendation rezultat. Odgovor se ne može vezati za osobu jer kolone koje bi to omogućile **ne postoje** — isto rezonovanje koje `intake_free_texts` primenjuje na osetljiv tekst.

Ni Next proxy ruta ne prosleđuje ništa osim parsiranog tela: bez zaglavlja, bez IP-ja. To je jedino mesto koje bi tiho moglo da vrati vezu ka osobi.

### 2.3 Stabilni ID-jevi, ne tekst

```json
{"answers": [{"questionId": "recommendations_relevant", "optionIds": ["partly"]}]}
```

Čuvanje labele bi značilo da promena formulacije **tiho prepisuje istoriju** odgovora, i da u tabelu koja mora ostati bez ličnih podataka ulaze slobodni stringovi.

### 2.4 `compass-experience` v1 nema slobodan tekst

`allowsFreeText: false`. Slobodno polje je mesto gde bi korisnik najlakše ostavio zdravstveni ili lični podatak, a Kompas feedback-u proza ne treba. `online-experience` zadržava opcioni komentar da postojeće ponašanje ne nestane.

### 2.5 Rezultati se ne spajaju

Panel ostaje jedna ruta `/radni-prostor/istrazivanja` sa tabovima **Pregled · Iskustvo online podrške · Iskustvo Kompasa**. Procenti se računaju **unutar jedne verzije jedne ankete**. Promenjen set pitanja je drugo merenje; prosek preko dve verzije bi prijavio broj koji niko nije izmerio.

### 2.6 Baza je autoritet, email je opcion

`app/api/survey/route.ts` je **uklonjen**. Upis u bazu je jedini put. Email obaveštenje posle uspešnog upisa može doći kasnije kao dodatak, nikad kao zamena.

---

## 3. Šta ovaj ADR NE otvara

- Nema izvoza, filtera po periodu ni Research Analytics faze — panel čita agregate koje servis već računa.
- **Nema endpointa koji vraća pojedinačnu submisiju.** Ništa nizvodno nema razlog da je vidi, a endpoint koji postoji pre ili kasnije biva pozvan.
- Nema uređivanja anketa kroz panel; nova verzija se seeduje, a objavljena se **ne menja u mestu** — izmena bi postojeće odgovore prevezala na pitanja koja nikad nisu postavljena.
- Nema veze sa recommendation-om: odgovori se nikad ne čitaju pri preporuci, što je i tvrdnja u samom banneru.
- Nema push/notifikacija (O-22 i dalje otvoren).

---

## 4. Odstupanja koja ova odluka svesno pravi

| Pravilo | Šta kaže | Zašto ipak |
|---|---|---|
| **D-021** | anketa je „throwaway frontend iza flag-a, **ne scaffolding pravih modula** — pravi moduli ostaju R2/R4/R6" | Demo je ispunio svrhu; bez upisa nema nijednog merljivog podatka, a Kompas feedback traži drugu anketu koju email tok ne može da razdvoji |
| **ADR-018** „does NOT open" | „no new backend module" | Ta lista ograničava šta *ADR-018* otvara, ne zabranjuje trajno; ovo je zaseban modul sa sopstvenom odlukom |
| **MP §3** anti-placeholder | ne pisati kod unapred | Ništa ovde nije unapred: obe ankete su seedovane, objavljene i dostupne iz UI-ja |

Ovo je **pomeranje R6 posla unapred** i tako se vodi u `TODO.md`.

---

## 5. Odnos prema ADR-023 (RLS)

Obe tabele su **`ORGANIZATION_SCOPED`** sa `organization_id NOT NULL` i FK ka `organizations` — dakle standardna polisa §7.2, bez izuzetaka. Ulaze u **rollout grupu 6**. `research_submissions` je `DERIVED_CHILD` po sadržaju, ali **već nosi sopstveni `organization_id`**, pa mu denormalizacija iz §5 ne treba.

FK `research_submissions.survey_id → research_surveys.id` je **`RESTRICT`**, ne `CASCADE`: brisanje verzije ankete ne sme tiho da obriše odgovore prikupljene na nju. Zbog toga `research_surveys` u §5.2 dobija `UNIQUE (id, organization_id)` kad composite FK bude uveden.

---

## 6. Posledice

- Migracija **`20260802_0015`** je pisana **ručno**. `--autogenerate` je uz dve nove tabele emitovao i **D19** drift, uključujući `DROP COLUMN intake_cases.age_group`, što bi na stagingu uništilo Intake podatke. Razlog je upisan u docstring migracije. **D19 i dalje traži svoju pregledanu migraciju.**
- `content/survey.ts`, `lib/api/survey.ts`, `features/research/research-drawer.tsx`, `hooks/use-survey-mutation.ts` i `app/api/survey/` su **uklonjeni**. Sa njima nestaje i progress traka tvrdo kodirana na tačno četiri koraka.
- `SurveyDrawer` je jedan konfigurabilan drawer (`surveyStableId`, `surface`, `trigger`); Kompas ga koristi kroz isti bottom-sheet shell kao i tok pitanja.
- Backend validira **svaki `optionId`** protiv objavljene šeme pre upisa. Bez toga bi klijent mogao da upiše opciju koju nijedno pitanje nije nudilo, a svaka kasnija raspodela bi tiho podbrojavala.
- `SURVEY_RECIPIENT_EMAIL` i `RESEND_FROM_EMAIL` više ne učestvuju u ovom toku.

---

## 7. Odbačene alternative

| Alternativa | Zašto ne |
|---|---|
| Tabela po anketi | Svaka nova anketa postaje migracija i novi panel kod |
| Jedna anketa sa uslovnim pitanjima | Meša dve svrhe; rezultati bi se neizbežno spojili u jedan procenat |
| Verzija u `stable_id` (`compass-experience-v1`) | Panel više ne može da grupiše verzije iste ankete, a svaka izmena pitanja pravi „novu anketu" u izveštaju |
| Čuvanje teksta pitanja i odgovora | Promena formulacije prepisuje istoriju; slobodan tekst ulazi u tabelu koja mora ostati bez ličnih podataka |
| Zadržati email uz upis | Dva autoriteta za isti podatak; email ostaje moguć kao obaveštenje posle upisa |
| `CASCADE` na `survey_id` | Brisanje verzije ankete tiho briše prikupljene odgovore |
