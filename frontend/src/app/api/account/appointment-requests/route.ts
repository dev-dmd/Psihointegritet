import "server-only";

import { getServerIdentity } from "@/lib/auth/identity-server";
import { forwardPublicBooking } from "@/lib/booking/backend-proxy";

/**
 * The signed-in client's own appointment requests.
 *
 * FastAPI exposes this list as a *public* route keyed by email in the path
 * (`/booking/appointment-requests/client/{email}`), which is fine for the
 * anonymous "check my request" link but is not something the panel may call:
 * the email would come from the browser, so anyone could read anyone's
 * requests by typing an address.
 *
 * This handler is the trust boundary. It takes no parameters at all — the
 * email comes from the verified session server-side, so "my requests" cannot
 * be widened into "someone else's requests" from the client.
 *
 * Booking rows carry no account id (`appointment_requests.client_email` is the
 * only client key today), so email equality *is* the join. A client who booked
 * with a different address than the one they signed in with sees an empty
 * panel — correct, and safer than any fuzzy match.
 */
export async function GET(): Promise<Response> {
  const identity = await getServerIdentity();
  if (!identity) {
    return Response.json(
      { error: "Prijava je obavezna." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // A session without an email is a real state (a provider can hold only a
  // phone identifier), not an error — there is simply nothing to match on.
  if (!identity.email) {
    return Response.json([], {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return forwardPublicBooking(
    `/api/v1/booking/appointment-requests/client/${encodeURIComponent(identity.email)}`,
    { method: "GET" },
  );
}
