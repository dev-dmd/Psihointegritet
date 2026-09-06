# PDC — Tenant routing audit i migracioni plan v1.0

**Datum:** 2026-09-07 · **Vlasnik:** Milan Dražić (CTO) · **Status:** audit i plan, **bez implementacije**
**Povod:** odluka da P. Digitalni Centar bude **jedan Vercel projekat sa više tenant domena**, umesto
jednog projekta po tenantu.

---

## 0. Ispravka moje tvrdnje

Rekao sam da hostname resolution znači gubitak SSG-a. **To nije tačno** i vredi da stoji zapisano,
jer je ta greška zamalo ušla u odluku.

Spojio sam dve različite stvari:

| Stvar | Posledica |
| ----- | --------- |
| `headers()` u Server Component-u / `i18n/request.ts` | ✅ obara statiku — ceo javni sajt ide na SSR |
| Čitanje `Host` u **middleware-u** i rewrite na interni put | ❌ **ne obara statiku** — stranica tenanta dobija kroz route parametar |

Middleware nije deo render stabla. Kad prevede `sanjaneuer.com/o-meni` u `/_sites/sanja-neuer/o-meni`,
stranica više ne mora ništa da pita o zahtevu — tenant joj je parametar, a `generateStaticParams`
prerenderuje po tenantu.

---

## 1. Kada i gde je C2(a) uveden

**D-077, Amandman 1, 2026-08-11** — istog dana kad i sam D-077, tokom i18n rada:

> „C2 zaključan na (a) — **jedan deployment = jedna organizacija**, uz zaključan rendering ugovor.
> Javne stranice ostaju SSG/ISR i **ne smeju** zavisiti od request host/header konteksta."

Sprovedeno na tri mesta:

| Mesto | Šta radi |
| ----- | -------- |
| `lib/tenant/org-context.ts` | `DEFAULT_ORGANIZATION_SLUG` *jeste* verifikovani identitet organizacije |
| `scripts/check-frontend-architecture.mjs` | statički obara build ako 5 nabrojanih modula pozove `headers()`/`cookies()` |
| `core/config.py` | isti env kao izvor tenanta na backendu, 18 čitanja kroz 7 modula |

**Ključno za ovaj audit — model koji sada hoćemo je već zabeležen u toj istoj odluci:**

> „modeli B1 (host-aware SSR) i **B2 (`/_sites/[organization]/[locale]/...` rewrite uz tenant-scoped
> ISR)** su zabeleženi ali se **ne** implementiraju."

A `lib/tenant/public-locale.ts` ide i dalje — imenuje B2 kao *jedini ispravan način dolaska*:

> „If host-shared multi-tenancy is ever approved, it does **not** arrive by adding `headers()` here —
> that would take the public site down to SSR. It arrives as **model B2**: a proxy rewrite to an
> internal tenant-scoped pathname, so each tenant keeps its own static/ISR output.
> **This interface is the named seam**; nothing behind it is built."

**Ne obaramo odluku — aktiviramo granu koju je sama odluka predvidela.** To menja i ton amandmana:
nije ispravka greške nego prelazak na zabeležen model kad se pojavio potrošač.

---

## 2. Koje pretpostavke više ne važe

| Pretpostavka | Zašto je pala |
| ------------ | ------------- |
| „Tenant = deployment" | Bila je *izvedena*, nikad doneta kao proizvodna odluka. Za drugog tenanta radi; za petog znači pet Vercel projekata, pet env matrica, pet Clerk konfiguracija |
| „Odsustvo tenanta ima jedan tačan odgovor" | Palo je već juče (PDC-0 stabilizacija). Sada pada i sam pojam „deployment ima tenanta" |
| „Host je zabranjen izvor" | Zabranjen je **u render stablu**. Provera skenira 5 modula; `proxy.ts` **nije** među njima, i nikad nije ni bio zabranjen da čita zahtev |
| „`/_sites/…` je hipoteza" | Već je zapisan kao model B2, sa imenovanim šavom u kodu |

Jedan izvor je već izričito dozvoljen u samom pravilu, i to je tačno onaj koji nam treba:

