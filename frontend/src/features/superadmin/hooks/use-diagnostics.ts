"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchDiagnosticsDefinitions,
  runDiagnostics,
  type DiagnosticRunResponse,
  type RunDiagnosticsVariables,
} from "../diagnostics-api";

/** Registry list — fetched once, never invalidated by run mutations. */
export const DIAGNOSTICS_REGISTRY_QUERY_KEY = [
  "diagnostics",
  "registry",
] as const;

/** Run results are cached per scope, so re-running the same scope overwrites it. */
export function diagnosticsRunQueryKey(
  variables: RunDiagnosticsVariables,
): readonly unknown[] {
  return [
    "diagnostics",
    "run",
    variables.category ?? "booking",
    variables.organizationId ?? null,
    variables.mode ?? "compact",
  ] as const;
}

/**
 * Registry/list of registered diagnostics (useQuery — data, not a user action).
 * Shares the QueryProvider mounted in the superadmin layout.
 */
export function useDiagnosticsRegistryQuery() {
  return useQuery({
    queryKey: DIAGNOSTICS_REGISTRY_QUERY_KEY,
    queryFn: fetchDiagnosticsDefinitions,
  });
}

/**
 * „Pokreni proveru" — an explicit user action, so it is a mutation (not a
 * query). On success the result is written into the query cache under the
 * scope key so a later re-visit shows the same run without refetching.
 */
export function useRunDiagnosticsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: RunDiagnosticsVariables) =>
      runDiagnostics(variables),
    onSuccess: (result: DiagnosticRunResponse, variables) => {
      queryClient.setQueryData(diagnosticsRunQueryKey(variables), result);
    },
  });
}
