# ADR-021 — Minimalni Layout Engine recept

**Status:** Accepted  
**Datum:** 2026-08-03  
**Vlasnik tehničke odluke:** Milan Dražić (CTO)  
**Vlasnik stručnih podataka:** Anja Stamenković i ovlašćeni stručni tim  
**Povezano:** D-046 · D-047 · ADR-016 · ADR-017 (+ Amandman 1) · ADR-019 · ADR-022 · `KOMPAS_TODO.md` K3A.2 i K8.6 · `CONTENT_MODEL_MATRIX_v0.1.md`

---

## 1. Kontekst

`KOMPAS_TODO.md` K3A.2 traži „minimalni Layout Engine recept pre prvog article renderer-a”. Do sada je to bilo lako odložiti, jer nijedan objavljeni tip sadržaja nije imao autorski određenu unutrašnju strukturu — svaka postojeća stranica ima fiksan JSX raspored, a autor popunjava unapred određena polja.

To se menja sa prvim člankom. CTO odluka od 2026-08-03 je da se telo članka **cepa na segmente** (uvod, pitanja za samorefleksiju, praktičan postupak, zaključak), kako bi Kompas mogao da preporuči praktični blok i nezavisno od celog teksta. Segmentacija je autorska odluka o strukturi objavljene stranice, dakle tačno ona granica zbog koje ovaj ADR postoji.

Bez zapisanog pravila, prvi segmentirani šablon tiho postaje page builder: sledeći zahtev je „hoću pitanja pre uvoda”, pa „hoću dva praktična bloka”, pa „hoću da premestim CTA” — i svaka od tih promena je jedan `if` u komponenti, a nijedna nije prošla stručni pregled kao vizuelno stanje.

Postojeće granice koje ovaj ADR nasleđuje i ne sme da olabavi:

- `SlotFieldSpec` namerno **nije rekurzivan** kroz kolekcije — jedan nivo ugnježdenja, uz obrazloženje u `modules/content/slot_schema.py:26-30`: „Unbounded nesting is the first step toward a free page builder, which D-047 explicitly rules out.”
- D-047: ne razvijamo CMS, Layout Engine i AI paralelno; prvo stabilan publishing kernel, pa jedan kompletan vertikalni tok.
- ADR-017 §12: AI sloj ima seam, ali ne objavljuje i ne piše direktno u `slot_data`.

---

## 2. Odluka

**Layout Engine v1 je registar imenovanih, verzionisanih recepata. Recept određuje koje sekcije jedan šablon sme da ima i kojim se redom renderuju. Autor bira koje su sekcije prisutne i šta je u njima — nikada kojim redom se prikazuju.**

Ovo nije engine koji sastavlja stranice. To je zapisano ograničenje nad postojećim slot modelom, sa jednim potrošačem u v1: `article_detail` recept `article-v1`, definisan u ADR-019.

---

## 3. Šta recept jeste

Recept je podatak, ne kod stranice:

| Element | Značenje |
| --- | --- |
| `recipeId` | stabilan identitet, npr. `article-v1` |
| `version` | celobrojna verzija recepta; menja se kad se menja skup sekcija ili njihov redosled |
| `sections[]` | uređena lista: `slotName`, `required`, `repeatable: false`, dozvoljeni RichDoc blokovi |
| `standaloneCapable[]` | podskup sekcija koje smeju biti preporučene nezavisno od cele stranice |

Redosled u `sections[]` **jeste** redosled renderovanja. Ne postoji polje za autorski redosled, jer bi njegovo postojanje bilo prva verzija page builder-a.

`standaloneCapable` je dozvola na nivou recepta, a ne obaveza: da bi Kompas preporučio segment samostalno, sekcija mora biti u toj listi **i** autor mora da je eksplicitno označi kao samostalno upotrebljivu na toj reviziji. Recept kaže šta je moguće; urednik kaže šta je u ovom konkretnom tekstu tačno.

---

## 4. Zašto autor ne bira redosled

