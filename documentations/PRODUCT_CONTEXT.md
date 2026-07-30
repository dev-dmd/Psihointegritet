# Psihointegritet — Product Context

> **Status: context reference, not binding.** Per `PRODUCT_DECISIONS.md` D-002 (2026-07-17), only four documents are binding: `CLAUDE_CODE_MASTER_PLAN_v1_0.md`, `Psihointegritet_Razvojni_Proposal_v1_1.docx`, `IZMENE_POSTOJECEG_PROJEKTA_v1_0.md`, and `ARCHITECTURAL_RULES_REVISED.md`. Their read-first order of authority (master plan §0) governs, not the list below. This document is retained as product-context background — audiences, journeys, content model, MVP scope — useful for orientation, but any point that conflicts with the four binding documents or with `PRODUCT_DECISIONS.md` loses. Where this document is silent or ahead of a binding decision (e.g. guest access, LGBTQIA+ inclusion, eligibility), record a proposal in `OPEN_DECISIONS.md` rather than treating this file as authoritative.
>
> The earlier v0.2 of this document was archived (`archive/PRODUCT_CONTEXT.md`) for using non-canonical service terminology and for asserting its own competing order of authority. This v0.3 corrects the terminology (T1/T2) but is filed here as context, not reinstated as authority #2.

**Status:** Context / product-background document (see notice above)  
**Version:** 0.3
**Updated:** 2026-07-23 — guest access, inclusive LGBTQIA+ support, booking eligibility and five-area content map
**Audience:** Product owner, therapists, developers, Claude Code, Codex, designers, QA and future collaborators  
**Scope:** Product definition, user experience, content architecture, MVP boundaries and decision context

---

## 1. Purpose of this document

This document is background product context for Psihointegritet, not the canonical decision source (see status notice above).

It exists so that every person or AI coding agent working on the project understands:

- what Psihointegritet is and is not;
- who it serves;
- which user problems it solves;
- how the first product should work;
- which product and content decisions are already confirmed;
- which information is still draft or open;
- what belongs in the MVP;
- what must remain possible later without overbuilding now;
- which ethical, privacy and safety constraints shape technical decisions.

This document does not override or replace:

- `CLAUDE_CODE_MASTER_PLAN_v1_0.md`, `Psihointegritet_Razvojni_Proposal_v1_1.docx`, `IZMENE_POSTOJECEG_PROJEKTA_v1_0.md`, `ARCHITECTURAL_RULES_REVISED.md` — the four binding documents (master plan §0);
- `technical-documentation-architecture-v0.3.md` — system architecture and technology decisions;
- design handoff files — visual implementation details;
- legal documents — privacy policy, terms, consent and regulatory review.

Do not silently resolve a material conflict between this document and the binding four. Record the conflict in `OPEN_DECISIONS.md` and request a product decision from the CTO.

---

## 2. Product definition

Psihointegritet is a **digital mental-health center in our language**.

It is not only a therapist directory or appointment-booking system. It combines:

- individual psychotherapy;
- couples counseling;
- psychological counseling;
- educational content;
- workshops;
- group programs;
- personal-development programs;
- a guided path toward appropriate support.

The first release represents **Psihointegritet and its existing therapist team**. It is not an open therapist marketplace in the MVP.

### Working product statement

> Psihointegritet helps adults, couples, parents and later adolescents find understandable, professional support in their own language through verified information, therapist profiles, services, programs and simple appointment booking.

### Mission

Make mental-health support more accessible, understandable and less stigmatized, while preserving professional boundaries, privacy and user dignity.

---

## 3. Product principles

### 3.1 Start from the user's reason for coming

Users should not need to know:

- a diagnosis;
- a psychotherapy school;
- a clinical term;
- which therapist they need.

The product starts from familiar life situations and reasons for seeking support.

### 3.2 Support choice, do not diagnose

The guided-selection flow helps narrow options based on declared preferences and therapist availability.

It must not:

- diagnose;
- assess clinical risk;
- claim to identify the „best" therapist;
- replace professional assessment;
- generate psychological conclusions.

