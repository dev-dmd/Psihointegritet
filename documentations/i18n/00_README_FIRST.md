# Codex I18N handoff — redosled upotrebe

Ovaj paket je pripremljen nakon provere aktuelne `features` grane repozitorijuma
`dev-dmd/Psihointegritet` 2026-08-13.

## Redosled

1. `01_I18N_CONTENT_ERROR_DECISIONS_v1_0.md`
   - stvarni locale model;
   - razlika između platforminog fallbacka i tenantovog field-level override-a;
   - user-safe greške i Diagnostic-only tehnički detalji.
2. `02_PLATFORM_CONTENT_SOURCE_AND_STARTER_POLICY_v1_0.md`
   - ko piše koji sadržaj;
   - Psihointegritet, neutralni starter i blank paket;
   - demo podaci naspram stvarnih podataka.
3. `03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md`
   - faze, scope granice, gate-ovi i testovi.
4. `04_CODEX_MASTER_HANDOFF_PROMPT_v1_0.md`
   - prompt koji se daje Codex-u u VS Code.

## Važno

Master prompt je namerno plan-first. Plan je odobren 2026-08-13 uz zaključane dopune koje su
promovisane u D-077 Amandmane 5 i 6 i D-079. Aktivni implementacioni plan je
`03_I18N_DEMO_CONTENT_IMPLEMENTATION_PLAN_v1_0.md`; dokumenti u `archive/` su samo istorijski
zapis i nisu izvor važećeg locale ili error ugovora.

## Kratak odgovor o locale imenima

Trenutno i ciljano za ovaj milestone:

```text
organization.ui_locale              jedini organization-scoped render locale
organization.default_content_locale početna oznaka novog CMS sadržaja
PLATFORM_DEFAULT_LOCALE              poslednji platformski fallback (`en`)
SUPPORTED_UI_LOCALES                 globalne mogućnosti (`en`, `sr-Latn`)
```

Ne uvode se organization `default_locale` ni organization `supported_locales`. Oni postaju
smisleni tek u posebnom milestone-u u kojem jedan tenant istovremeno objavljuje više javnih
jezičkih verzija.
