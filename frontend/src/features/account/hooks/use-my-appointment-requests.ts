"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyAppointmentRequests } from "@/lib/api/booking";

export const accountQueryKeys = {
  all: ["account"] as const,
  appointmentRequests: () =>
    [...accountQueryKeys.all, "appointment-requests"] as const,
};

/**
 * The signed-in client's own booking requests.
 *
 * No email argument by design — the BFF resolves it from the session (see
 * `app/api/account/appointment-requests/route.ts`), which also means the query
 * key needs no identity in it: a different session is a different browser.
 */
export function useMyAppointmentRequests() {
  return useQuery({
    queryKey: accountQueryKeys.appointmentRequests(),
    queryFn: getMyAppointmentRequests,
    staleTime: 30_000,
  });
}
