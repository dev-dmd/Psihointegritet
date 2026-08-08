/** Public: POST /api/v1/booking/slots/hold */
import { forwardPublicBooking } from "@/lib/booking/backend-proxy";

export async function POST(request: Request): Promise<Response> {
    return forwardPublicBooking("/api/v1/booking/slots/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text(),
    });
}
