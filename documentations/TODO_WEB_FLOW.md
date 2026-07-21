# TODO - Public Website Flow

**Scope:** R1 public website flow. This list intentionally excludes FastAPI,
Control Center, Superadmin, Clerk roles, legal copy, emergency content and
adolescent self-service booking.

## Guardrails

- [x] Keep existing visual language, sticky header, Research Drawer and B2B configurator.
- [x] Keep health-related answers, free text and matching scores out of URLs and analytics.
- [x] Keep content in typed static providers so a later CMS/API can replace the source without rewriting UI.

## Slice 1 - Safe corrections

- [x] Replace internal `/zakazivanje` links with `/zakazi`.
- [x] Remove stale separate-service references to "Psihoterapijsko savetovanje".
- [x] Update footer email, locations and secondary navigation.
- [x] Remove stale B2B and Guidance comments.

## Slice 2 - Content and booking contract

- [x] Add typed site settings and navigation providers.
- [x] Separate program data from the service catalog.
- [x] Add therapist-to-booking-service compatibility data.
- [x] Implement and test parser, validation and safe URL generator for booking context.

## Slice 3 - Central routes

- [x] Add `/zakazi` with editable prefill, request-not-confirmation copy and demo email submission.
- [x] Extract a reusable guidance flow and add `/pronadji-podrsku`.
- [x] Send matching results to `/zakazi` using only service, therapist, format and source.

## Slice 4 - Existing content as routes

- [x] Add `/usluge/[slug]` for the three canonical booking services.
- [x] Add `/radionice` and `/radionice/[slug]` from shared program data.
- [x] Add `/cene`, `/o-nama`, `/kontakt` and `/podrska-roditeljima`.

## Slice 5 - Navigation and B2B

- [x] Point all six header destinations and primary CTAs to route-level flows.
- [x] Update homepage cards, therapist CTAs, footer links and canonical metadata.
- [x] Add B2B plan presentation and optional preselection without replacing the configurator.

## Verification

- [x] Add unit coverage for booking context and request form behavior.
- [x] Update or add route/CTA coverage, including matching-to-booking handoff.
- [x] Run lint, typecheck, Vitest, production build and Playwright flows.
- [x] Check key routes at mobile width for overflow and usable controls.
- [ ] Resolve the pre-existing `npm run format:check` failure in `src/components/shared/logout-avatar-menu.tsx` outside this web-flow scope.

## Content decisions still blocked

- [ ] Legal pages and booking rules: lawyer-approved text and actual policy.
- [ ] Emergency-support route: approved safety copy and official contacts.
- [ ] Adolescents: age range, consent model, therapist availability, price and format.
- [ ] Workshops: dates, facilitators, capacity, cancellation rules and enrollment status.
- [ ] B2B: public pricing, capacity, billing and unused-capacity policy.
