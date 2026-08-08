// Server-only booking proxy to FastAPI (mirrors intake's backend-proxy.ts).
//
// Public endpoints go through `forwardPublicBooking` (no auth).
// Staff endpoints go through `forwardStaffBooking` (forwards Clerk session token).

import "server-only";

import { auth } from "@clerk/nextjs/server";

import { serverEnv } from "@/lib/validation/env";


async function _forward(path: string, init: RequestInit): Promise<Response> {
    try {
        const response = await fetch(
            `${serverEnv.NEXT_PUBLIC_API_URL}${path}`,
            { ...init, cache: "no-store" },
        );
        const contentType = response.headers.get("Content-Type") ?? "application/json";
        const body =
            response.status === 204 || response.status === 304
                ? null
                : await response.arrayBuffer();
        return new Response(body, {
            status: response.status,
            headers: {
                "Cache-Control": "no-store",
                "Content-Type": contentType,
            },
        });
    } catch {
        return Response.json(
            { error: "Booking servis trenutno nije dostupan." },
            { status: 503, headers: { "Cache-Control": "no-store" } },
        );
    }
}


export async function forwardPublicBooking(
    path: string,
    init: RequestInit,
): Promise<Response> {
    return _forward(path, init);
}


export async function forwardStaffBooking(
    path: string,
    init: RequestInit,
): Promise<Response> {
    const session = await auth();
    const token = await session.getToken();
    if (!token) {
        return Response.json(
            { error: "Prijava je obavezna." },
            { status: 401 },
        );
    }
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return _forward(path, { ...init, headers });
}
