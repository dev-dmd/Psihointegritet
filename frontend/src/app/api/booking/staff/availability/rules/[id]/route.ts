import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

/** GET lists the rules of a *profile*; PUT and DELETE address one *rule*. */

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(`/api/v1/booking/availability/rules/${id}`, {
    method: "GET",
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return forwardStaffBooking(`/api/v1/booking/availability/rules/${id}`, {
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
  return forwardStaffBooking(`/api/v1/booking/availability/rules/${id}`, {
    method: "DELETE",
  });
}
