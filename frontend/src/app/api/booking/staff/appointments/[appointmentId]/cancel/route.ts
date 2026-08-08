/** Staff: POST /api/v1/booking/appointments/{id}/cancel */
import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ appointmentId: string }> },
): Promise<Response> {
    const { appointmentId } = await params;
    return forwardStaffBooking(
        `/api/v1/booking/appointments/${appointmentId}/cancel`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: await request.text(),
        },
    );
}
