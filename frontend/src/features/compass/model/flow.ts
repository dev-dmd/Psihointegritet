import type { PublicTaxonomyCollection } from "@/lib/compass/types";
import type { components } from "@/types/api.generated";

import type { CompassSelection } from "./selection";

type FlowQuestion = components["schemas"]["FlowQuestion"];

export interface FlowOptionView {
  id: string;
  label: string;
  note?: string;
}

export function optionsForQuestion(
  question: FlowQuestion,
  taxonomy: PublicTaxonomyCollection,
  selection: CompassSelection,
): FlowOptionView[] {
  if (question.optionSource === "static") {
    return (question.staticOptions ?? []).map((option) => ({
      id: option.optionId,
      label: option.label,
    }));
  }
  const allowed = new Set(question.allowedTermIds);
  return taxonomy.terms
    .filter(
      (term) =>
        term.axis === question.taxonomyAxis &&
        (allowed.size === 0 || allowed.has(term.stableId)) &&
        (!question.filterTopicsBySelectedArea ||
          !selection.topicGroupId ||
          term.parentStableId === selection.topicGroupId),
    )
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.publicLabel.localeCompare(right.publicLabel, "sr-Latn"),
    )
    .map((term) => ({
      id: term.stableId,
      label: term.publicLabel,
      note: term.shortDescription,
    }));
}

export function selectFlowValues(
  selection: CompassSelection,
  question: FlowQuestion,
  optionIds: string[],
): CompassSelection {
  const values =
    question.optionSource === "static"
      ? optionIds.flatMap((optionId) => {
          const value = (question.staticOptions ?? []).find(
            (option) => option.optionId === optionId,
          )?.selectionValue;
          return value ? [value] : [];
        })
      : optionIds;
  switch (question.selectionTarget) {
    case "topic_group":
      return {
        ...selection,
        topicGroupId: values[0] ?? null,
        topicIds:
          selection.topicGroupId === values[0] ? selection.topicIds : [],
      };
    case "topics":
      return { ...selection, topicIds: values.slice(0, 2) };
    case "audience":
      return { ...selection, audienceIds: values.slice(0, 1) };
    case "content_goals":
      return { ...selection, goalIds: values };
    case "journey_intent":
      return {
        ...selection,
        journeyIntent:
          values[0] === "explore" ||
          values[0] === "professional_support" ||
          values[0] === "both"
            ? values[0]
            : null,
      };
    case "none":
      return selection;
  }
}

export function nextFlowStep(
  question: FlowQuestion,
  selectedOptionId?: string,
): {
  nextQuestionId: string | null;
  terminal: "results" | "starting_package" | null;
} {
  const option = selectedOptionId
    ? (question.staticOptions ?? []).find(
        (item) => item.optionId === selectedOptionId,
      )
    : undefined;
  return {
    nextQuestionId:
      option?.nextQuestionId ??
      (selectedOptionId
        ? question.defaultNextQuestionId
        : question.skipNextQuestionId) ??
      null,
    terminal: option?.terminal ?? question.terminal ?? null,
  };
}