> Allowed sources: deployment organization config · build-time env · a cached organization config
> under a statically known organization id · **a static/ISR route param** · an explicit locale argument.

---

## 3. Šta ostaje bez izmene

Najveći deo PDC-0 rada je ispod sloja koji se menja:

| Sloj | Status |
| ---- | ------ |
| `organizations` tabela, `organization_id` granica | ✅ nepromenjeno |
| `provision_organization()` + idempotentnost + konflikt | ✅ nepromenjeno — postaje još važnije |
| `ActorKind.SYSTEM`, `organization.created` audit | ✅ nepromenjeno |
| Sanjina stvarna organizacija u obe baze | ✅ nepromenjeno |
| `provision_staff()`, membershipi, Clerk identiteti | ✅ nepromenjeno |
| `OrganizationPublicSite` registar (tenant-scoped identitet) | ✅ **oblik ostaje**, menja se samo ko ga bira |
| Booking, Intake, Kompas, Content engine | ✅ nedirnuto |
| `tenant_doctor.py` | 🟠 provere ostaju, „deployment binding" se menja u „domain mapping" |

Menja se **jedan šav**: kako se odgovara na pitanje *koji tenant*.

```
BILO:  deployment env  → DEFAULT_ORGANIZATION_SLUG → organization
BIĆE:  Host            → domain registry           → organization slug → organization_id
```

---

## 4. Minimalna ciljna arhitektura

```
                    JEDAN VERCEL PROJEKAT  (p-digital-center)
                                  │
   p-digital-center.com    psihointegritet.com    sanjaneuer.com
        PLATFORMA               TENANT                TENANT
                                  │                     │
                          psihointegritet          sanja-neuer
```

Tok jednog zahteva:

```
Host: sanjaneuer.com/o-meni
        ↓  proxy.ts (middleware — van render stabla)
   domain registry: sanjaneuer.com → sanja-neuer
        ↓  NextResponse.rewrite
   /_sites/sanja-neuer/o-meni          ← URL u brauzeru ostaje sanjaneuer.com/o-meni
        ↓
   params.organizationSlug = "sanja-neuer"     ← dozvoljen izvor po postojećem pravilu
        ↓
   generateStaticParams() → SSG/ISR po tenantu
```

Struktura ruta:

```
app/
  _sites/[organizationSlug]/        ← preseljeno iz app/(public)/
      page.tsx  o-meni/  usluge/[slug]/  tim/[slug]/  …
  (staff)/  (client)/  (superadmin)/    ← ostaju, request-time su ionako
```

`DEFAULT_ORGANIZATION_SLUG` **ostaje samo kao lokalna razvojna pogodnost** — koji tenant vidiš na
`localhost:3007` bez menjanja hostova. Prestaje da bude produkcijski model tenancy-ja.

---

## 5. Kako konkretno čuvamo SSG/ISR

| Potreba | Rešenje |
| ------- | ------- |
| **SSG** za sadržaj poznat na build-u | `generateStaticParams()` vraća po jedan unos za svaki registrovan tenant. Danas 2 → `/` se prerenderuje dvaput, jednom po tenantu |
| **Dinamičke podrute** (`usluge/[slug]`…) | Već imaju `generateStaticParams` na 3 mesta; dodaje im se tenant dimenzija: `[organizationSlug] × [slug]` |
| **ISR** za tenant sadržaj | `revalidate` ostaje po ruti, nepromenjeno |
| **On-demand revalidation** kad tenant objavi | `revalidatePath('/_sites/<slug>/…')` ili `revalidateTag` sa tenant-scoped tagom — obrazac već postoji (`organizationLocaleTag`) |
| **Custom domeni** | Domeni na jednom projektu, svi na `main`; rewrite ih razdvaja |
| **Preview deployment-i** | Nemaju custom domen → nema Host-a za mapiranje. Fallback na `DEFAULT_ORGANIZATION_SLUG` ili `?__tenant=` u preview-u; mora biti **isključeno u produkciji** |
| **canonical / robots po tenantu** | `publicOrigin()` već prima `origin` kao argument — dovoljno je proslediti tenant-ov `publicUrl` |

