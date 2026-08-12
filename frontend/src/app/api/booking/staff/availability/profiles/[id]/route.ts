import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/**
 * The `[id]` segment is overloaded exactly as the FastAPI routes are: GET
 * lists the profiles of a *therapist*, while PUT and DELETE address a single
 * *profile*. Keeping the shapes identical avoids a second naming scheme that
 * would have to be kept in sync by hand.
 */

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(`/api/v1/booking/availability/profiles/${id}`, {
    method: "GET",
  });
}

/** Mode, grid step, timezone and both notice periods (D-069 / D-070). */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(`/api/v1/booking/availability/profiles/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(`/api/v1/booking/availability/profiles/${id}`, {
    method: "DELETE",
  });
}