### 3.3 Build trust before asking for commitment

A first-time visitor should be able to:

- understand the center;
- explore support areas;
- read therapist profiles;
- review services and prices;
- view available times;
- read educational content;
- use basic guided selection;
- download public PDF resources and use public audio/video resources;
- submit an appointment request;
- submit interest or an application for a public workshop or group program;

without creating an account.

An appointment request is not a confirmed appointment. A workshop/program application is not a confirmed enrollment or reserved place. Registration is requested when the user accepts a confirmed booking, completes an enrollment that needs payment or protected access, saves protected content or accesses a personal area.

### 3.4 A smaller complete product is better than a broad unfinished platform

The MVP should feel complete and professional, even with limited features and content.

Do not expose empty future modules merely to make the product appear larger.

### 3.5 Human professional authority remains primary

The product may help with navigation, administration and education. It does not replace therapists or clinical judgment.

---

## 4. Initial audiences

### 4.1 Primary MVP audiences

- adults seeking individual psychotherapy;
- couples seeking relationship support;
- parents seeking professional guidance;
- Serbian/Bosnian/Croatian-speaking people in the diaspora;
- existing Psihointegritet clients who need quick repeat booking.

Psihointegritet explicitly welcomes LGBTQIA+ people without stigma. LGBTQIA+ identity is not a separate service, price, eligibility class or mandatory booking field. It is represented through inclusive public language, a visible support area and therapist-declared professional capability where applicable.

### 4.2 Later audiences

- adolescents;
- companies and employees, especially around burnout and workplace mental health;
- participants in structured online programs;
- therapists and centers outside the first Psihointegritet team.

### 4.3 Adolescent support

Adolescent content and services are strategically important but must not be treated as a normal adult-user extension.

Before activation, the project requires:

- legal review of consent and guardian access;
- safeguarding procedures;
- crisis/escalation protocols;
- age-appropriate UX and content;
- clearly defined therapist responsibilities.

The controlled intake boundary distinguishes:

- adults, who may use the normal self-service request path;
- parents/guardians, who provide their own contact data and the minimum age/consent context;
- adolescents aged 16–17, who may use only the restricted feature-flagged path without unrestricted free text and with team review;
- people under 16, who do not receive a public self-service service/price/therapist/slot path and are routed to controlled team review.

Production activation still requires legal and professional confirmation of consent, safeguarding, escalation, age-appropriate UX/content and therapist responsibilities. The existence of public adolescent content does not activate unrestricted adolescent booking.

---

## 5. Initial organization and team

### Organization

**Psihointegritet**

Psihointegritet is the first organization/tenant. Therapists are members and service providers within that organization.

### Initial therapists

- Anja Stamenković;
- Marija Stamenković;
- Marjan Janković.

All biographies, qualifications, photographs, services and prices are draft until confirmed by the product owner and the individual therapist.

### Production rule for profile images

Do not publish stock portraits under real therapist names.

For staging, use:

- initials;
- neutral placeholders;
- clearly labeled temporary preview images.

Production requires authentic approved photographs.

---

## 6. Initial service catalog

### Confirmed draft services

- Individual psychotherapy
- Bračno savetovanje
- Psihoterapijsko savetovanje
- Controlled adolescent support request
- Parenting support
- Workshops
- Group programs
- Online education

### Initial draft prices

| Service                     | Duration | Draft price | Format               |
| ---------------------------- | -------: | ----------: | -------------------- |
| Individual psychotherapy    |   60 min |   3,500 RSD | Online or in person  |
| Bračno savetovanje          |   90 min |   5,000 RSD | Online or in person  |
| Psihoterapijsko savetovanje |   60 min |   3,500 RSD | Online or in person  |

Prices are provisional until explicitly approved.

> **Note:** these are the original draft prices. `PRODUCT_DECISIONS.md` D-025 (2026-07-19) supersedes them — live catalog is Individual 4,000 RSD, Bračno savetovanje 5,500 RSD/90min, and "Psihoterapijsko savetovanje" was removed as a separate priced item, replaced by "Roditeljsko savetovanje" (5,000 RSD/60min). See `frontend/src/content/services.ts` for the current live catalog.