**Dokaz da pravilo ostaje na snazi:** nijedan od 5 SSG-safe modula ne dobija `headers()`. Tenant im
stiže kao parametar. Statička provera ostaje, samo joj se dopunjuje komentar.

### 5.1 Otvoreno pitanje koje traži spike, ne pretpostavku

`app/robots.ts` i `app/sitemap.ts` su root-level konvencije. Pod rewrite-om
`sanjaneuer.com/sitemap.xml` treba da pogodi tenant-scoped varijantu. Next podržava `generateSitemaps`,
ali **nisam potvrdio** ponašanje metadata ruta unutar dinamičkog segmenta uz rewrite. To je prvi
zadatak faze 0 — mali spike, pre nego što se planira ostatak.

---

## 6. Šta radimo sa auth-om

### 6.1 Nalaz koji je bezbednosni, ne kozmetički

```ts
// lib/auth/identity.ts
export function hasRole(identity, role) {
  return identity.memberships.some((m) => m.roles.includes(role));
}
```

**`organizationId` se ne gleda.** Pod C2(a) je bezbedno — deployment servira jednu organizaciju i u
njenoj bazi drugih membershipa nema. Pod deljenim runtime-om **prestaje da bude bezbedno**: korisnik
sa `org_admin` ulogom kod tenanta A prošao bi `requireOrgAdmin()` na domenu tenanta B.

`/api/v1/me` vraća **sve** membershipe korisnika, pa podatak za to već stiže na klijent.

**Mora se popraviti pre nego što jedan runtime servira dva tenanta.** To je gate, ne stavka.

### 6.2 Clerk preko više domena

Danas: jedna instanca, `signInUrl` literal, **bez** satellite konfiguracije. Dve opcije:

| Opcija | Kako radi | Cena |
| ------ | --------- | ---- |
| **Auth na platformskom domenu** | prijava uvek na `p-digital-center.com`, tenant domen preusmerava tamo i natrag | jedna sesija, najprostije; korisnik vidi platformski domen pri prijavi |
| **Clerk satellite domains** | svaki tenant domen je satelit primarnog | prijava ostaje „na njenom sajtu"; traži `isSatellite`/`domain` i allowed origins po domenu |

Kolačić je host-scoped u oba slučaja, pa sesija na `sanjaneuer.com` ne curi na `psihointegritet.com` —
to je **poželjno** i ostaje.

---

## 7. Postojeći Sanja/Psiho backendi i baze

**Ne spajamo baze u ovoj fazi.** Frontend prelazi na jedan projekat; backend izolacija ostaje
bezbednosna granica dok RLS ne bude spreman (danas: **0 polisa**, 111 ručnih filtera,
`rolbypassrls=t`).

```
JEDAN Vercel projekat
   ├ psihointegritet.com → tenant psihointegritet → API: diligent-serenity-production
   └ sanjaneuer.com      → tenant sanja-neuer     → API: diligent-serenity-sanja-production
```

**Posledica koju treba svesno prihvatiti:** jedan Vercel projekat ima **jedan env**, pa
`NEXT_PUBLIC_API_URL` više ne može biti env promenljiva. API cilj postaje **polje u domain registru**,
uz tenant slug. To je dobro — sve što je tenant-scoped seli se na jedno mesto.

Faza 2 (kasnije, zaseban milestone): deljeni backend sa request-scoped tenant kontekstom i RLS-om,
po ADR-023 §6.3.

---

## 8. Migracioni redosled bez downtime-a

Svaki korak je samostalno ispravan i povratan.

