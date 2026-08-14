import type { EnPublicUi } from "@/messages/en/public";
import type { Widen } from "@/messages/types";

export const publicUi: Widen<EnPublicUi> = {
  brand: { tagline: "Digitalni centar za mentalno zdravlje" },
  navigation: {
    mainLabel: "Glavna navigacija",
    quickLabel: "Brza navigacija",
    mobileLabel: "Mobilna navigacija",
    menuLabel: "Meni",
    openMenu: "Otvori meni",
    closeMenu: "Zatvori meni",
    book: "Zakaži termin",
    links: {
      support: "Pronađi podršku",
      therapists: "Terapeuti",
      services: "Usluge",
      workshops: "Radionice",
      knowledge: "Znanje i resursi",
      compass: "Kompas",
      about: "O nama",
      parents: "Roditeljska podrška",
      prices: "Cene",
      team: "Tim",
      companies: "Rad sa kompanijama",
      contact: "Kontakt",
    },
  },
  footer: {
    description:
      "Digitalni centar za mentalno zdravlje. Psihoterapija, savetovanje, radionice i edukativni sadržaji — na jednom mestu.",
    formats: "{locations} · online i uživo",
    supportGroup: "Podrška",
    organizationGroup: "Psihointegritet",
    rights: "© 2026 Psihointegritet. Sva prava zadržana.",
    disclaimer:
      "Sadržaji na ovoj stranici imaju edukativnu svrhu i ne predstavljaju zamenu za individualni razgovor sa stručnom osobom.",
  },
  pages: {
    prices: {
      eyebrow: "Transparentne informacije",
      title: "Cene usluga i programa",
      individualServices: "Individualne usluge",
      packages: "Paketi",
      sessionPackage: "Paket od {sessions, number} individualnih seansi",
      groupPrograms: "Grupni programi",
      paymentHeading: "Plaćanje i pomeranje termina",
      paymentBody:
        "Način plaćanja i pravila otkazivanja nisu javno potvrđeni. Tačan dogovor o terminu i uslovima pravite direktno sa terapeutom.",
    },
    contact: {
      eyebrow: "Kontakt",
      title: "Kako možemo pomoći?",
      intro:
        "Za opšta i poslovna pitanja pišite nam na {email}. Za termin, vođeni izbor i programe za kompanije koristite odgovarajući put ispod.",
      appointmentTitle: "Želite termin?",
      appointmentBody: "Pošaljite zahtev za termin.",
      guidanceTitle: "Niste sigurni?",
      guidanceBody: "Pronađite podršku kroz vođeni izbor.",
      companyTitle: "Predstavljate kompaniju?",
      companyBody: "Pogledajte programe za organizacije.",
      detailsHeading: "Kontakt podaci",
      detailsBody:
        "Za opšte pitanje možete nam pisati na ovu adresu. Za zahtev za termin koristite posebnu formu za zakazivanje.",
      formats: "onlajn i uživo",
    },
    about: {
      title: "Digitalni centar za mentalno zdravlje",
      intro:
        "Psihointegritet povezuje psihoterapiju, savetovanje, edukativne sadržaje, radionice i programe ličnog razvoja — onlajn i uživo.",
      approachHeading: "Pristup",
      approachBody:
        "Rad polazi od poverljivog razgovora, tempa osobe koja se javlja i jasnih informacija o uslugama, formatu i sledećem koraku.",
      locationsHeading: "Gde radimo",
      locationsBody:
        "Onlajn rad je dostupan, a susreti uživo se dogovaraju u Chicagu (Illinois), Milwaukeeju i Madisonu (Wisconsin).",
      book: "Zakaži termin",
      teamHeading: "Tim",
      teamBody:
        "Detaljne biografije, oblasti rada i dostupni formati nalaze se na profilima svakog terapeuta.",
      meetTeam: "Upoznajte tim",
    },
    parentSupport: {
      eyebrow: "Podrška roditeljima",
      title: "Roditeljsko savetovanje i programi",
      book: "Zakaži termin",
      duration: "Trajanje",
      price: "Cena",
      format: "Način rada",
      programsHeading: "Programi prema uzrastu deteta",
      therapistsHeading: "Terapeuti",
    },
    workshops: {
      eyebrow: "Grupni programi",
      title: "Radionice i programi",
      intro:
        "Programi su najavljeni na osnovu postojećeg sadržaja. Datum, voditelj, kapacitet i pravila prijave objavljuju se tek nakon potvrde tima.",
      priceConfirmed: "Cena potvrđena",
      preparing: "U pripremi",
      details: "Pogledajte detalje",
    },
    legal: {
      eyebrow: "Pravni tekst",
      cookieTitle: "Politika kolačića",
      termsTitle: "Uslovi korišćenja",
    },
    booking: {
      eyebrow: "Zakazivanje",
      title: "Pošaljite zahtev za termin",
      intro:
        "Izaberite uslugu, terapeuta i željeni termin. Dostupnost proverava terapeut ili član tima pre konačne potvrde.",
    },
    serviceDetail: {
      breadcrumbLabel: "Putanja",
      home: "Početna",
      services: "Usluge",
      eyebrow: "Usluga",
      book: "Zakaži termin",
      audienceHeading: "Kome je namenjena",
      firstStepHeading: "Kako izgleda prvi korak",
      packagesHeading: "Paketi individualnog rada",
      sessionPackage: "Paket od {sessions, number} individualnih seansi",
      questionsHeading: "Česta pitanja",
      therapistsHeading: "Terapeuti koji pružaju uslugu",
      availabilityHeading: "Dostupnost",
      availabilityBody:
        "Rad je moguć {format}. Za rad uživo dostupne su lokacije: {locations}.",
    },
    workshopDetail: {
      breadcrumbLabel: "Putanja",
      home: "Početna",
      workshops: "Radionice",
      priceConfirmed: "Cena potvrđena",
      preparing: "Program u pripremi",
      aboutHeading: "O programu",
      aboutBody:
        "Trenutno su potvrđeni tema, ciljna grupa i broj susreta. Dodatni sadržaj programa objavljuje se nakon potvrde tima.",
      registrationHeading: "Status prijava",
      registrationBody:
        "Prijave još nisu otvorene. Datum, voditelj, kapacitet i pravila prijave biće objavljeni nakon potvrde tima.",
      askQuestion: "Postavite opšte pitanje",
    },
    legalDocument: {
      version: "Verzija {version}",
      published: "Verzija {version} · objavljeno {date}",
      pendingTitle: "Ovaj dokument je u pripremi.",
      pendingBody:
        "Tekst čeka pravnu potvrdu pre objave. Za pitanja u međuvremenu pišite nam na <email>{address}</email>.",
    },
    knowledge: {
      eyebrow: "Znanje i resursi",
      title: "Razumevanje može biti prvi korak.",
      intro:
        "Pripremamo stručne tekstove, vodiče i edukativne materijale koji mogu pomoći da bolje razumete ono kroz šta prolazite. Prvi sadržaji su u pripremi — objavljivaćemo ih postepeno.",
      preparing: "U pripremi",
      disclaimer:
        "Sadržaji imaju edukativnu svrhu i ne predstavljaju dijagnozu niti zamenu za individualni razgovor sa stručnom osobom.",
    },
    servicesListing: {
      eyebrow: "Usluge",
      title: "Podrška prilagođena vašoj situaciji",
      intro:
        "Svaka usluga jasno definiše šta uključuje, koliko traje i kome odgovara. Rad je moguć onlajn i uživo, u Chicagu, Milwaukeeju i Madisonu, u tempu koji vama odgovara.",
      details: "Detalji usluge",
      book: "Zakaži termin",
      packagesHeading: "Paketi individualnog rada",
      packagesBody:
        "Za klijente koji žele kontinuitet u radu dostupni su paketi individualnih seansi.",
      sessionPackage: "Paket od {sessions, number} individualnih seansi",
      programsHeading: "Grupni programi",
      programsBody:
        "Grupni programi namenjeni su osobama koje žele da kroz strukturisan proces, uz podršku terapeuta i grupe, rade na određenoj temi. Svaki program ima jasno definisan cilj, trajanje i broj susreta.",
      programDetails: "Pogledajte detalje",
      otherAreas: "Ostale oblasti podrške",
      guidanceTitle: "Niste sigurni koja usluga vam odgovara?",
      guidanceBody:
        "Kroz nekoliko kratkih pitanja predložićemo terapeuta i način rada koji najbliže odgovaraju onome što tražite.",
      guidanceAction: "Pomozi mi da izaberem",
    },
    team: {
      eyebrow: "Naš tim",
      title: "Ljudi s kojima ćete raditi.",
      intro:
        "Psihointegritet čine stručnjaci sa različitim iskustvima i pristupima, ujedinjeni istim principima geštalt psihoterapije — poverljivost, prisutnost i poštovanje vašeg tempa. Pogledajte pristup i oblasti rada svakog terapeuta i izaberite osobu koja vam uliva poverenje.",
      guidanceTitle: "Niste sigurni koga da izaberete?",
      guidanceBody:
        "Kroz pet kratkih pitanja predložićemo terapeuta koji najbliže odgovara onome što tražite.",
      guidanceAction: "Pomozi mi da izaberem",
    },
    therapist: {
      all: "Svi terapeuti",
      formats: "Formati rada",
      mainAreas: "Glavne oblasti",
      meet: "Upoznaj terapeuta",
      meetNamed: "Upoznaj {name}",
      otherEyebrow: "Ostali terapeuti",
      otherTitle: "Upoznajte i ostatak tima",
      book: "Zakaži termin",
      servicesAction: "Pogledaj usluge",
      approach: "Pristup i oblasti rada",
      bookWith: "Zakažite prvi razgovor sa {name}",
      firstConversation:
        "Prvi razgovor nije obaveza da nastavite terapiju. Pošaljite zahtev, a dostupnost se potvrđuje nakon provere.",
      unsure: "Nisam siguran/na",
      format: "Način rada",
      formatValue: "Onlajn ili uživo u {city} ({region})",
      contact: "Kontakt",
      generalContact: "Opšti kontakt",
      servicesHeading: "Usluge koje pruža {name}",
      details: "Detalji",
      preparing: "Informacije u pripremi",
      preparingBody: "Cena, trajanje i pravila rada se potvrđuju pre objave.",
      findSupport: "Pronađi podršku",
    },
    companies: {
      eyebrow: "Za organizacije",
      title: "Rad sa kompanijama",
      intro:
        "Radionice, edukacije i psihološka podrška za timove i zaposlene — osmišljene tako da podrže mentalno zdravlje u radnom okruženju, sa istim principima poverljivosti i stručnosti kao i naš rad sa klijentima.",
      configure: "Konfigurišite program",
      offerings: {
        workshops: {
          title: "Radionice za timove",
          description:
            "Iskustvene radionice o stresu, sagorevanju i komunikaciji, prilagođene vašem timu i tempu rada.",
        },
        education: {
          title: "Edukacije i predavanja",
          description:
            "Teme iz mentalnog zdravlja, emocionalne pismenosti i prevencije burnout-a, u formatu koji odgovara organizaciji.",
        },
        support: {
          title: "Psihološka podrška zaposlenima",
          description:
            "Individualne konsultacije i savetovanje kao benefit koji zaposlenima olakšava svakodnevni rad.",
        },
      },
      modelsEyebrow: "Modeli saradnje",
      modelsTitle: "Početni modeli za razgovor",
      modelsNote:
        "Ovo nisu konačne javne ponude. Cena, obim, kapacitet i način plaćanja potvrđuju se nakon razgovora.",
      status: { draft: "Nacrt modela", pending: "Čeka potvrdu" },
      plans: {
        individual: {
          title: "Pojedinačni pristup",
          description:
            "Za organizacije koje žele fleksibilan početak podrške zaposlenima.",
        },
        teamFlex: {
          title: "Team Flex",
          description:
            "Za timove kojima je potreban prilagodljiv spoj radionica i podrške.",
        },
        reserved: {
          title: "Rezervisani kapacitet",
          description:
            "Za organizacije koje žele da unapred razgovaraju o kontinuitetu podrške.",
        },
        custom: {
          title: "Program po meri",
          description:
            "Za kombinovane potrebe koje se definišu kroz konsultativni razgovor.",
        },
      },
      delivery: {
        flexible: {
          title: "Fleksibilni termini",
          description:
            "Format i termini se dogovaraju prema potrebama organizacije.",
        },
        reserved: {
          title: "Rezervisani kapacitet",
          description:
            "Mogućnost rezervisanog kapaciteta razmatra se kroz ponudu; broj termina i trajanje nisu javno potvrđeni.",
        },
        payment: {
          title: "Način plaćanja",
          description:
            "Način plaćanja definiše se u ponudi, nakon dogovora o obimu programa.",
        },
        privacy: {
          title: "Privatnost zaposlenih",
          description:
            "Konfigurator ne prikuplja zdravstvene podatke zaposlenih.",
        },
      },
      faqEyebrow: "Najčešća pitanja",
      faq: {
        prices: {
          question: "Da li su cene javno objavljene?",
          answer:
            "Ne. Cena, obim, kapacitet i način plaćanja potvrđuju se nakon razgovora i kroz ponudu.",
        },
        capacity: {
          question: "Da li rezervisani kapacitet važi odmah?",
          answer:
            "Ne. Rezervisani kapacitet može biti deo dogovora, ali se potvrđuje tek kroz konkretnu ponudu.",
        },
        next: {
          question: "Šta se dešava nakon konfiguratora?",
          answer:
            "Nakon kratkog upitnika tim predlaže sledeći razgovor kako bi precizirao teme, format i okvir saradnje.",
        },
      },
      processEyebrow: "Kako počinje saradnja",
      processTitle: "Tri koraka do prve radionice",
      steps: {
        contact: "Javite nam se sa kratkim opisom vašeg tima i potreba.",
        proposal: "Predlažemo format, teme i okvirni obim saradnje.",
        schedule: "Dogovaramo termine i način rada — onlajn ili uživo.",
      },
      closingTitle: "Zainteresovani za saradnju?",
      closingBody:
        "Javite nam se i predložićemo format koji odgovara vašem timu. Konkretan upitnik i ponuda stižu nakon prvog razgovora.",
    },
    companyConfigurator: {
      dialog: "Rad sa kompanijama",
      close: "Zatvori",
      back: "Nazad",
      next: "Dalje",
      progress: {
        sent: "Upit poslat",
        contact: "Kontakt",
        recommendation: "Naš predlog",
        step: "Korak {current} od {total}",
        intro: "Rad sa kompanijama",
      },
      intro: {
        title: "Kako možemo pomoći vašoj organizaciji?",
        description:
          "Kroz nekoliko kratkih pitanja predložićemo model saradnje koji odgovara veličini vašeg tima i temama koje su vam važne.",
        offer: {
          workshops: "radionice",
          talks: "predavanja i vebinari",
          counselling: "individualno savetovanje zaposlenih",
          managers: "podrška menadžerima",
          burnout: "burnout programi",
          teamBuilding: "team building radionice",
        },
        selected:
          "Izabrali ste početni model: {plan}. Kratak upitnik će pomoći da preciziramo potrebe.",
        cta: "Konfigurišite program",
      },
      questions: {
        employees: "Koliko zaposlenih imate?",
        goals: "Šta želite da organizujete?",
        topics: "Koje teme vas najviše zanimaju?",
        format: "Koji format vam odgovara?",
      },
      options: {
        size: {
          upTo20: "Do 20",
          between20And50: "20–50",
          between50And200: "50–200",
          over200: "Više od 200",
        },
        goal: {
          lecture: "Predavanje ili vebinar",
          workshop: "Radionicu",
          longTerm: "Dugoročnu saradnju",
          individualSupport: "Individualnu podršku zaposlenima",
          needsAssessment: "Procenu potreba",
        },
        topic: {
          burnout: "Burnout",
          stress: "Stres",
          communication: "Komunikacija",
          leadership: "Liderstvo",
          mentalHealth: "Mentalno zdravlje",
          psychSafety: "Psihološka sigurnost",
        },
        format: {
          online: "Onlajn",
          inPerson: "Uživo",
          combined: "Kombinovano",
          unsure: "Nismo sigurni",
        },
      },
      recommendation: {
        eyebrow: "Na osnovu vaših odgovora preporučujemo",
        teamSize: "Veličina tima:",
        employees: "{count} zaposlenih",
        topics: "Teme:",
        format: "Način rada:",
        price: "Cena",
        priceOnRequest: "Cena po ponudi",
        note: "Konačnu ponudu, obim i uslove saradnje definišemo u razgovoru, prema potrebama vaše organizacije.",
        request: "Zatražite ponudu",
      },
      models: {
        lecture: {
          name: "Predavanje ili vebinar po meri",
          description:
            "Stručno predavanje ili vebinar prilagođen vašem timu — tema, trajanje i termin po dogovoru.",
        },
        workshop: {
          name: "Interaktivna radionica za tim",
          description:
            "Iskustvena radionica prilagođena vašem timu, sa praktičnim vežbama i prostorom za razgovor.",
        },
        support: {
          name: "Program podrške zaposlenima",
          description:
            "Dugoročna saradnja koja kombinuje poverljivo individualno savetovanje zaposlenih sa edukativnim aktivnostima za tim.",
        },
        flexible: {
          name: "Fleksibilni fond individualnih termina",
          description:
            "Zaposleni poverljivo koriste individualne razgovore kada im podrška zatreba — bez uvida kompanije u sadržaj.",
        },
        assessment: {
          name: "Uvodna procena potreba organizacije",
          description:
            "Kratka procena potreba tima kao osnova za predlog daljih koraka i odgovarajućeg oblika podrške.",
        },
        custom: {
          name: "Program po meri",
          description:
            "Za veće organizacije i kombinovane potrebe program definišemo zajedno, nakon kratkog konsultativnog razgovora.",
        },
      },
      contact: {
        title: "Kontakt za ponudu",
        companyName: "Naziv kompanije *",
        contactName: "Ime i prezime kontakt osobe *",
        email: "Poslovni email *",
        phone: "Telefon",
        message: "Dodatna poruka",
        consent:
          "Saglasan/na sam da me Psihointegritet kontaktira povodom ovog upita.",
        sending: "Šaljemo…",
        submit: "Pošaljite upit za program",
        error:
          "Slanje trenutno nije uspelo. Pokušajte ponovo za koji trenutak.",
      },
      done: {
        title: "Hvala na interesovanju",
        body: "Primili smo vaš upit i okvirne zahteve. Član tima Psihointegriteta će vas kontaktirati radi potvrde potreba i pripreme konačne ponude.",
        close: "Zatvori",
      },
    },
  },
  home: {
    hero: {
      eyebrow: "Digitalni centar za mentalno zdravlje",
      title: "Stručna podrška za bolje razumevanje sebe i svojih odnosa.",
      description:
        "Psihointegritet je digitalni centar za mentalno zdravlje koji povezuje stručnu podršku, edukaciju i lični razvoj. To nije samo mesto za zakazivanje psihoterapije, već prostor u kojem možete istraživati teme koje vas zanimaju, bolje razumeti sebe i, kada budete spremni, povezati se sa stručnom osobom.",
      guidance: "Pomozi mi da pronađem podršku",
      therapists: "Upoznaj terapeute",
    },
    reasons: {
      eyebrow: "Razlozi dolaska",
      title: "Od čega želite da počnete?",
      description:
        "Ne postoji „dovoljno velik“ razlog za dolazak. Izaberite temu koja vam je najbliža — to je dovoljno za početak razgovora.",
    },
    supportPaths: {
      guidedEyebrow: "Vođeni izbor",
      guidedTitle: "Pomozite mi da suzim izbor",
      guidedDescription:
        "Kroz pet kratkih pitanja dolazite do terapeuta i formata rada koji odgovaraju upravo vama. Bez obaveze, bez unošenja ličnih podataka.",
      guidedAction: "Započni kratki upitnik",
      selfEyebrow: "Samostalni izbor",
      selfTitle: "Želim samostalno da upoznam terapeute",
      selfDescription:
        "Pregledajte profile, pristupe i oblasti rada — pa izaberite osobu koja vam uliva poverenje.",
      selfAction: "Pregledaj terapeute",
    },
    services: {
      eyebrow: "Usluge",
      title: "Podrška prilagođena vašoj situaciji",
      description:
        "Svaka usluga jasno definiše šta uključuje, kome odgovara i koji je sledeći korak.",
      firstConversation: "Zakaži prvi razgovor",
      forParents: "Za roditelje",
      preparing: "U pripremi",
      learnMore: "Saznaj više",
      book: "Zakaži termin",
    },
    therapists: {
      eyebrow: "Naš tim",
      title: "Upoznajte terapeute Psihointegriteta",
      description: "Pronađite osobu i način rada koji vam ulivaju poverenje.",
      all: "Pogledajte ceo tim",
    },
    firstSession: {
      eyebrow: "Prvi razgovor",
      title: "Prvi razgovor nije obaveza da nastavite terapiju.",
      description:
        "To je prilika da procenite da li vam terapeut i način rada odgovaraju — u svom tempu, bez pritiska.",
      action: "Pošaljite zahtev za termin",
    },
    workshop: {
      eyebrow: "Radionice · Primer radionice",
      title: "Upoznaj sebe kroz geštalt iskustvo",
      descriptionOne:
        "Iskustvena radionica namenjena svima koji žele razvijati svesnost o sebi, svojim emocijama i obrascima ponašanja.",
      descriptionTwo:
        "Kroz grupni rad, iskustvene vežbe i geštalt eksperimente učesnici imaju priliku bolje razumeti sebe, unaprediti kontakt sa drugima i istražiti nove načine reagovanja u svakodnevnim situacijama.",
      action: "Pogledajte radionice",
      soon: "Detalji uskoro",
    },
    resources: {
      eyebrow: "Znanje i resursi",
      title: "Razumevanje može biti prvi korak.",
      description:
        "Ne morate odmah imati sve odgovore niti biti spremni za psihoterapiju. Stručni tekstovi i vodiči mogu vam pomoći da bolje razumete ono kroz šta prolazite, prepoznate svoje potrebe i odlučite koji naredni korak vam najviše odgovara.",
      all: "Pogledaj sve sadržaje",
      upcoming:
        "Novi tekstovi, vodiči, audio sadržaji i edukativni materijali biće dodavani postepeno.",
      disclaimer:
        "Sadržaji imaju edukativnu svrhu i ne predstavljaju dijagnozu niti zamenu za individualni razgovor sa stručnom osobom.",
      read: "Pročitaj tekst",
    },
    faq: {
      eyebrow: "Poverenje i privatnost",
      title: "Najčešća pitanja",
      description:
        "Sve što razgovarate sa terapeutom ostaje poverljivo. Ako imate pitanje koje ovde ne vidite, slobodno nam pišite.",
      contact: "Kontaktirajte nas",
    },
    finalCta: {
      title: "Ne morate unapred znati odakle da počnete.",
      description:
        "Dovoljan je jedan korak — a mi ćemo vam pomoći da pronađete pravi.",
      support: "Pronađi podršku",
      therapists: "Pregledaj terapeute",
    },
  },
  bookingWidget: {
    brandSubtitle: "Digitalni centar za mentalno zdravlje",
    title: "Zakažite termin",
    requestNotice: "Izbor termina je zahtev; terapeut ga potvrđuje.",
    nextAvailable: "Sledeći dostupni termini",
    cancel: "Otkaži",
    notify: "Obavesti me",
    book: "Zakaži",
    online: "Onlajn",
    inPerson: "Uživo",
    formatLabel: "Način rada",
    offeringsHeading: "Usluge kod {name}",
    otherTherapists: "Ostali terapeuti",
    yourSelection: "Vaš izbor",
    back: "Nazad",
    backToRecommendations: "Nazad na preporuke",
    previousOffering: "Prethodna usluga",
    nextOffering: "Sledeća usluga",
    previousTherapists: "Prethodni terapeuti",
    nextTherapists: "Sledeći terapeuti",
    loadingOfferings: "Učitavanje usluga…",
    noOfferings:
      "Za izabranog terapeuta trenutno nema dostupnih usluga. Izaberite drugog terapeuta.",
    availabilityError:
      "Termini trenutno nisu mogli da se učitaju. Pokušajte ponovo.",
    noSlots:
      "Za izabrani dan trenutno nema slobodnih termina. Izaberite drugi datum ili zatražite obaveštenje.",
    duration: "{count, plural, one {# minut} few {# minuta} other {# minuta}}",
    calendarLabel: "Izbor datuma",
    previousMonth: "Prethodni mesec",
    nextMonth: "Sledeći mesec",
    chooseMonth: "Izaberite mesec",
    notifyEyebrow: "Raniji termin",
    notifyTitle: "Obavestite me kada se termin oslobodi",
    close: "Zatvori",
    notifyBody:
      "Izaberite popunjen budući termin. Ako se oslobodi, dobićete privatnu ponudu; kasniji zakazani termin možete zadržati.",
    noNotifySlots: "Trenutno nema popunjenih budućih termina za izbor.",
    saveNotification: "Sačuvaj obaveštenje",
    contactBack: "Nazad na izbor termina",
    name: "Ime i prezime",
    namePlaceholder: "Vaše ime i prezime",
    email: "Email adresa",
    emailPlaceholder: "vasa@adresa.com",
    phone: "Telefon",
    optional: "opciono",
    rules:
      "Upoznat/a sam sa pravilima zakazivanja i razumem da slanje zahteva ne predstavlja konačnu potvrdu termina.",
    sending: "Šaljem…",
    sendRequest: "Pošalji zahtev za termin",
    success: "Zahtev za termin je uspešno poslat",
    successDescription: "Potvrdu ćete dobiti na {email}",
    confirmationLabel: "Potvrda zahteva za termin",
    appointment: "Termin",
    details: "Podaci",
    noteLabel: "Napomena:",
    note: "Ovo još nije konačna potvrda termina. Terapeut ili član tima će proveriti dostupnost i poslati potvrdu ili predlog druge mogućnosti na adresu <email>{address}</email>.",
  },
  compass: {
    hero: {
      eyebrow: "Kompas mentalnog zdravlja",
      title: "Vaš vodič do podrške koja ima smisla za vas",
      body: "Izaberite oblast koja vam je najbliža i pogledajte sadržaje, vežbe i programe koji bi vam sada mogli biti korisni.",
      disclaimer:
        "Kompas nije test i ne postavlja dijagnozu. Ne zamenjuje razgovor sa stručnom osobom.",
      start: "Pokreni Kompas",
      skip: "Preskoči pitanja",
      notes: {
        shortLead: "Pet kratkih pitanja.",
        shortRest: "Nema tačnih i netačnih odgovora.",
        accountLead: "Bez naloga.",
        accountRest: "Odgovori ostaju na vašem uređaju.",
        stopLead: "Možete stati.",
        stopRest: "Preporuke dobijate i na osnovu dela odgovora.",
      },
    },
    always: {
      label: "Uvek dostupno",
      questions: "Pokreni pitanja",
      areas: "Vrati se na oblasti",
      topics: "Pogledaj sve teme",
      support: "Želim stručnu pomoć",
    },
    starting: {
      title: "Polazni prikaz",
      body: "Bez odgovora na pitanja, ovde su sve oblasti i teme koje trenutno postoje na platformi. Krenite od onoga što vam zvuči najbliže — pitanja možete pokrenuti kad god poželite.",
      questions: "Ipak odgovorite na pitanja",
      demo: "Demo sadržaj — prikazan je samo u lokalnom preview režimu.",
      areas: "Oblasti",
      allAreas: "Sve oblasti →",
      topics: "Aktuelne teme",
      allTopics: "Sve teme →",
      available: "Dostupno bez odgovora na pitanja",
      availableBody:
        "Javno objavljeni sadržaji, poređani redosledom iz registra.",
      emptyTitle: "Još nema objavljenih sadržaja",
      emptyBody:
        "Sadržaji se prikazuju čim budu objavljeni i povezani sa oblastima u registru.",
      topicCount: "{count} tema",
    },
    support: {
      label: "Stručna podrška",
      title: "Kada poželite razgovor",
      body: "Kompas ne bira terapeuta umesto vas. Ako želite, prenosimo samo ono što ste izabrali u obrazac za pronalaženje podrške — i pre toga vam pokažemo šta se tačno prenosi.",
      primary: "Želim stručnu pomoć",
      secondary: "Završi istraživanje",
      transfer:
        "Kontekst je prenet u Pronađi podršku. Tamo možete da ga izmenite ili uklonite pre nego što nastavite.",
    },
    quiz: {
      label: "Kompas",
      fallbackTitle: "Kompas pitanja",
      fallbackHelp: "Pitanja su opciona.",
      close: "Zatvori Kompas",
      loading: "Učitavanje Kompasa…",
      unavailable: "Kompas trenutno nije dostupan.",
      retry: "Pokušajte ponovo",
      skip: "Preskoči pitanje",
      next: "Dalje",
      back: "Nazad na prethodno pitanje",
      recommendations: "Prikaži preporuke sada",
      startingPackage: "Prikaži polazni paket",
    },
    results: {
      label: "Kompas rezultat",
      preparing: "Pripremamo prikaz…",
      loading: "Učitavamo preporuke…",
      unavailable: "Preporuke trenutno nisu dostupne.",
      retry: "Pokušajte ponovo",
      sectionEmpty:
        "Za ovaj izbor trenutno nema objavljenog sadržaja u sekciji.",
      supportBody:
        "Kompas ne rangira terapeute i ne tvrdi da je kontekst prenet pre vaše potvrde.",
      support: "Želim stručnu podršku →",
      empty:
        "Trenutno nema objavljenog sadržaja za ovaj izbor. Prikazujemo samo proverene DB rezultate.",
      edit: "Izmeni odgovore",
      reset: "Poništi izbor",
    },
    feedback: {
      title: "Da li vam je Kompas pomogao da vidite sledeći korak?",
      body: "Anketa traje oko minut i ne utiče na vaše preporuke.",
      accept: "Da, odvojiću minut",
      dismiss: "Ne sada",
    },
    preview: {
      label: "Kontrola za pregled · nije deo stranice",
      version: "Verzija {id}",
      previous: "Prethodna šema",
      next: "Sledeća šema",
    },
    lists: {
      compass: "Kompas",
      home: "Početna",
      breadcrumb: "Putanja",
      areas: "Oblasti",
      topics: "Teme",
      areasLead:
        "Pregled objavljenih oblasti koje pomažu da istražite teme i dostupne sadržaje u Kompasu.",
      topicsLead:
        "Pregled i pretraga objavljenih tema i povezanih sadržaja u Kompasu.",
      viewTopics: "Pogledaj sve teme",
      start: "Pokreni Kompas",
      noAreas: "Trenutno nema objavljenih oblasti.",
      nextTitle: "Potreban vam je sledeći korak?",
      nextBody:
        "Možete nastaviti ka izboru stručne podrške bez obzira na to gde ste završili istraživanje.",
      findSupport: "Pronađite podršku",
      searchLabel: "Pretraga tema",
      searchPlaceholder: "Npr. granice, panika, roditeljstvo…",
      clear: "Poništi",
      showAll: "Prikaži sve teme",
      noTopics: "Trenutno nema objavljenih tema.",
      noResults: "Nema tema koje odgovaraju pretrazi.",
      contentPreparing: "Sadržaji u pripremi",
      contentPreparingLower: "sadržaji u pripremi",
      openArea: "Otvori oblast {name}",
      public: "Javno dostupno",
      registered: "Za registrovane",
      open: "Otvori",
      formats: {
        article: "Članak",
        guide: "Vodič",
        exercise: "Vežba",
        program: "Program",
        workshop: "Radionica",
        video: "Video",
        audio: "Audio",
      },
    },
    detail: {
      area: "Oblast",
      topic: "Tema",
      topicsHere: "Teme u ovoj oblasti",
      areaContent: "Objavljeni sadržaji",
      topicContent: "Sadržaji uz ovu temu",
      areaEmpty: "Za ovu oblast još nema objavljenih sadržaja.",
      topicEmpty: "Za ovu temu još nema objavljenih sadržaja.",
      areaEmptyBody:
        "Prikazuju se čim budu objavljeni u registru. U međuvremenu pogledajte srodne oblasti ili zatražite stručnu podršku.",
      topicEmptyBody:
        "Pogledajte druge teme u oblasti ili zatražite stručnu podršku.",
      relatedAreas: "Srodne oblasti",
      relatedTopics: "Druge teme u oblasti",
      wholeArea: "Cela oblast: {name}",
      allAreas: "Sve oblasti",
      allTopics: "Sve teme",
      support: "Želim stručnu pomoć",
      metaTopics: "{count} tema",
      metaContent: "{count} objavljenih sadržaja",
    },
  },
  compassBanner: {
    titleSuffix: "mentalnog zdravlja",
    logoAlt: "Kompas mentalnog zdravlja",
    action: "Pokreni Kompas",
    leadFull:
      "Odgovorite na nekoliko kratkih pitanja kako bismo vam predložili sadržaje koji bi vam trenutno mogli biti korisni. Kompas nije dijagnostički alat.",
    leadCentered:
      "Nekoliko kratkih pitanja, pa vam predlažemo sadržaje i alate koji bi vam sada mogli pomoći. Bez testa, bez dijagnoze.",
    leadStrip:
      "Kratka pitanja koja vas usmeravaju ka sadržaju i alatima. Bez dijagnoze.",
    aside:
      "Pomaže vam da razumete svoju situaciju i usmerava vas ka edukativnom sadržaju i alatima.",
    durationLong: "≈ 2 minuta",
    durationShort: "oko 2 min",
    skippable: "Pitanja možete preskočiti",
    anonymous: "Anonimno",
  },
};