### Terminology decision

Use **„Bračno savetovanje"** as the primary public MVP term. „Partnerska podrška" may be used descriptively, but does not create a second service.

Do not publish „bračna psihoterapija" or „psihološko savetovanje" as service labels. Use the confirmed term **„psihoterapijsko savetovanje"** where that service category is required.

### Parenting status

„Parenting" is currently a support area, not yet a fully defined bookable service.

Before it becomes a service, define:

- target user;
- service format;
- duration;
- price;
- whether it is one-to-one counseling, a workshop or a structured program;
- which therapists provide it.

---

## 7. Reasons for seeking support

These are not diagnoses. They are user-facing entry points, content topics and guided-selection criteria.

The first public content map uses five broad support paths:

1. **Nemir, strah i preopterećenost** — anksioznost, stres, burnout, panični napadi, zabrinutost, emocionalna regulacija, opuštanje and work–life balance.
2. **Energija, navike i odnos prema sebi** — samopouzdanje, granice, identitet, perfekcionizam, motivacija, organizacija svakodnevice, lični razvoj, briga o sebi and navike.
3. **Gubitak, promene i životne krize** — žalovanje, gubitak bliske osobe, prekid veze, razvod, preseljenje, promena posla, tranzicioni periodi and suočavanje sa promenama.
4. **Ljubav, partnerstvo i porodični odnosi** — komunikacija, konflikti, bliskost, poverenje, ljubomora, partnerske krize, porodični odnosi and razvod.
5. **Roditeljstvo i odrastanje** — trudnoća, postpartalni period, roditeljstvo 0–3, roditeljstvo 3–7, školski uzrast, adolescenti, razvoj deteta, igra i razvoj and roditeljske dileme.

**LGBTQIA+ podrška** is a visible, equal support area and a cross-cutting content context, not a diagnosis or segregated service. It may connect to several of the five paths and to therapist profiles whose capability has been explicitly confirmed.

Therapists may be associated with multiple topics. A topic association means relevant experience or declared area of work; it does not mean that only that therapist can work with that topic.

---

## 8. Primary user journeys

### 8.1 Guided choice

```text
Homepage
→ „Pomozi mi da pronađem podršku"
→ short guided-selection flow
→ 2–4 relevant therapist/service options
→ therapist profile or service page
→ available appointment
→ minimum contact and consent data
→ appointment request
→ therapist confirmation or alternative proposal
→ account/verification only when required for the confirmed service
```

### 8.2 Independent therapist choice

```text
Homepage
→ „Upoznaj terapeute"
→ therapist list
→ therapist profile
→ service
→ available appointment
→ minimum contact and consent data
→ appointment request
→ therapist confirmation or alternative proposal
```

### 8.3 Topic-first exploration

```text
Homepage
→ reason for seeking support
→ topic page
→ explanation + related content + relevant therapists/services
→ booking or continued reading
```

### 8.4 Existing client

```text
Homepage/Header
→ „Zakažite naredni termin"
→ sign in
→ existing therapist/service
→ available appointment
→ confirmation
```

### 8.5 Education-first visitor

```text
Homepage
→ knowledge and resources
→ article / guide / workshop
→ related topic
→ therapist, service or enrollment CTA
```

Not every visitor must become a booking immediately. Educational content is a valid first product outcome.

---

## 9. Guided-selection contract

### Public name

Preferred labels:

- „Pomoć pri izboru podrške"
- „Pomozite mi da suzim izbor"
- „Pronađite odgovarajući oblik podrške"

Avoid public labels such as:

- clinical triage;
- psychological test;
- diagnostic test;
- symptom assessment.

### MVP behavior

The first version is deterministic and rules-based.

Possible criteria:

- who support is for;
- reason for seeking support;
- individual/couples/parenting/program preference;
- online or in person;
- language;
- timezone;
- preferred time of day;
- therapist availability.

