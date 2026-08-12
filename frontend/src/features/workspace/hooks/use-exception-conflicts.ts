"use client";

import { useMutation } from "@tanstack/react-query";

import { listStaffAppointments, type Appointment } from "@/lib/api/booking";

/**
 * Confirmed appointments an exception would cover.
 *
 * An exception never cancels anything (handoff §7.5) — the therapist has to be
 * told so they can contact the clients themselves. Silently blocking a slot
 * that already has a booked session would be the worst of both worlds.
 */
export function useExceptionConflicts() {
  return useMutation({
    mutationFn: async (params: {
      therapistProfileId: string;
      startsAt: string;
      endsAt: string;
    }): Promise<Appointment[]> =>
      listStaffAppointments({
        therapist_profile_id: params.therapistProfileId,
        status: "confirmed",
        date_from: params.startsAt,
        date_until: params.endsAt,
      }),
  });
}
