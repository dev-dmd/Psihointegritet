const matchingEnabled =
  process.env.NEXT_PUBLIC_INTAKE_MATCHING_ENABLED === "true";
const sensitiveSubmissionEnabled =
  process.env.NEXT_PUBLIC_INTAKE_SENSITIVE_SUBMISSION_ENABLED === "true";
const dataProcessingNoticeVersion =
  process.env.NEXT_PUBLIC_INTAKE_DATA_PROCESSING_NOTICE_VERSION ?? "";
const requestAcknowledgementVersion =
  process.env.NEXT_PUBLIC_INTAKE_REQUEST_ACKNOWLEDGEMENT_VERSION ?? "";
const teamQueueEnabled =
  process.env.NEXT_PUBLIC_INTAKE_TEAM_QUEUE_ENABLED === "true";

/**
 * Browser flags only choose the public UI. FastAPI remains the authority for
 * sensitive-data writes and validates the same document versions server-side.
 */
export const intakeFeatureFlags = {
  matchingEnabled,
  sensitiveSubmissionEnabled,
  dataProcessingNoticeVersion,
  requestAcknowledgementVersion,
  teamQueueEnabled,
  publicFlowEnabled:
    matchingEnabled &&
    sensitiveSubmissionEnabled &&
    Boolean(dataProcessingNoticeVersion) &&
    Boolean(requestAcknowledgementVersion),
} as const;
