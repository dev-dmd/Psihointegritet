import { describe, expect, it } from "vitest";

import type { CompassSelection } from "./selection";
import {
  COMPASS_CONTINUATION_STORAGE_KEY,
  COMPASS_CONTINUATION_TTL_MS,
  COMPASS_HANDOFF_STORAGE_KEY,
  consumeCompassHandoff,
  readCompassContinuation,
  storeCompassContinuation,
  storeCompassHandoff,
  storeCompassHandoffCandidate,
  type CompassSessionStorage,
} from "./session-storage";

const NOW = new Date("2026-08-01T10:00:00.000Z");

const selection: CompassSelection = {
  topicGroupId: "stress-overload",
  topicIds: ["burnout"],
  audienceIds: ["self"],
  goalIds: ["understand"],
  journeyIntent: "professional_support",
};

class MemoryStorage implements CompassSessionStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("compass session storage", () => {
  it("continues a valid selection in the same browser session", () => {
    const storage = new MemoryStorage();

    expect(
      storeCompassContinuation(selection, "kompas-taxonomy-v1", {
        now: NOW,
        storage,
      }),
    ).toBe(true);

    expect(readCompassContinuation({ now: NOW, storage })).toMatchObject({
      schemaVersion: "1",
      taxonomyVersion: "kompas-taxonomy-v1",
      selection,
    });
    expect(storage.values.has(COMPASS_CONTINUATION_STORAGE_KEY)).toBe(true);
  });

  it("rejects and removes an expired continuation", () => {
    const storage = new MemoryStorage();
    storeCompassContinuation(selection, "kompas-taxonomy-v1", {
      now: NOW,
      storage,
    });

    const afterExpiry = new Date(
      NOW.getTime() + COMPASS_CONTINUATION_TTL_MS + 1,
    );
    expect(readCompassContinuation({ now: afterExpiry, storage })).toBeNull();
    expect(storage.values.has(COMPASS_CONTINUATION_STORAGE_KEY)).toBe(false);
  });

  it("removes a continuation created for another taxonomy version", () => {
    const storage = new MemoryStorage();
    storeCompassContinuation(selection, "kompas-taxonomy-v1", {
      now: NOW,
      storage,
    });

    expect(
      readCompassContinuation({
        now: NOW,
        storage,
        expectedTaxonomyVersion: "kompas-taxonomy-v2",
      }),
    ).toBeNull();
    expect(storage.values.has(COMPASS_CONTINUATION_STORAGE_KEY)).toBe(false);
  });

  it("consumes the neutral Intake handoff exactly once", () => {
    const storage = new MemoryStorage();

    expect(
      storeCompassHandoff(selection, "kompas-taxonomy-v1", {
        now: NOW,
        storage,
      }),
    ).toBe(true);
    expect(consumeCompassHandoff({ now: NOW, storage })).toEqual({
      schemaVersion: "1",
      taxonomyVersion: "kompas-taxonomy-v1",
      topicGroupId: "stress-overload",
      topicIds: ["burnout"],
      audienceIds: ["self"],
      journeyIntent: "professional_support",
      createdAt: NOW.toISOString(),
      expiresAt: new Date(NOW.getTime() + 15 * 60 * 1_000).toISOString(),
    });
    expect(consumeCompassHandoff({ now: NOW, storage })).toBeNull();
    expect(storage.values.has(COMPASS_HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it("stores the backend-normalized handoff candidate, not removed local signals", () => {
    const storage = new MemoryStorage();
    expect(
      storeCompassHandoffCandidate(
        {
          schemaVersion: "1",
          taxonomyVersion: "kompas-taxonomy-v1",
          topicGroupId: "stress-overload",
          topicIds: [],
          audienceIds: ["self"],
          journeyIntent: "explore",
        },
        { now: NOW, storage },
      ),
    ).toBe(true);

    expect(consumeCompassHandoff({ now: NOW, storage })).toMatchObject({
      topicGroupId: "stress-overload",
      topicIds: [],
      audienceIds: ["self"],
      journeyIntent: "explore",
    });
  });

  it("does not store an empty handoff or pass goal/free-text data to Intake", () => {
    const storage = new MemoryStorage();
    expect(
      storeCompassHandoff(
        {
          topicGroupId: null,
          topicIds: [],
          audienceIds: [],
          goalIds: [],
          journeyIntent: null,
        },
        "kompas-taxonomy-v1",
        { now: NOW, storage },
      ),
    ).toBe(false);

    storeCompassHandoff(selection, "kompas-taxonomy-v1", {
      now: NOW,
      storage,
    });
    const raw = storage.getItem(COMPASS_HANDOFF_STORAGE_KEY) ?? "";
    expect(raw).not.toContain("goalIds");
    expect(raw).not.toContain("understand");
    expect(raw).not.toContain("freeText");
  });

  it("does not create a handoff from a goal-only selection", () => {
    const storage = new MemoryStorage();
    storeCompassHandoff(selection, "kompas-taxonomy-v1", {
      now: NOW,
      storage,
    });
    expect(
      storeCompassHandoff(
        {
          topicGroupId: null,
          topicIds: [],
          audienceIds: [],
          goalIds: ["understand"],
          journeyIntent: null,
        },
        "kompas-taxonomy-v1",
        { now: NOW, storage },
      ),
    ).toBe(false);
    expect(storage.values.has(COMPASS_HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it("clears an older handoff when the normalized candidate is empty", () => {
    const storage = new MemoryStorage();
    storeCompassHandoff(selection, "kompas-taxonomy-v1", {
      now: NOW,
      storage,
    });

    expect(
      storeCompassHandoffCandidate(
        {
          schemaVersion: "1",
          taxonomyVersion: "kompas-taxonomy-v1",
          topicGroupId: null,
          topicIds: [],
          audienceIds: [],
          journeyIntent: null,
        },
        { now: NOW, storage },
      ),
    ).toBe(false);
    expect(storage.values.has(COMPASS_HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it("rejects a record whose timestamps are shifted into the future", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      COMPASS_HANDOFF_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1",
        taxonomyVersion: "kompas-taxonomy-v1",
        topicGroupId: "stress-overload",
        topicIds: [],
        audienceIds: [],
        journeyIntent: null,
        createdAt: new Date(NOW.getTime() + 60_000).toISOString(),
        expiresAt: new Date(NOW.getTime() + 16 * 60_000).toISOString(),
      }),
    );

    expect(consumeCompassHandoff({ now: NOW, storage })).toBeNull();
    expect(storage.values.has(COMPASS_HANDOFF_STORAGE_KEY)).toBe(false);
  });

  it("discards malformed or over-capacity handoff data", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      COMPASS_HANDOFF_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: "1",
        taxonomyVersion: "kompas-taxonomy-v1",
        topicGroupId: "stress-overload",
        topicIds: ["one", "two", "three"],
        audienceIds: [],
        journeyIntent: null,
        createdAt: NOW.toISOString(),
        expiresAt: new Date(NOW.getTime() + 60_000).toISOString(),
      }),
    );

    expect(consumeCompassHandoff({ now: NOW, storage })).toBeNull();
    expect(storage.values.has(COMPASS_HANDOFF_STORAGE_KEY)).toBe(false);
  });
});
