import { therapists } from "@/content/therapists";
import type { components } from "@/types/api.generated";

import type {
  IntakeAnswers,
  IntakeMatchResult,
  TherapistMatch,
} from "./matching";
import {
  ADULT_SUBJECT_AGE_BAND,
  REQUESTER_ROLES,
  SUBJECT_AGE_BANDS,
} from "./matching";

export type PublicIntakeSubmissionKind =
  components["schemas"]["IntakeSubmissionKind"];
export type PublicIntakeSubmissionPayload =
  components["schemas"]["PublicIntakeSubmissionRequest"];
export type PublicIntakeSubmissionResponse =
  components["schemas"]["PublicIntakeSubmissionResponse"];
type PublicIntakeMatchResponse =
  components["schemas"]["PublicIntakeMatchResponse"];

export class PublicIntakeApiError extends Error {
  constructor(readonly status: number) {
    super("Public Intake request failed");
  }
}

export function toPublicIntakeAnswers(
  answers: IntakeAnswers,
): components["schemas"]["IntakeAnswersInput"] {
  return {
    reason: answers.reason,
    participants: answers.participants,
    requesterRole: toRequesterRole(answers.requesterRole),
    subjectAgeBand: toSubjectAgeBand(answers.subjectAgeBand),
    priorTherapy:
      answers.priorTherapy === "Da" || answers.priorTherapy === "Ne"
        ? answers.priorTherapy
        : null,
    goal: answers.goal,
    format: answers.format,
    location: answers.location,
  };
}

export async function fetchAuthoritativeIntakeMatch(
  answers: IntakeAnswers,
  signal?: AbortSignal,
): Promise<IntakeMatchResult> {
  const response = await fetch("/api/intake/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: toPublicIntakeAnswers(answers) }),
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new PublicIntakeApiError(response.status);
  }
  return toDisplayMatchResult(
    (await response.json()) as PublicIntakeMatchResponse,
  );
}

export async function submitPublicIntakeCase(
  payload: PublicIntakeSubmissionPayload,
  idempotencyKey: string,
): Promise<PublicIntakeSubmissionResponse> {
  const response = await fetch("/api/intake/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new PublicIntakeApiError(response.status);
  }
  return (await response.json()) as PublicIntakeSubmissionResponse;
}

function toDisplayMatchResult(
  response: PublicIntakeMatchResponse,
): IntakeMatchResult {
  const recommendedTherapists: TherapistMatch[] = response.candidates.flatMap(
    (candidate) => {
      const therapist = therapists.find((item) => item.slug === candidate.slug);
      return therapist ? [{ therapist, reasons: candidate.reasons }] : [];
    },
  );

  return {
    recommendedTherapists,
    primaryRecommendation: recommendedTherapists[0] ?? null,
    alternativeRecommendation: recommendedTherapists[1] ?? null,
    showBoth: response.showMultipleOptions,
    recommendedService: response.service.name,
    onlineFallback: response.onlineFallback,
    needsManualReview: response.requiresHumanReview,
    controlledMinorFlow: response.controlledMinorFlow,
    scoreBreakdown: {},
  };
}

function toRequesterRole(
  value: string | null,
): components["schemas"]["RequesterRole"] {
  if (value === REQUESTER_ROLES.guardian) return "guardian";
  if (value === REQUESTER_ROLES.adolescent) return "adolescent_16_17";
  if (value === REQUESTER_ROLES.informationOnly) return "information_only";
  return "self_adult";
}

function toSubjectAgeBand(
  value: string | null,
): components["schemas"]["SubjectAgeBand"] {
  if (value === SUBJECT_AGE_BANDS[0]) return "under_12";
  if (value === SUBJECT_AGE_BANDS[1]) return "12_15";
  if (value === SUBJECT_AGE_BANDS[2]) return "16_17";
  if (value === ADULT_SUBJECT_AGE_BAND) return "adult";
  return "adult";
}
