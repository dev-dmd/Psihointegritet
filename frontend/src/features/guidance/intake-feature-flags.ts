const matchingEnabled =
  process.env.NEXT_PUBLIC_INTAKE_MATCHING_ENABLED === "true";
const sensitiveSubmissionEnabled =
  process.env.NEXT_PUBLIC_INTAKE_SENSITIVE_SUBMISSION_ENABLED === "true";
const teamQueueEnabled =
  process.env.NEXT_PUBLIC_INTAKE_TEAM_QUEUE_ENABLED === "true";

/**
 * Browser flags only choose whether a rollout is visible. FastAPI and its
 * published legal revisions remain the authority for sensitive-data writes
 * and the exact consent document versions.
 */
export const intakeFeatureFlags = {
  matchingEnabled,
  sensitiveSubmissionEnabled,
  teamQueueEnabled,
} as const;
