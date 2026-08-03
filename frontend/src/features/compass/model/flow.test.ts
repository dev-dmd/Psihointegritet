import { describe, expect, it } from "vitest";

import type { PublicTaxonomyCollection } from "@/lib/compass/types";
import type { components } from "@/types/api.generated";

import { nextFlowStep, optionsForQuestion, selectFlowValues } from "./flow";
import { EMPTY_COMPASS_SELECTION } from "./selection";

type FlowQuestion = components["schemas"]["FlowQuestion"];

const taxonomy = {
  taxonomyVersion: "kompas-taxonomy-v1",
  locale: "sr-Latn",
  terms: [
    {
      termId: "00000000-0000-0000-0000-000000000001",
      axis: "topic",
      stableId: "burnout",
      canonicalPath: "/kompas/tema/burnout",
      publicLabel: "Sagorevanje",
      shortDescription: "Opis",
      parentStableId: "stress",
      journeyIntent: null,
      sortOrder: 2,
      iconKey: null,
      assetId: null,
      searchTerms: [],
      relatedStableIds: [],
    },
    {
      termId: "00000000-0000-0000-0000-000000000002",
      axis: "topic",
      stableId: "relationships",
      canonicalPath: "/kompas/tema/relationships",
      publicLabel: "Odnosi",
      shortDescription: "Opis",
      parentStableId: "relationships-area",
      journeyIntent: null,
      sortOrder: 1,
      iconKey: null,
      assetId: null,
      searchTerms: [],
      relatedStableIds: [],
    },
  ],
} satisfies PublicTaxonomyCollection;

const topicsQuestion = {
  questionId: "topics",
  prompt: "Teme",
  helpText: "",
  selectionTarget: "topics",
  inputMode: "multi_select",
  optionSource: "taxonomy_axis",
  taxonomyAxis: "topic",
  allowedTermIds: [],
  filterTopicsBySelectedArea: true,
  maxSelections: 2,
  optional: true,
  defaultNextQuestionId: null,
  skipNextQuestionId: null,
  staticOptions: [],
  terminal: "results",
} satisfies FlowQuestion;

describe("Kompas flow evaluator", () => {
  it("uses published taxonomy and filters topics by selected area", () => {
    const options = optionsForQuestion(topicsQuestion, taxonomy, {
      ...EMPTY_COMPASS_SELECTION,
      topicGroupId: "stress",
    });
    expect(options.map((option) => option.id)).toEqual(["burnout"]);
  });

  it("maps no more than two topics into CompassSelection", () => {
    const output = selectFlowValues(EMPTY_COMPASS_SELECTION, topicsQuestion, [
      "one",
      "two",
      "three",
    ]);
    expect(output.topicIds).toEqual(["one", "two"]);
  });

  it("maps the sentinel to the controlled starting-package terminal", () => {
    const question = {
      ...topicsQuestion,
      selectionTarget: "none",
      inputMode: "single_select",
      optionSource: "static",
      maxSelections: 1,
      staticOptions: [
        {
          optionId: "unsure",
          label: "Nisam siguran/na",
          selectionValue: null,
          nextQuestionId: null,
          terminal: "starting_package",
        },
      ],
    } satisfies FlowQuestion;
    expect(nextFlowStep(question, "unsure")).toEqual({
      nextQuestionId: null,
      terminal: "starting_package",
    });
  });
});