| # | Korak | Rizik |
| - | ----- | ----- |
| **0** | Spike: metadata rute (`robots`/`sitemap`) unutar dinamičkog segmenta uz rewrite | nema — samo saznanje |
| **1** | Domain registry (`hostname → { slug, apiUrl, publicUrl }`) kao checked-in tabela, bez potrošača | nema |
| **2** | `app/_sites/[organizationSlug]/` **pored** postojećih ruta; `generateStaticParams` po tenantu | nema — stare rute i dalje serviraju |
| **3** | `useContent` čita tenant iz konteksta koji postavlja tenant layout, umesto iz env-a | **najveći kodni zahvat** — vidi §8.1 |
| **4** | `proxy.ts` rewrite-uje **samo hostove upisane u registar**; sve ostalo prolazi kao danas | nizak — opt-in po hostu |
| **5** | `psihointegritet.com` prvi u registar → provera identičnog izlaza | nizak, povratan brisanjem unosa |
| **6** | `sanjaneuer.com` prebačen na platformski projekat | srednji — traži DNS repoint |
| **7** | `sanja-neuer` Vercel projekat se gasi **tek kad njen domen radi sa platformskog** | nizak |
| **8** | `hasRole` dobija tenant scope (§6.1) — **gate pre nego što jedan runtime servira dva tenanta** | mora pre koraka 5 |
| **9** | Auth model po §6.2 | srednji |

### 8.1 Najveći kodni zahvat, i zašto je manji nego što izgleda

`content/use-content.ts` je `"use client"` i preko `registry.ts` čita
`process.env.DEFAULT_ORGANIZATION_SLUG` — zato ga `next.config.ts` i inline-uje u klijentski bundle.
**Jedan bundle ne može da nosi jednog tenanta** kad ih projekat servira više.

Dobra vest: **21 klijentska komponenta** koristi taj sadržaj, ali sve kroz **jedan hook**. Kad hook
počne da čita context umesto env-a, pozivna mesta se ne menjaju. Jedna izmena, ne dvadeset jedna.

---

## 9. Dokumenti koje treba amendovati

| Dokument | Izmena |
| -------- | ------ |
| **D-077 Amandman 1** | **Nov amandman**, ne prepravka: C2 prelazi na (b) kroz **model B2**, koji je isti amandman već zabeležio. Rendering ugovor se **ne ukida** — javne rute ostaju SSG/ISR, tenant stiže kao route param |
| **ADR-023 §6.3** | „Domain resolver ostaje opisan budući korak… ulazi kad postoji druga organizacija sa sopstvenim domenom." **Taj uslov je ispunjen** — `sanjaneuer.com` postoji |
| **ADR-026** | Locale se razrešava iz tenanta dobijenog kroz param, ne iz deployment env-a |
| **D-080 + A1** | „Tenant se razrešava iz deployment konfiguracije, nikad iz `Host`" — obrće se; ostaje da nijedan domen nije literal u kodu |
| **Nov ADR** | Domain registry i tenant routing: izvor mape, poverenje u `Host`, ponašanje na preview-u, fail-closed na nepoznat host |
| **`P_DIGITALNI_CENTAR_PLAN_v1_0.md`** | PDC-0C („svoj FE i svoj BE deployment") se povlači u delu FE; PDC-0A/0B/0D ostaju |
| **`check-frontend-architecture.mjs`** | Pravilo **ostaje**; komentar dobija da je route param dozvoljen izvor i da middleware nije render stablo |

---

## 10. Šta preporučujem kao sledeći korak

Ne bih odmah počeo migraciju. Redosled koji najmanje košta:

1. **Spike iz §5.1** (metadata rute) — jedini nepoznat tehnički detalj.
2. **`hasRole` tenant scope (§6.1)** — bezbednosni gate, koristan i pod C2(a), nezavisan od svega ostalog.
3. **PDC-0D email identity** — ionako je tenant-scoped posao i ne sudara se sa routingom.
4. Tek onda koraci 1–7 iz §8.

Razlog za tim redom: 2 i 3 su korisni bez obzira na ishod migracije, a 1 je jedino što može da promeni
oblik plana.

> **Sanjin sajt ne mora da čeka migraciju.** Njen tenant, organizacija, nalozi i identitet rade danas.
> PDC-1 (Page Composer) radi nad `organizationSlug`-om bez obzira dolazi li iz env-a ili iz rute — pa
> se ta dva posla mogu preklopiti, samo ne smeju da se mešaju u istom PR-u.
