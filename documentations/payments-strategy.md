# Plaćanja — Strategija i granice domena

**Verzija:** 0.1
**Datum:** 2026-08-06
**Vlasnik:** Milan Dražić (CTO)
**Povezano:** PRE_R2 §12 (BDS-014 BLOCKED) · ADR-013 · TODO.md §5 (R5)

## 1. Dve odvojene finansijske granice

Plaćanja na Psihointegritet platformi pripadaju **dvema nezavisnim granicama** koje se ne mešaju ni u kodu, ni u bazi, ni u korisničkom toku:

### Platform Billing — tenant plaća platformi

- **Ko:** vlasnik organizacije (tenant)
- **Šta:** mesečna/godišnja pretplata za korišćenje platforme
- **Provider adapteri:** Lemon Squeezy, Paddle (kasnije)
- **Target milestone:** R5
- **Status:** BLOCKED — ništa se ne implementira u R2

### Tenant Commerce — vlasnik biznisa prodaje svojim klijentima

- **Ko:** klijent plaća organizaciji
- **Šta:** paketi sesija, pretplate, pojedinačne sesije, krediti
- **Provider adapteri:** Lemon Squeezy, Paddle (kasnije)
- **Target milestone:** R5
- **Status:** BLOCKED — ništa se ne implementira u R2

## 2. Provider adapteri

Lemon Squeezy i Paddle su **provider adapteri** — implementacije zajedničkog `PaymentProvider` interfejsa. Nijedan nije hardkodovan u domenu.

```text
Platform Billing ──→ PaymentProvider (interface)
                         ├── LemonSqueezyAdapter
                         └── PaddleAdapter

Tenant Commerce  ──→ PaymentProvider (interface)
                         ├── LemonSqueezyAdapter
                         └── PaddleAdapter
```

### Pravila

- **Svaka pretplata ima tačno jednog autoritativnog providera.** Ne može se podeliti između Lemon Squeezy-ja i Paddle-a.
- Provider se postavlja pri kreiranju pretplate i ne menja se. Migracija sa jednog providera na drugi je ručni operativni proces, ne runtime feature.
- Svaki provider adapter enkapsulira: kreiranje proizvoda/cene, kreiranje checkout sesije, webhook verifikaciju, sinhronizaciju statusa pretplate, otkazivanje i refundaciju.
- Webhook signature verifikacija je obavezna za svaki provider.

## 3. Šta se NE implementira u R2

- Nijedna `payments` tabela, migracija ili endpoint
- Nijedan provider SDK (Lemon Squeezy, Paddle, Stripe)
- Nijedan billing UI (paketi, krediti, invoice, checkout)
- Nijedna finansijska logika (cene, valute, porezi, refundacije)
- Nijedan B2B billing (kvota nije novac — BDS-013)

## 4. Šta se evidentira sada

- `organization_settings` dobija `payment_provider` polje (`null` = nije konfigurisano) kao rezervisanu kolonu za R5.
- `appointments` **ne** dobija `price`, `currency`, `invoice_id` ni `payment_status` — ovo su R5 kolone.
- `booking_config` za B2B (`company_allocation`) ne sadrži cenu, kredit ni ledger — samo kvotu (`max_sessions`).

## 5. Otvorene odluke za R5

| ID | Tema | Status |
|---|---|---|
| PAY-001 | Da li tenant commerce ide preko Lemon Squeezy-ja ili Paddle-a? | OPEN |
| PAY-002 | Da li platform billing koristi istog providera? | OPEN |
| PAY-003 | Da li se podržava više valuta ili samo RSD? | OPEN |
| PAY-004 | Da li postoji affiliate/referral program? | OPEN |
| PAY-005 | Poreski tretman (FR, paušal, DOO) — da li platforma izdaje fakture ili samo posreduje? | OPEN |
