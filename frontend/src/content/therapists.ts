import type { Therapist } from "@/types/therapist";

/**
 * Single source of truth for therapist data — the team pages, the homepage
 * section, the site footer and the guided-selection drawer all read from here.
 *
 * Content is `draft` (master plan §4 R0.2) and NOT cleared for publication:
 *
 * - Titles are deliberately generic. The design handoff and the delivered bios
 *   said „pod supervizijom" for all three, which T3 records as outdated — Anja
 *   states all three are certified. Publishing either version needs each
 *   therapist's written confirmation (STOP S1 / OPEN_DECISIONS O-01).
 * - Bios are the therapists' own first-person texts, kept verbatim apart from
 *   one mandated edit: Marjan's opening sentence had „pod supervizijom"
 *   removed per §4 R0.2 („remove/neutralize any unconfirmed credential
 *   strings from staging copy"). Dialect is intentional, not a typo (decision
 *   D-017, corrects D-001's wrong assumption): Anja is from Prijedor and
 *   personally speaks/writes ijekavica — her quote, bio and cardExcerpt stay
 *   ijekavica. Marija and Marjan speak/write exclusively ekavica, matching the
 *   site-wide default (T9). Fixed service names (T1/T2, e.g. „Bračno
 *   savetovanje") never change per therapist — they are product terminology,
 *   not personal speech.
 * - Service names follow T1 („Bračno savetovanje", never „partnersko
 *   savjetovanje" / „partnerska terapija") and T2 („Psihoterapijsko
 *   savetovanje", never „psihološko savjetovanje" — a legal distinction in
 *   Serbia). The design handoff violated both.
 * - Prices are the draft ones from T7 and must always be shown as „okvirne".
 *   A null duration/price means there is no confirmed figure — never invent one.
 */
