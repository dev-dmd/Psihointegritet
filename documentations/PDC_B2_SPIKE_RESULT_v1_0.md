# B2 spike — rezultat

**Datum:** 2026-09-07 · **Vlasnik:** Milan Dražić (CTO) · **Status:** zaključen, **ništa nije implementirano**
**Pitanje:** ponašaju li se `robots.txt`, `sitemap.xml`, canonical i ISR ispravno u Next.js 16 kada
hostname middleware rewrite-uje zahtev na tenant-scoped interni put.

**Ishod: DA, uz tri konkretna ograničenja koja menjaju oblik implementacije.**

---

## 0. Kako je izveden i gde stoji

Zaseban minimalni Next app u `/tmp/claude-1000/b2spike`, **van repozitorijuma** — `git status` je čist,
nijedan fajl proizvoda nije dodirnut. Iste verzije kao proizvod: `next 16.3.0`, `react 19.2.4`.

Dva mock tenanta, bez baze, bez auth-a, bez sadržaja — samo routing:

```
tenants.ts   sanjaneuer.com → sanja-neuer  ·  psihointegritet.com → psihointegritet
proxy.ts     Host → registar → rewrite
app/s/[tenant]/{page, usluge/[slug], tenant-robots, tenant-sitemap}
```

Spike se namerno **ne** dodaje u repo. Vrednost mu je u nalazima ispod, ne u kodu.

---

## 1. Prihvatni scenario — prošao u celosti

Mereno kroz `next start` sa pravim `Host` header-ima:

| Zahtev | Rezultat |
| ------ | -------- |
| `sanjaneuer.com/` | `<h1>Sanja Neuer</h1>` · `<title>Sanja Neuer</title>` · `canonical https://sanjaneuer.com` |
| `psihointegritet.com/` | `<h1>Psihointegritet</h1>` · `canonical https://psihointegritet.com` |
| `sanjaneuer.com/robots.txt` | Sanjin robots, `Sitemap: https://sanjaneuer.com/sitemap.xml` |
| `sanjaneuer.com/sitemap.xml` | **samo** 3 Sanjina URL-a |
| `psihointegritet.com/robots.txt` | Psiho robots sa njihovim sitemap-om |
| `psihointegritet.com/sitemap.xml` | **samo** 4 Psiho URL-a |
| `nepoznat.com/` | **404** — fail-closed, bez rewrite-a |

### Build output — ništa nije postalo request-time

```
Route (app)
├   /s/[tenant]
│ ├ ● /s/sanja-neuer
│ └ ● /s/psihointegritet
├   /s/[tenant]/tenant-robots
│ ├ ● /s/sanja-neuer/tenant-robots
│ └ ● /s/psihointegritet/tenant-robots
├   /s/[tenant]/tenant-sitemap
│ ├ ● /s/sanja-neuer/tenant-sitemap
│ └ ● /s/psihointegritet/tenant-sitemap
└   /s/[tenant]/usluge/[slug]
  ├ ● /s/sanja-neuer/usluge/konsultacije
  ├ ● /s/sanja-neuer/usluge/mentorstvo
  ├ ● /s/psihointegritet/usluge/tim
  └ ● [+2 more paths]

ƒ Proxy (Middleware)
●  (SSG)  prerendered as static HTML (uses generateStaticParams)
```

**Sve `●`. Nijedno `ƒ` osim samog proxy-ja**, koji je i treba da bude request-time. HTML je i na disku
prerenderovan po tenantu (`.next/server/app/s/sanja-neuer.html`, `…/psihointegritet.html`).

ISR radi po tenantu, sa zasebnim ključevima:

```
sanjaneuer.com       x-nextjs-cache: HIT   Cache-Control: s-maxage=300, stale-while-revalidate=…
psihointegritet.com  x-nextjs-cache: HIT   Cache-Control: s-maxage=300, stale-while-revalidate=…
```

---

## 2. Tri nalaza koja menjaju implementaciju

### 2.1 `_sites` ne radi — prefiks `_` je privatni folder

`app/_sites/[tenant]/` **ne proizvodi nijednu rutu**. U App Router-u folder sa `_` je *private folder*
i isključen je iz rutiranja. Build je tiho prijavio samo `Route (pages) ─ ○ /404`, bez ijedne greške.