### Result behavior

- show multiple relevant options;
- explain why each option was shown;
- allow viewing all therapists;
- do not require email before displaying the result;
- do not claim certainty;
- do not persist anonymous answers longer than necessary.
- do not request sexual orientation or gender identity as a booking requirement;
- apply the same service, price and request rules without discriminatory routing.

### Data minimization

Avoid free-text emotional-health descriptions in the initial flow.

If a later version introduces free text:

- explain why it is collected;
- warn users not to submit unnecessary sensitive detail;
- define retention and access rules;
- complete privacy and legal review first.

---

## 10. Homepage content architecture

The approved first design contains the following sections.

### 10.1 Header

Navigation:

- Pronađi podršku
- Terapeuti
- Usluge
- Radionice
- Znanje i resursi
- O nama
- Zakaži termin

The booking CTA becomes a clear sticky action during scroll.

### 10.2 Hero

Content:

- neutral office/interior image;
- eyebrow;
- H1;
- concise value proposition;
- primary CTA: „Pomozi mi da pronađem podršku";
- secondary CTA: „Upoznaj terapeute";
- existing-client link: „Već ste klijent? Zakažite naredni termin."

### 10.3 Trust strip

Initial items:

- Online i uživo
- Niš i rad sa dijasporom
- Individualni i partnerski rad
- Poverljivost i stručnost

Location and in-person availability remain draft until confirmed.

### 10.4 Reasons section

Six homepage cards:

- Stres i burnout
- Partnerski odnosi
- Anksioznost i emocionalne teškoće
- Roditeljstvo
- Samopouzdanje i granice
- Podrška adolescentima

The full topic set belongs on a separate support/topics page.

### 10.5 Support paths

Two equal user choices:

1. **Vođeni izbor** — „Pomozite mi da suzim izbor"
2. **Samostalni izbor** — „Želim samostalno da upoznam terapeute"

### 10.6 Therapists section

Each card contains:

- approved photograph or staging placeholder;
- name;
- professional title;
- short biography;
- format;
- selected main areas;
- profile CTA.

### 10.7 Services section

Each service card clearly explains:

- what the service is;
- who it is for;
- duration;
- price;
- format;
- next step;
- booking CTA.

### 10.8 First session section

Three-step explanation:

1. Upoznavanje
2. Očekivanja i pitanja
3. Naredni koraci

Core message:

> Prvi razgovor je prilika za upoznavanje i procenu da li vam terapeut i način rada odgovaraju; nije obaveza da nastavite proces.

### 10.9 Workshop section

Initial draft workshop:

**Upoznaj sebe kroz geštalt iskustvo**

Required before publication:

- date;
- format/location;
- facilitator;
- price;
- capacity;
- enrollment and cancellation rules.

### 10.10 Knowledge and resources

Initial article cards:

1. Kako prepoznati burnout pre nego što postane ozbiljan problem?
2. Zašto nije potrebno da dođemo do „pucanja" da bismo potražili podršku?
3. Postavljanje granica bez osećaja krivice.

Article cards may be present in staging with „content in preparation," but production should not publish empty or AI-invented clinical articles.

### 10.11 FAQ

Initial questions:

- Da li je sve što kažem poverljivo?
- Koliko traje terapija?
- Da li mogu raditi online?
- Kako da znam koji terapeut mi odgovara?
- Da li mi treba dijagnoza da bih došao na terapiju?

Answers are draft until final professional and legal review.

### 10.12 Final CTA

Core message:

> Ne morate unapred znati odakle da počnete.

Actions:

- Pronađi podršku
- Pregledaj terapeute

---

## 11. Content model

### 11.1 Content entities

- organization;
- therapist profile;
- service;
- support topic;
- article;
- resource;
- workshop;
- program;
- FAQ item;
- static page;
- CTA;
- legal notice.

Supported public resource formats include:

- professional article;
- short educational text;
- book or podcast recommendation;
- video;
- audio exercise;
- PDF guide;
- experiential exercise or worksheet;
- workshop/program reference;
- related therapist reference.

