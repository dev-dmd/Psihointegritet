"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAvailabilityException,
  createAvailabilityProfile,
  createAvailabilityRule,
  deleteAvailabilityException,
  deleteAvailabilityRule,
  getMyTherapistProfile,
  listAvailabilityExceptions,
  listAvailabilityProfiles,
  listAvailabilityRules,
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