export const therapists: Therapist[] = [
  {
    slug: "anja-stamenkovic",
    name: "Anja Stamenković",
    nameAccusative: "Anju",
    firstName: "Anja",
    firstNameInstrumental: "Anjom",
    initials: "AS",
    title:
      "Osnivačica Psihointegriteta · Socijalni radnik i geštalt psihoterapeutkinja",
    badge: "Osnivačica",
    quote:
      "Vjerujem da svaka osoba nosi kapacitet za promjenu, ali da se ona događa tek kada se osjetimo dovoljno sigurno da budemo autentični.",
    formats: "Individualni rad · Rad sa parovima · Online i uživo",
    city: "Niš",
    cityLocative: "Nišu",
    areas: [
      "Anksioznost i depresija",
      "Burnout",
      "Partnerski odnosi",
      "Roditeljstvo",
      "Lični razvoj",
      "Rad na emocijama",
    ],
    services: [
      {
        title: "Individualna psihoterapija",
        duration: "60 minuta",
        price: "3.500 RSD",
      },
      {
        title: "Bračno savetovanje",
        duration: "90 minuta",
        price: "5.000 RSD",
      },
      {
        title: "Psihoterapijsko savetovanje",
        duration: "60 minuta",
        price: "3.500 RSD",
      },
      { title: "Roditeljstvo", duration: null, price: null },
    ],
    image: "/images/therapists/anja.jpeg",
    cardExcerpt:
      "Kao geštalt psihoterapeut posvećena sam stvaranju prostora u kojem ljudi mogu da zastanu, bolje razumiju sebe i pronađu način da žive u većem skladu sa sobom i drugima.",
    bio: [
      "Kao geštalt psihoterapeut posvećena sam stvaranju prostora u kojem ljudi mogu da zastanu, bolje razumiju sebe i pronađu način da žive u većem skladu sa sobom i drugima. Vjerujem da svaka osoba nosi kapacitet za promjenu, ali da se ona događa tek kada se osjetimo dovoljno sigurno da budemo autentični.",
      "U svom radu njegujem topao, podržavajući i neposredan pristup, prateći klijenta u njegovom ritmu. Geštalt terapiju doživljavam kao proces razvijanja svjesnosti, o tome šta osjećamo, kako naše tijelo reaguje, šta nam je potrebno i na koji način gradimo odnose sa drugima. Kada postanemo svjesni svojih obrazaca, otvara se mogućnost da biramo drugačije i živimo slobodnije.",
      "Posebno me zanimaju teme anksioznosti, stresa, sagorijevanja na poslu, životnih kriza, transgeneracijskih i razvojnih trauma, partnerskih odnosa i roditeljstva. Vjerujem da se dugoročna promjena ne postiže davanjem savjeta, već kroz iskustvo autentičnog kontakta i zajedničko istraživanje onoga što se dešava u sadašnjem trenutku.",
      "Pored individualnog i partnerskog rada, posljednjih godina razvijam edukativne programe za roditelje i projekte usmjerene na očuvanje mentalnog zdravlja zaposlenih, sa posebnim fokusom na prevenciju burnout sindroma. Vjerujem da je briga o mentalnom zdravlju jednako važna u porodici kao i u radnom okruženju i da prevencija može imati jednaku vrijednost kao i sama terapija.",
      "U terapijskom odnosu nastojim da budem prisutna, autentična i empatična, jer vjerujem da upravo kvalitetan kontakt predstavlja osnovu svake istinske promjene. Moj cilj je da zajedno sa klijentom stvorim prostor u kojem će moći da razvije veću unutrašnju stabilnost, slobodu izbora i povjerenje u sopstvene kapacitete.",
    ],
  },
  {
    slug: "marija-stamenkovic",
    name: "Marija Stamenković",
    nameAccusative: "Mariju",
    firstName: "Marija",
    firstNameInstrumental: "Marijom",
    initials: "MS",
    title: "Pedagog i geštalt psihoterapeutkinja",
    badge: "Adolescenti i odrasli",
    quote:
      "Verujem da svaka osoba u sebi nosi kapacitet za promenu i rast, a da je uloga terapeuta da stvori siguran odnos u kojem taj potencijal može da se razvije.",
    formats: "Individualni rad · Adolescenti i odrasli · Online i uživo",
    city: "Leskovac",
    cityLocative: "Leskovcu",
    areas: [
      "Adolescenti",
      "Samopouzdanje",
      "Emocionalne teškoće",
      "Odnosi",
      "Razvoj identiteta",
      "Rad na emocijama",
    ],
    services: [
      {
        title: "Individualna psihoterapija",
        duration: "60 minuta",
        price: "3.500 RSD",
      },
      { title: "Savetovanje adolescenata", duration: null, price: null },
      {
        title: "Psihoterapijsko savetovanje",
        duration: "60 minuta",
        price: "3.500 RSD",
      },
      { title: "Roditeljstvo", duration: null, price: null },
    ],
    image: "/images/therapists/marija.jpeg",
    cardExcerpt:
      "Više od 26 godina radim kao stručni saradnik u obrazovanju, pružajući podršku deci, adolescentima, roditeljima i nastavnicima u različitim razvojnim i životnim izazovima.",
    bio: [
      "Više od 26 godina radim kao stručni saradnik u obrazovanju, pružajući podršku deci, adolescentima, roditeljima i nastavnicima u različitim razvojnim i životnim izazovima. Kao geštalt psihoterapeut, verujem da svaka osoba u sebi nosi kapacitet za promenu i rast, a da je uloga terapeuta da stvori siguran odnos u kojem taj potencijal može da se razvije.",
      "U svom radu negujem topao, autentičan i podržavajući pristup, prateći klijenta u njegovom ritmu i pomažući mu da razvije veću svesnost o svojim osećanjima, potrebama i obrascima koji oblikuju njegov život. Posebno me zanimaju teme traume, anksioznosti, stida, gubitka, partnerskih i porodičnih odnosa, kao i ličnog razvoja. U terapijskom radu integrišem geštalt pristup sa savremenim saznanjima iz neuronauke i telesno orijentisanim perspektivama, verujući da se trajna promena događa kada povežemo ono što mislimo, osećamo i živimo.",
      "Cilj terapijskog procesa nije samo prevazilaženje teškoća, već razvoj unutrašnje stabilnosti, autentičnosti i sposobnosti da osoba gradi kvalitetnije odnose sa sobom i drugima. Nastojim da stvorim prostor u kojem će se svako osećati viđeno, prihvaćeno i dovoljno bezbedno da istraži svoja iskustva i pronađe nove načine suočavanja sa životnim izazovima.",
      "Kontinuirano se stručno usavršavam, jer verujem da kvalitetna psihoterapija podrazumeva stalno učenje i lični razvoj terapeuta. U terapijskom odnosu trudim se da budem prisutna, empatična i autentična, jer verujem da upravo kvalitetan kontakt predstavlja osnovu svake istinske promene.",
    ],
  },
  {
    slug: "marjan-jankovic",
    name: "Marjan Janković",
    nameAccusative: "Marjana",
    firstName: "Marjan",
    firstNameInstrumental: "Marjanom",
    initials: "MJ",
    title: "Psiholog i geštalt psihoterapeut",
    badge: "Individualni rad i parovi",
    quote:
      "Verujem da se najdublje promene dešavaju onda kada se osoba oseti viđenom, prihvaćenom i dovoljno sigurnom da istraži sebe bez straha od osude.",
    formats: "Individualni rad · Rad sa parovima · Online i uživo",
    city: "Leskovac",
    cityLocative: "Leskovcu",
    areas: [
      "Partnerski odnosi",
      "Emocionalna regulacija",
      "Stres",
      "Lični razvoj",
      "Samopoštovanje",
    ],
    services: [
      {
        title: "Individualna psihoterapija",
        duration: "60 minuta",
        price: "3.500 RSD",
      },
      {
        title: "Bračno savetovanje",
        duration: "90 minuta",
        price: "5.000 RSD",
      },
      {
        title: "Psihoterapijsko savetovanje",
        duration: "60 minuta",
        price: "3.500 RSD",
      },
      { title: "Roditeljstvo", duration: null, price: null },
    ],
    image: "/images/therapists/marjan.jpeg",
    cardExcerpt:
      "Psiholog i geštalt psihoterapeut, posvećen razumevanju čoveka u celini – njegovih misli, emocija, telesnih iskustava i odnosa sa drugima.",
    bio: [
      "Ja sam Marjan Janković, psiholog i geštalt psihoterapeut, posvećen razumevanju čoveka u celini – njegovih misli, emocija, telesnih iskustava i odnosa sa drugima. Verujem da se najdublje promene dešavaju onda kada se osoba oseti viđenom, prihvaćenom i dovoljno sigurnom da istraži sebe bez straha od osude.",
      "U svom radu negujem topao, autentičan i human pristup, utemeljen na stručnom znanju i poverenju koje gradim sa svakim klijentom. Pratim osobu u njenom ritmu, pomažući joj da razvije veću svesnost o sopstvenim osećanjima, telesnim reakcijama, potrebama i načinima na koje ostvaruje kontakt sa drugima. Verujem da upravo kroz povećanu svesnost nastaje prostor za izbor, promenu i lični rast.",
      "Cilj terapijskog procesa nije samo ublažavanje simptoma, već razvoj unutrašnje stabilnosti, autentičnosti i sposobnosti da osoba živi život u skladu sa sobom, umesto da njime upravljaju strah, napetost ili obrasci nastali kroz ranija životna iskustva.",
      "Posebno sam posvećen radu sa osobama koje se suočavaju sa stresom, anksioznošću, životnim krizama, razvodom, roditeljskim izazovima i traumatskim iskustvima iz prošlosti. Takođe radim sa parovima koji žele da unaprede komunikaciju, prodube međusobno razumevanje i izgrade sigurniji, kvalitetniji i emocionalno povezan odnos.",
      "Kao psiholog sa dugogodišnjim iskustvom u radu sa temama nasilja, roditeljstva, partnerskih odnosa i ličnog razvoja, verujem da svaki čovek u sebi nosi potencijal za promenu i oporavak. Moj zadatak je da obezbedim prostor u kojem će taj proces biti bezbedan, podržan i smislen.",
      "U terapijskom odnosu nastojim da budem autentičan, prisutan i empatičan, jer verujem da je upravo kvalitetan kontakt temelj svake istinske promene i ono što ima najveći isceljujući potencijal.",
    ],
  },
];

export function findTherapist(slug: string): Therapist | undefined {
  return therapists.find((therapist) => therapist.slug === slug);
}

export function otherTherapists(slug: string): Therapist[] {
  return therapists.filter((therapist) => therapist.slug !== slug);
}
