/** Public: POST /api/v1/booking/appointment-requests/{requestId}/accept-alternative */
import { forwardPublicBooking } from "@/lib/booking/backend-proxy";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ requestId: string }> },
): Promise<Response> {
    const { requestId } = await params;
    return forwardPublicBooking(
        `/api/v1/booking/appointment-requests/${requestId}/accept-alternative`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: await request.text(),
        },
    );
}
