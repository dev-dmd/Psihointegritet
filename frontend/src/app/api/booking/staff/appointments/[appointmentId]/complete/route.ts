/** Staff: POST /api/v1/booking/appointments/{id}/complete */
import { forwardStaffBooking } from "@/lib/booking/backend-proxy";

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ appointmentId: string }> },
): Promise<Response> {
    const { appointmentId } = await params;
    return forwardStaffBooking(
        `/api/v1/booking/appointments/${appointmentId}/complete`,
        { method: "POST" },
    );
}