Ime `/_sites/[organization]/…` iz **D-077 A1** potiče iz Pages Router konvencije i ne prenosi se.
Interni segment mora biti običan, npr. `/s/[organizationSlug]/…`.

> Amandman treba da ispravi i samo ime modela B2, ne samo njegov status.

### 2.2 `robots.ts` i `sitemap.ts` ne rade u dinamičkom segmentu

Obe metadata konvencije padaju, i to različito — jedna glasno, druga tiho:

| Fajl | Ponašanje |
| ---- | --------- |
| `sitemap.ts` | **puca build**: `Cannot destructure property 'params' of 'undefined'`, uz pokušaj prerendera `/s/-/sitemap.xml` |
| `robots.ts` | **tiho ne proizvodi ništa** — build prolazi, izlaza nema |

Ono `-` u putanji je Next-ov placeholder: metadata rute ne primaju `params` iz `generateStaticParams`.
`sitemap.ts` očekuje `generateSitemaps()` i `id`, što ne odgovara tenant dimenziji.

**Imena su rezervisana i kao Route Handler.** `app/s/[tenant]/sitemap.xml/route.ts` i dalje pravi
`/s/-/sitemap.xml` sa istim placeholder-om.

**Rešenje koje radi:** nerezervisana imena + mapiranje u proxy-ju.

```
app/s/[tenant]/tenant-robots/route.ts     ← generateStaticParams po tenantu
app/s/[tenant]/tenant-sitemap/route.ts

proxy:  /robots.txt   → /s/<tenant>/tenant-robots
        /sitemap.xml  → /s/<tenant>/tenant-sitemap
```

Spolja URL ostaje `/robots.txt` i `/sitemap.xml`; obe rute su `●` prerenderovane.

### 2.3 Interni put je spolja dostupan — mora se zatvoriti

Bez zaštite `/s/sanja-neuer` vraća **200 sa bilo kog hosta**. To je duplirani sadržaj koji bi se
indeksirao paralelno sa pravim domenom.

Zatvara se u proxy-ju, pre mapiranja hosta:

```ts
if (request.nextUrl.pathname.startsWith("/s/")) {
  return new NextResponse("Not found", { status: 404 });
}
```

Provereno posle zaštite:

| | |
| - | - |
| `/s/sanja-neuer` direktno | **404** |
| `/s/psihointegritet` direktno | **404** |
| `sanjaneuer.com/` | 200, Sanjin HTML |
| `psihointegritet.com/` | 200, Psiho HTML |
| `sanjaneuer.com/sitemap.xml` | 3 URL-a |

---

## 3. Šta spike NIJE dokazao

Namerno van obima, da ne preraste u implementaciju:

- **on-demand revalidation** (`revalidatePath('/s/<slug>/…')`) — očekuje se da radi jer je put običan, ali nije mereno
- **preview deployment-i** bez custom domena — nema Host-a za mapiranje, treba fallback
- ponašanje na **Vercel edge-u** (mereno na `next start` lokalno)
- `next-intl`, Clerk, sadržaj, baza — ništa od toga nije bilo u spike-u
- kako se `metadataBase` u root layout-u seli u tenant layout

---

## 4. Zaključak

**B2 je potvrđen kao produkcijski cilj.** Hostname rewrite ne košta statiku — canonical, robots,
sitemap i ISR rade po tenantu, sa zasebnim cache ključevima, uz build koji ostaje potpuno prerenderovan.

Rasprava C2(a) vs B2 je time zatvorena: C2(a) postaje istorijska/prelazna faza.

Tri ograničenja iz §2 nisu prepreke nego **konkretne izmene plana**:

1. interni segment je `/s/[organizationSlug]`, ne `/_sites/…`
2. `robots`/`sitemap` idu kao Route Handler-i pod nerezervisanim imenima, uz mapiranje u proxy-ju
3. proxy mora 404-ovati direktan pristup internom stablu

Sledeće po dogovorenom redosledu: **tenant-scoped authorization guards** (`hasRole` bez
`organizationId` — cross-tenant rupa iz audita §6.1), pa PDC-0D, pa tek onda B2 konsolidacija.
