import {
  COMPASS_JOURNEY_INTENTS,
  COMPASS_MAX_TOPIC_SELECTIONS,
  type CompassJourneyIntent,
  type CompassSelection,
} from "./selection";
import type { CompassHandoffCandidate } from "@/lib/compass/types";

export const COMPASS_CONTINUATION_STORAGE_KEY =
  "psihointegritet:compass-continuation:v1";
export const COMPASS_HANDOFF_STORAGE_KEY =
  "psihointegritet:compass-intake-handoff:v1";

export const COMPASS_CONTINUATION_TTL_MS = 30 * 60 * 1_000;
export const COMPASS_HANDOFF_TTL_MS = 15 * 60 * 1_000;

const STABLE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_STABLE_ID_LENGTH = 80;
const MAX_TAXONOMY_VERSION_LENGTH = 80;

export interface CompassContinuationV1 {
  schemaVersion: "1";
  taxonomyVersion: string;
  selection: CompassSelection;
  createdAt: string;
  expiresAt: string;
}

/** Neutral, user-confirmable context passed to Intake exactly once. */
export interface CompassHandoffContextV1 {
  schemaVersion: "1";
  taxonomyVersion: string;
  topicGroupId: string | null;
  topicIds: string[];
  audienceIds: string[];
  journeyIntent: CompassJourneyIntent | null;
  createdAt: string;
  expiresAt: string;
}

export interface CompassSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface TimestampEnvelope {
  createdAt: string;
  expiresAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStableId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 2 &&
    value.length <= MAX_STABLE_ID_LENGTH &&
    STABLE_ID_PATTERN.test(value)
  );
}

function isTaxonomyVersion(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_TAXONOMY_VERSION_LENGTH
  );
}

function parseStableIds(value: unknown, maximum: number): string[] | null {
  if (!Array.isArray(value) || value.length > maximum) return null;
  if (!value.every(isStableId)) return null;
  if (new Set(value).size !== value.length) return null;
  return [...value];
}

function parseNullableStableId(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isStableId(value) ? value : undefined;
}

function parseJourneyIntent(
  value: unknown,
): CompassJourneyIntent | null | undefined {
  if (value === null) return null;
  return typeof value === "string" &&
    COMPASS_JOURNEY_INTENTS.some((intent) => intent === value)
    ? (value as CompassJourneyIntent)
    : undefined;
}

function parseTimestampEnvelope(
  value: Record<string, unknown>,
  now: Date,
  maximumTtlMs: number,
): TimestampEnvelope | null {
  if (
    typeof value.createdAt !== "string" ||
    typeof value.expiresAt !== "string"
  ) {
    return null;
  }
  const createdAtMs = Date.parse(value.createdAt);
  const expiresAtMs = Date.parse(value.expiresAt);
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(expiresAtMs))
    return null;
  const nowMs = now.getTime();
  if (createdAtMs > nowMs || expiresAtMs <= nowMs || expiresAtMs <= createdAtMs)
    return null;
  if (expiresAtMs - createdAtMs > maximumTtlMs) return null;
  if (expiresAtMs > nowMs + maximumTtlMs) return null;
  return { createdAt: value.createdAt, expiresAt: value.expiresAt };
}