Therapists, services and programs remain separate domain entities referenced by content; they are not flattened into a generic content-type table.

The controlled taxonomy separates `support_path`, `topic`, `audience/context`, `goal`, `format`, `access_level` and `review_status`. LGBTQIA+ support belongs to `audience/context` and may also have its own public hub.

### 11.2 Content status

Every content record must have an explicit status:

- `draft`
- `in_review`
- `approved`
- `published`
- `archived`

Optional metadata:

- `is_provisional`
- `requires_professional_review`
- `requires_legal_review`
- `approved_by`
- `approved_at`
- `last_reviewed_at`

### 11.3 Content ownership

- therapists own and approve their biographies, qualifications and service descriptions;
- Psihointegritet organization admin approves public organizational content;
- professional content requires named professional review;
- the initial professional approval group is Anja Stamenković, Marija Stamenković and Marjan Janković;
- future specialist categories may require an additional named specialist reviewer;
- legal and privacy statements require legal review;
- developers and AI agents may structure or rewrite copy but may not invent credentials, claims, prices or clinical guidance.

### 11.4 Localization

The initial public language is Serbian Latin.

The model must permit later:

- Serbian Cyrillic;
- English;
- additional regional language variants if needed.

Do not duplicate business logic per locale.

### 11.5 Access model

The initial free layer includes articles, blog posts, short educational texts, literature/podcast/video recommendations, selected audio and PDF resources, therapist profiles, service descriptions, the basic Kompas and program information.

Paid layers include individual conversations, bračno savetovanje, group programs, workshops, online courses and later specialist educational packages.

Items marked „U pripremi" may include consented user stories, a moderated community, online courses, the advanced Kompas, expanded company programs, NTC programs for children, a members area and a mobile application. This label must not create an empty active module or promise an unapproved delivery date.

---

## 12. Visual and interaction direction

The visual system should be:

- modern;
- minimalist;
- warm;
- calm;
- editorial;
- professional;
- spacious.

Current palette direction:

- dark forest green;
- sage;
- pale meadow green;
- warm skin/beige;
- coffee brown;
- white/warm canvas.

Use:

- substantial whitespace;
- authentic therapist photography;
- restrained card-based layouts;
- clear typographic hierarchy;
- subtle motion;
- strong accessible contrast.

Avoid:

- distressed-person imagery;
- people holding their heads;
- white-coat/medical clichés;
- aggressive red;
- excessive gradients;
- playful continuous motion;
- animations that delay access to content.

Motion should support hierarchy and orientation, not entertainment.

---

## 13. MVP scope

### Included

- public homepage;
- organization presentation;
- therapist list and profiles;
- support topics;
- service catalog;
- service prices and durations;
- booking availability and appointment flow;
- guest appointment request with registration/verification only when required for a confirmed service;
- therapist/admin management of profiles, services and availability;
- basic blog/resources;
- workshop/program presentation and guest application or expression of interest; confirmed enrollment may require account, payment and program-specific consent;
- guided selection;
- email verification and appointment notifications;
- privacy/consent foundations;
- superadmin dashboard;
- diagnostics as the primary superadmin view.

### Explicitly deferred

- open marketplace;
- mobile application;
- clinical records;
- therapy notes;
- session recordings;
- unlimited therapist-client chat;
- AI therapist;
- diagnosis or risk assessment;
- mood diary;
- community groups;
- advanced progress tracking;
- split payments and therapist payouts;
- adolescent self-service without approved safeguards;
- external therapist onboarding.

Deferred does not mean rejected. It means the MVP must not implement it prematurely.

---

## 14. Future product layers

The architecture should preserve clean extension points for:

### Communication

- administrative messaging;
- appointment-related communication;
- therapist-assigned resources;
- clear response-time boundaries.

### Learning and resources

- PDF, audio and video resources;
- structured learning programs;
- access grants;
- progress through educational modules.

### AI navigation

- Q&A over approved content;
- cited answers;
- navigation assistance;
- service and content discovery;
- booking assistance.