1. **Pregled bi izgubio smisao.** Recenzent odobrava jednu reviziju, a ne skup permutacija. Kada je redosled autorski, odobreni tekst i objavljena stranica nisu isto stanje.
2. **Postojeće pravilo se ne bi držalo.** Jedan nivo ugnježdenja (`slot_schema.py:26-30`) postoji baš zato da struktura ostane proverljiva; autorski redosled bi tu granicu zaobišao spolja umesto iznutra.
3. **Terapeut ne treba da bude prelamač.** Ceo CMS ugovor iz D-046/ADR-016 polazi od toga da autor piše sadržaj, a sistem nosi tehničke odluke.
4. **Reverzibilnost.** Fiksan redosled se kasnije može popustiti; objavljene stranice sa proizvoljnim redosledom ne mogu se naknadno vratiti u strukturu.

---

## 5. Blokovi po sekciji

Svaka sekcija deklariše dozvoljen podskup RichDoc v1 blokova. Blok koji sekcija ne dozvoljava **ne baca se tiho** — proizvodi nalaz iz postojeće `IMPORT-0xx`/`RICH-0xx` porodice, sa `fieldPath` na sekciju, i autor odlučuje da li ga premešta ili briše. Tiho odbacivanje bi značilo da uvezeni Word dokument izgubi deo teksta bez ijedne poruke, što ADR-017 §8 već zabranjuje za uvoz.

---

## 6. Verzionisanje i dokaz

Objavljena revizija pamti `recipeId` i `version` u postojećem `validation_snapshot` polju (`modules/content/models.py:200`), istim mehanizmom kojim se već čuva ruleset dokaz pri odobrenju i objavi. Promena recepta zato ne prepisuje istoriju: stranica objavljena pod `article-v1` ostaje dokaziva i posle uvođenja `article-v2`.

Nova verzija recepta ne migrira postojeće revizije automatski. Prelazak je urednički čin — nova revizija, nov pregled.

---

## 7. Granica prema AI-ju

Recept je podatak koji odobrava tim, ne izlaz modela. Konkretno, uz ADR-017 §12 i K8.6:

- AI sme da predloži sadržaj **unutar** postojeće sekcije, kao reviewable patch nad draft revizijom;
- AI ne sme da kreira sekciju, ukloni je, promeni redosled ni izmeni recept;
- AI ne objavljuje.

---

## 8. Šta ovaj ADR ne odlučuje

- Ne uvodi vizuelni dizajn sistem ni temu; recept ne poznaje boje, razmake ni komponente.
- Ne uvodi drugi šablon — v1 ima tačno jedan potrošač (`article-v1`).
- Ne uvodi autorski redosled sekcija ni uslovno prikazivanje.
- Ne uvodi layout za postojećih šest tipova sadržaja; oni ostaju na fiksnom JSX rasporedu i ne dobijaju recept.

---

## 9. Tripwire

Prvi zahtev za bilo šta od sledećeg otvara **ADR-021 v2**, a ne ad-hoc izmenu komponente:

- autorski redosled sekcija ili uslovno prikazivanje;
- drugi šablon sa sopstvenim receptom;
- sekcija koja se ponavlja proizvoljan broj puta;
- ugnježdena sekcija unutar sekcije.

Ako se neko od ovoga pojavi u pull requestu bez ADR-a, to je regresija ove odluke, ne proširenje.

---

## 10. Odbačene alternative

| Alternativa | Zašto ne |
| --- | --- |
| Bez ikakvog recepta, segmenti kao obični slotovi | Redosled bi postojao samo u JSX-u jedne komponente. Prva izmena rasporeda ne bi imala ni ADR ni trag u reviziji, a objavljeni tekst i odobreni tekst mogli bi da se raziđu. |
| Pun Layout Engine sa autorskim rasporedom | Traži uređivanje rasporeda, pregled po permutaciji i migraciju objavljenih stranica. D-047 to izričito odlaže dok jedan vertikalni tok ne bude gotov. |
| Recept u kodu, bez verzije | Objavljena revizija ne bi mogla da dokaže po kom je rasporedu odobrena — isti problem koji `validation_snapshot` već rešava za ruleset. |
| Odložiti ADR i pustiti članak inline, bez segmenata | Bio bi to drugačiji proizvod: Kompas ne bi mogao da preporuči praktičan blok, što je bila eksplicitna stručna potreba iz Anjinog dokumenta. |