function timestamps(now: Date, ttlMs: number): TimestampEnvelope {
  return {
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

function browserSessionStorage(): CompassSessionStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function resolveStorage(
  storage: CompassSessionStorage | null | undefined,
): CompassSessionStorage | null {
  return storage === undefined ? browserSessionStorage() : storage;
}

function safeSet(
  key: string,
  value: unknown,
  storage: CompassSessionStorage | null,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function safeRemove(
  key: string,
  storage: CompassSessionStorage | null,
): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function safeRead(
  key: string,
  storage: CompassSessionStorage | null,
  consume: boolean,
): unknown {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (consume) storage.removeItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    if (consume) {
      try {
        storage.removeItem(key);
      } catch {
        // An unavailable browser storage must not break the public flow.
      }
    }
    return null;
  }
}

function parseSelection(value: unknown): CompassSelection | null {
  if (!isRecord(value)) return null;
  const topicGroupId = parseNullableStableId(value.topicGroupId);
  const topicIds = parseStableIds(value.topicIds, COMPASS_MAX_TOPIC_SELECTIONS);
  const audienceIds = parseStableIds(value.audienceIds, 1);
  const goalIds = parseStableIds(value.goalIds, 1);
  const journeyIntent = parseJourneyIntent(value.journeyIntent);
  if (
    topicGroupId === undefined ||
    topicIds === null ||
    audienceIds === null ||
    goalIds === null ||
    journeyIntent === undefined
  ) {
    return null;
  }
  return { topicGroupId, topicIds, audienceIds, goalIds, journeyIntent };
}

export function createCompassContinuation(
  selection: CompassSelection,
  taxonomyVersion: string,
  now = new Date(),
): CompassContinuationV1 {
  return {
    schemaVersion: "1",
    taxonomyVersion,
    selection,
    ...timestamps(now, COMPASS_CONTINUATION_TTL_MS),
  };
}

export function parseCompassContinuation(
  value: unknown,
  now = new Date(),
): CompassContinuationV1 | null {
  if (!isRecord(value) || value.schemaVersion !== "1") return null;
  if (!isTaxonomyVersion(value.taxonomyVersion)) return null;
  const selection = parseSelection(value.selection);
  const envelope = parseTimestampEnvelope(
    value,
    now,
    COMPASS_CONTINUATION_TTL_MS,
  );
  if (!selection || !envelope) return null;
  return {
    schemaVersion: "1",
    taxonomyVersion: value.taxonomyVersion,
    selection,
    ...envelope,
  };
}

export function storeCompassContinuation(
  selection: CompassSelection,
  taxonomyVersion: string,
  options: { now?: Date; storage?: CompassSessionStorage | null } = {},
): boolean {
  return safeSet(
    COMPASS_CONTINUATION_STORAGE_KEY,
    createCompassContinuation(selection, taxonomyVersion, options.now),
    resolveStorage(options.storage),
  );
}

export function readCompassContinuation(
  options: {
    now?: Date;
    storage?: CompassSessionStorage | null;
    expectedTaxonomyVersion?: string;
  } = {},
): CompassContinuationV1 | null {
  const storage = resolveStorage(options.storage);
  let parsed = parseCompassContinuation(
    safeRead(COMPASS_CONTINUATION_STORAGE_KEY, storage, false),
    options.now,
  );
  if (
    parsed &&
    options.expectedTaxonomyVersion !== undefined &&
    parsed.taxonomyVersion !== options.expectedTaxonomyVersion
  ) {
    parsed = null;
  }
  if (!parsed && storage) {
    try {
      storage.removeItem(COMPASS_CONTINUATION_STORAGE_KEY);
    } catch {
      // An unavailable browser storage must not break the public flow.
    }
  }
  return parsed;
}

export function createCompassHandoffContext(
  selection: CompassSelection,
  taxonomyVersion: string,
  now = new Date(),
): CompassHandoffContextV1 | null {
  if (!hasTransferableHandoffSignal(selection)) return null;
  return {
    schemaVersion: "1",
    taxonomyVersion,
    topicGroupId: selection.topicGroupId,
    topicIds: [...selection.topicIds],
    audienceIds: [...selection.audienceIds],
    journeyIntent: selection.journeyIntent,
    ...timestamps(now, COMPASS_HANDOFF_TTL_MS),
  };
}

function hasTransferableHandoffSignal(
  selection: Pick<
    CompassSelection,
    "topicGroupId" | "topicIds" | "audienceIds" | "journeyIntent"
  >,
): boolean {
  return Boolean(
    selection.topicGroupId ||
    selection.topicIds.length > 0 ||
    selection.audienceIds.length > 0 ||
    selection.journeyIntent,
  );
}

/** Builds the one-shot record from the backend-normalized candidate. */
export function createCompassHandoffContextFromCandidate(
  candidate: CompassHandoffCandidate,
  now = new Date(),
): CompassHandoffContextV1 | null {
  return parseCompassHandoffContext(
    {
      schemaVersion: candidate.schemaVersion,
      taxonomyVersion: candidate.taxonomyVersion,
      topicGroupId: candidate.topicGroupId ?? null,
      topicIds: candidate.topicIds,
      audienceIds: candidate.audienceIds,
      journeyIntent: candidate.journeyIntent ?? null,
      ...timestamps(now, COMPASS_HANDOFF_TTL_MS),
    },
    now,
  );
}

export function parseCompassHandoffContext(
  value: unknown,
  now = new Date(),
): CompassHandoffContextV1 | null {
  if (!isRecord(value) || value.schemaVersion !== "1") return null;
  if (!isTaxonomyVersion(value.taxonomyVersion)) return null;
  const topicGroupId = parseNullableStableId(value.topicGroupId);
  const topicIds = parseStableIds(value.topicIds, COMPASS_MAX_TOPIC_SELECTIONS);
  const audienceIds = parseStableIds(value.audienceIds, 1);
  const journeyIntent = parseJourneyIntent(value.journeyIntent);
  const envelope = parseTimestampEnvelope(value, now, COMPASS_HANDOFF_TTL_MS);
  if (
    topicGroupId === undefined ||
    topicIds === null ||
    audienceIds === null ||
    journeyIntent === undefined ||
    !envelope
  ) {
    return null;
  }
  const context: CompassHandoffContextV1 = {
    schemaVersion: "1",
    taxonomyVersion: value.taxonomyVersion,
    topicGroupId,
    topicIds,
    audienceIds,
    journeyIntent,
    ...envelope,
  };
  return hasTransferableHandoffSignal(context) ? context : null;
}

export function storeCompassHandoff(
  selection: CompassSelection,
  taxonomyVersion: string,
  options: { now?: Date; storage?: CompassSessionStorage | null } = {},
): boolean {
  const storage = resolveStorage(options.storage);
  // A new handoff attempt always supersedes the previous one. Clear first so
  // an empty/invalid selection or a failed write can never resurrect stale
  // context from an earlier Compass visit.
  safeRemove(COMPASS_HANDOFF_STORAGE_KEY, storage);
  const context = createCompassHandoffContext(
    selection,
    taxonomyVersion,
    options.now,
  );
  if (!context) return false;
  return safeSet(COMPASS_HANDOFF_STORAGE_KEY, context, storage);
}

export function storeCompassHandoffCandidate(
  candidate: CompassHandoffCandidate,
  options: { now?: Date; storage?: CompassSessionStorage | null } = {},
): boolean {
  const storage = resolveStorage(options.storage);
  safeRemove(COMPASS_HANDOFF_STORAGE_KEY, storage);
  const context = createCompassHandoffContextFromCandidate(
    candidate,
    options.now,
  );
  if (!context) return false;
  return safeSet(COMPASS_HANDOFF_STORAGE_KEY, context, storage);
}

/** Reads and removes the handoff before parsing, so even malformed data is one-shot. */
export function consumeCompassHandoff(
  options: { now?: Date; storage?: CompassSessionStorage | null } = {},
): CompassHandoffContextV1 | null {
  return parseCompassHandoffContext(
    safeRead(
      COMPASS_HANDOFF_STORAGE_KEY,
      resolveStorage(options.storage),
      true,
    ),
    options.now,
  );
}
