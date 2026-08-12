"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAvailabilityException,
  createAvailabilityProfile,
  copyWeek,
  createAvailabilityRule,
  deleteAvailabilityException,
  deleteAvailabilityRule,
  createManualSlot,
  deleteManualSlot,
  generateWeek,
  getAvailabilitySummary,
  getMyTherapistProfile,
  listAvailabilityTherapists,
  listManualSlots,
  listAvailabilityExceptions,
  listAvailabilityProfiles,
  listAvailabilityRules,
  replaceAvailabilityRules,
  updateAvailabilityProfile,
  type AvailabilityExceptionInput,
  type AvailabilityProfileInput,
  type AvailabilityRuleInput,
} from "@/lib/api/availability";

/**
 * Availability transport lifecycle, kept out of the UI per the architecture
 * rule that no component declares its own query or mutation.
 */

export const availabilityKeys = {
  all: ["availability"] as const,
  profiles: (therapistProfileId: string) =>
    [...availabilityKeys.all, "profiles", therapistProfileId] as const,
  rules: (profileId: string) =>
    [...availabilityKeys.all, "rules", profileId] as const,
  therapists: () => [...availabilityKeys.all, "therapists"] as const,
  summary: (therapistProfileId: string, weekStart: string) =>
    [
      ...availabilityKeys.all,
      "summary",
      therapistProfileId,
      weekStart,
    ] as const,
  slots: (profileId: string, from: string, until: string) =>
    [...availabilityKeys.all, "slots", profileId, from, until] as const,
  exceptions: (therapistProfileId: string, from: string, until: string) =>
    [
      ...availabilityKeys.all,
      "exceptions",
      therapistProfileId,
      from,
      until,
    ] as const,
};

export function useMyTherapistProfile() {
  return useQuery({
    queryKey: [...availabilityKeys.all, "me"] as const,
    queryFn: getMyTherapistProfile,
    staleTime: 5 * 60_000,
  });
}

export function useAvailabilityProfiles(therapistProfileId: string | null) {
  return useQuery({
    queryKey: availabilityKeys.profiles(therapistProfileId ?? ""),
    queryFn: () => listAvailabilityProfiles(therapistProfileId!),
    enabled: therapistProfileId !== null,
  });
}

export function useAvailabilityRules(profileId: string | null) {
  return useQuery({
    queryKey: availabilityKeys.rules(profileId ?? ""),
    queryFn: () => listAvailabilityRules(profileId!),
    enabled: profileId !== null,
  });
}

export function useAvailabilityExceptions(
  therapistProfileId: string | null,
  dateFrom: string,
  dateUntil: string,
) {
  return useQuery({
    queryKey: availabilityKeys.exceptions(
      therapistProfileId ?? "",
      dateFrom,
      dateUntil,
    ),
    queryFn: () =>
      listAvailabilityExceptions(therapistProfileId!, dateFrom, dateUntil),
    enabled: therapistProfileId !== null,
  });
}

export function useSaveAvailabilityProfile(therapistProfileId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      profileId,
      payload,
    }: {
      profileId: string | null;
      payload: AvailabilityProfileInput;
    }) =>
      profileId === null
        ? createAvailabilityProfile(payload)
        : updateAvailabilityProfile(profileId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: availabilityKeys.profiles(therapistProfileId ?? ""),
      });
    },
  });
}

export function useCreateAvailabilityRule(profileId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvailabilityRuleInput) =>
      createAvailabilityRule(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: availabilityKeys.rules(profileId ?? ""),
      });
    },
  });
}

export function useDeleteAvailabilityRule(profileId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => deleteAvailabilityRule(ruleId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: availabilityKeys.rules(profileId ?? ""),
      });
    },
  });
}

export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvailabilityExceptionInput) =>
      createAvailabilityException(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...availabilityKeys.all, "exceptions"],
      });
    },
  });
}

export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (exceptionId: string) =>
      deleteAvailabilityException(exceptionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...availabilityKeys.all, "exceptions"],
      });
    },
  });
}

// ── Layer 2: generated slots ────────────────────────────────────────────────

export function useAvailabilityTherapists() {
  return useQuery({
    queryKey: availabilityKeys.therapists(),
    queryFn: listAvailabilityTherapists,
    staleTime: 5 * 60_000,
  });
}

export function useManualSlots(
  profileId: string | null,
  dateFrom: string,
  dateUntil: string,
) {
  return useQuery({
    queryKey: availabilityKeys.slots(profileId ?? "", dateFrom, dateUntil),
    queryFn: () => listManualSlots(profileId!, dateFrom, dateUntil),
    enabled: profileId !== null,
  });
}

function useSlotInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: [...availabilityKeys.all, "slots"],
    });
  };
}

export function useGenerateWeek(profileId: string | null) {
  const invalidate = useSlotInvalidation();
  return useMutation({
    mutationFn: (weekStart: string) => generateWeek(profileId!, weekStart),
    onSuccess: invalidate,
  });
}

export function useCopyWeek(profileId: string | null) {
  const invalidate = useSlotInvalidation();
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      copyWeek(profileId!, from, to),
    onSuccess: invalidate,
  });
}

export function useDeleteManualSlot() {
  const invalidate = useSlotInvalidation();
  return useMutation({
    mutationFn: (slotId: string) => deleteManualSlot(slotId),
    onSuccess: invalidate,
  });
}

// ── Profile cards ───────────────────────────────────────────────────────────

export function useAvailabilitySummary(
  therapistProfileId: string | null,
  weekStart: string,
) {
  return useQuery({
    queryKey: availabilityKeys.summary(therapistProfileId ?? "", weekStart),
    queryFn: () => getAvailabilitySummary(therapistProfileId!, weekStart),
    enabled: therapistProfileId !== null,
  });
}

/** Atomic replacement of a profile's week; invalidates rules and the cards. */
/**
 * The profile id travels with the call, not with the hook.
 *
 * Binding it at hook creation sent `null` on the very first save: the profile
 * did not exist yet when the component rendered, so the body carried
 * `availability_profile_id: null` and the API answered 422.
 */
export function useReplaceAvailabilityRules(profileId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      availabilityProfileId,
      rules,
    }: {
      availabilityProfileId: string;
      rules: AvailabilityRuleInput[];
    }) => replaceAvailabilityRules(availabilityProfileId, rules),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: availabilityKeys.rules(profileId ?? ""),
      });
      void queryClient.invalidateQueries({
        queryKey: [...availabilityKeys.all, "summary"],
      });
      void queryClient.invalidateQueries({
        queryKey: [...availabilityKeys.all, "slots"],
      });
    },
  });
}

/** Explicit start entered by the therapist (`manual_slots` mode, §5.2). */
export function useCreateManualSlot() {
  const invalidate = useSlotInvalidation();
  return useMutation({
    mutationFn: (payload: {
      availability_profile_id: string;
      starts_at: string;
      format: string;
    }) => createManualSlot(payload),
    onSuccess: invalidate,
  });
}