AI must not diagnose, conduct therapy or invent professional guidance.

### Marketplace

- external therapist onboarding;
- verification;
- contracts;
- subscriptions or commissions;
- moderation;
- payouts;
- disputes.

### Organizations

- additional clinics/centers;
- solo therapist organizations;
- custom domains;
- organization-level branding and settings.

### Analytics and diagnostics

- user-journey analytics;
- content engagement;
- booking conversion;
- operational health;
- identity and tenant-integrity checks;
- notification and booking diagnostics.

---

## 15. Safety, privacy and trust boundaries

The MVP does not store:

- diagnoses;
- therapy notes;
- detailed emotional diaries;
- session transcripts;
- session recordings;
- unrestricted private therapeutic conversations;
- automated mental-health conclusions.

The MVP stores only what is necessary for:

- account identity;
- booking;
- service enrollment;
- notification;
- consent;
- minimal user history.

All public statements about confidentiality must reflect real legal and professional exceptions.

The product must clearly state that it is not an emergency or crisis service. Exact wording and local resources require professional/legal approval before publication.

The non-discrimination invariant applies to public navigation, guided selection, Intake, Matching and Booking. The platform does not infer LGBTQIA+ identity, does not require disclosure in order to request support and does not use identity as a marketing segment by default.

---

## 16. Open product decisions

These items remain unresolved and must not be guessed in production code:

1. Final therapist biographies and qualifications
2. Authentic therapist photographs
3. Final services per therapist
4. Final prices
5. Parenting: topic, counseling service, workshop or program
6. In-person location and availability
7. Workshop details and cancellation rules
8. Whether confirmed workshop/program enrollment requires an account in every case
9. Public display of all prices
10. Payment receiver and invoicing model
11. Final logo and brand assets
12. Contact email, phone and social links
13. Exact guided-selection questions and matching rules
14. Final legal/professional activation rules for the restricted 16–17 and under-16 review paths
15. Payment provider and rollout timing
16. Which therapists publicly declare LGBTQIA+ support as an explicit professional capability

For staging, use clearly marked draft data. Do not convert an unresolved item into a hidden permanent assumption.

---

## 17. Seed-data map

```text
Organization
└── Psihointegritet

Therapists
├── Anja Stamenković
├── Marija Stamenković
└── Marjan Janković

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

Cross-cutting support context
└── LGBTQIA+ podrška

Workshop
└── Upoznaj sebe kroz geštalt iskustvo

Articles
├── Kako prepoznati burnout pre nego što postane ozbiljan problem?
├── Zašto nije potrebno da dođemo do „pucanja" da bismo potražili podršku?
└── Postavljanje granica bez osećaja krivice
```

---

## 18. Rules for Claude, Codex and other coding agents

Before implementing a feature, determine:

1. Which confirmed user problem does this solve?
2. Is it in the MVP or deferred?
3. Which user journey does it belong to?
4. Does it collect sensitive data?
5. Does it imply a clinical conclusion?
6. Who owns and approves the content?
7. Is the source data approved or still draft?
8. Does it alter tenant, booking, identity or access-control behavior?
9. Does it require a diagnostic integrity check?
10. Does it conflict with the technical architecture or coding rules?

Coding agents must not:

- invent professional qualifications;
- invent clinical claims;
- invent prices or workshop dates;
- convert a draft into published content automatically;
- create empty future modules without an approved scope;
- add free-text sensitive data collection casually;
- treat guided selection as diagnosis;
- build an open marketplace during the MVP;
- duplicate business rules across frontend and backend;
- silently choose a payment or legal model.

When a decision is missing, implement a reversible draft boundary or stop and request clarification.

---

## 19. Change management

Every material product decision should update this document or a linked decision record.

Record:

- date;
- decision;
- owner;
- reason;
- affected flows;
- affected data;
- migration impact;
- whether the decision replaces an earlier one.

Suggested companion file:

`documentations/PRODUCT_DECISIONS.md`

This document should remain concise enough to be read before substantial implementation work, but complete enough to prevent agents from rebuilding the product from assumptions.
