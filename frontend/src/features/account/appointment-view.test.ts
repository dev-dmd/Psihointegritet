import { describe, expect, it } from "vitest";

import type { AppointmentRequest } from "@/lib/api/booking";

import {
  nextRequest,
  partitionRequests,
  toAppointmentRequestView,
} from "./appointment-view";

function request(overrides: Partial<AppointmentRequest>): AppointmentRequest {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    organization_id: "22222222-2222-4222-8222-222222222222",
    therapist_profile_id: "33333333-3333-4333-8333-333333333333",
    service_id: "44444444-4444-4444-8444-444444444444",
    request_type: "initial",
    status: "submitted",
    preferred_start: null,
    preferred_end: null,
    existing_appointment_id: null,
    format: "online",
    location_id: null,
    client_name: "Ana Marković",
    client_email: "ana@example.com",
    client_timezone: "Europe/Belgrade",
    client_note: null,
    expires_at: null,
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("toAppointmentRequestView", () => {
  it("keeps a request whose status this build does not know", () => {
    // The backend can add a status before the panel learns its word. Dropping
    // the row would hide a real request; this shows it without a badge.
    const view = toAppointmentRequestView(request({ status: "on_hold" }));

    expect(view.status).toBeNull();
    expect(view.tone).toBe("neutral");
    expect(view.isOpen).toBe(true);
  });

  it("drops a format it cannot label", () => {
    expect(toAppointmentRequestView(request({ format: "hybrid" })).format).toBe(
      null,
    );
  });

  it("reads the requested instant when the request carries one", () => {
    const view = toAppointmentRequestView(
      request({ preferred_start: "2026-08-20T15:00:00.000Z" }),
    );

    expect(view.startsAt).toBe("2026-08-20T15:00:00.000Z");
  });
});

describe("partitionRequests", () => {
  it("files closed statuses under history and leaves confirmed ones open", () => {
    const { upcoming, history } = partitionRequests([
      request({
        id: "a",
        status: "converted",
        created_at: "2026-08-01T10:00:00.000Z",
      }),
      request({ id: "b", status: "declined" }),
      request({ id: "c", status: "expired" }),
      request({
        id: "d",
        status: "awaiting_client",
        created_at: "2026-08-05T10:00:00.000Z",
      }),
    ]);

    expect(upcoming.map((view) => view.id)).toEqual(["d", "a"]);
    expect(history.map((view) => view.id)).toEqual(["b", "c"]);
  });

  it("sorts dated requests ahead of undated ones, earliest first", () => {
    const { upcoming } = partitionRequests([
      request({ id: "undated", created_at: "2026-08-09T10:00:00.000Z" }),
      request({ id: "later", preferred_start: "2026-09-01T09:00:00.000Z" }),
      request({ id: "sooner", preferred_start: "2026-08-15T09:00:00.000Z" }),
    ]);

    expect(upcoming.map((view) => view.id)).toEqual([
      "sooner",
      "later",
      "undated",
    ]);
  });

  it("orders undated requests newest first", () => {
    const { upcoming } = partitionRequests([
      request({ id: "old", created_at: "2026-07-01T10:00:00.000Z" }),
      request({ id: "new", created_at: "2026-08-01T10:00:00.000Z" }),
    ]);

    expect(upcoming.map((view) => view.id)).toEqual(["new", "old"]);
  });
});

describe("nextRequest", () => {
  it("is null when every request is closed", () => {
    expect(nextRequest([request({ status: "declined" })])).toBeNull();
  });

  it("picks the most relevant open request", () => {
    const next = nextRequest([
      request({ id: "closed", status: "withdrawn" }),
      request({ id: "open", status: "submitted" }),
    ]);

    expect(next?.id).toBe("open");
  });
});
