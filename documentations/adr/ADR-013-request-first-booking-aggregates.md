# ADR-013 - Request-First Booking Aggregates and Reschedule Contract

**Status:** Accepted
**Date:** 2026-07-22
**Decision owners:** Milan (CTO), recorded through D-035, D-036 and D-037

## Context

The older architecture baseline modeled booking as one `appointments` aggregate with a broad status enum. That let a selected slot, an unreviewed request, a therapist decision and a confirmed appointment look like variations of the same thing. It also risked losing a confirmed appointment while a reschedule attempt was still unresolved.

R1.6 needs a request-first model that makes availability contention safe without telling the client that an appointment is reserved or confirmed.

## Decision

1. `BookingMode` resolves for the concrete offer `Service + Therapist + Format + Location`. Overrides can only narrow `slot_request -> request -> disabled`.
2. Booking uses separate aggregates:
   - `SlotHold`: short internal technical hold for `slot_request` only;
   - `AppointmentRequest`: a submitted initial or reschedule request;
   - `Appointment`: a confirmed term created only after therapist confirmation.
3. `AppointmentRequest.type` is `initial | reschedule`. The current confirmed Appointment remains valid until a reschedule request is atomically converted into a new confirmed Appointment.
4. Appointment cancellation actor, reason, policy version and successor link are audit/event data. They do not require a separate public Appointment status for every actor or cause.
5. BDS-007B, BDS-008, BDS-009B and BDS-010B remain business/operational gates. This ADR does not approve their TTL, SLA, waitlist or cancellation values.

## Consequences

- R2 will not create a "nearly confirmed" Appointment.
- Public and staff APIs use request resources for review and alternatives; Appointment endpoints operate only on confirmed appointments.
- Database concurrency protects confirmed appointments and the approved transient hold. Whether an under-review request removes a public slot is implemented only after BDS-007B approval.
- Events distinguish request, confirmation, cancellation, reschedule and waitlist semantics.
- No Booking migration, endpoint or UI is created by this ADR. The Pre-R2 decision specification remains the implementation gate.

## Supersedes / updates

- `technical-documentation-architecture-v0.3.md` §6 and §7 one-object booking baseline.
- Earlier master-plan 11-status appointment baseline.
- The R1.6 decision specification and master plan are the detailed implementation source once R2 is approved.
