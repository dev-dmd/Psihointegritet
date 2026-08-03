"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCompassFlow,
  fetchCompassFlows,
  previewCompassFlow,
  reviewCompassFlow,
  transitionCompassFlow,
  updateCompassFlow,
  type CompassFlowDefinition,
  type CompassFlowVersion,
} from "../compass-flow-api";

const QUERY_KEY = ["compass-flow-versions"] as const;

export function useCompassFlowAdmin(
  initialDefinition: () => CompassFlowDefinition,
) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  const flows = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCompassFlows,
    retry: false,
  });
  const createMutation = useMutation({
    mutationFn: () => createCompassFlow(initialDefinition()),
    onSuccess: refresh,
  });
  const saveMutation = useMutation({
    mutationFn: (input: {
      flow: CompassFlowVersion;
      definition: CompassFlowDefinition;
    }) => updateCompassFlow(input.flow, input.definition),
    onSuccess: refresh,
  });
  const transitionMutation = useMutation({
    mutationFn: (input: {
      flow: CompassFlowVersion;
      target: CompassFlowVersion["status"];
    }) => transitionCompassFlow(input.flow, input.target),
    onSuccess: refresh,
  });
  const reviewMutation = useMutation({
    mutationFn: (input: {
      flow: CompassFlowVersion;
      capability: "clinical" | "business";
    }) => reviewCompassFlow(input.flow, input.capability),
    onSuccess: refresh,
  });
  const previewMutation = useMutation({ mutationFn: previewCompassFlow });
  return {
    flows,
    createMutation,
    saveMutation,
    transitionMutation,
    reviewMutation,
    previewMutation,
  };
}
