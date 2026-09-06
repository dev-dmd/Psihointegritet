import { describe, expect, it } from "vitest";

import { initialActivity, initialGates } from "./data";
import { gatesReducer, type GatesState } from "./gates-context";

const state: GatesState = { gates: initialGates, activity: initialActivity };

/**
 * The reducer no longer builds the feed title — it cannot, being a pure
 * function outside React, and the copy now lives in the message catalogue. The
 * caller renders the title and passes it in, so these tests supply what the
 * provider would and keep asserting the state transition, which is the
 * reducer's actual job.
 */
describe("gatesReducer", () => {
  it("toggles a gate off and prepends an activity entry with name and reason", () => {
    const next = gatesReducer(state, {
      type: "toggle-gate",
      gateId: "g1",
      reason: "Dogovor sa vlasnicom centra",
      title: "Isključen feature gate — Intake & Matching",
    });
    expect(next.gates.find((g) => g.id === "g1")?.status).toBe("off");
    expect(next.activity.length).toBe(state.activity.length + 1);
    expect(next.activity[0]?.title).toBe(
      "Isključen feature gate — Intake & Matching",
    );
    expect(next.activity[0]?.detail).toContain(
      "razlog: Dogovor sa vlasnicom centra",
    );
    expect(next.activity[0]?.kind).toBe("gate");
  });

  it("toggles an off gate back on", () => {
    const off = gatesReducer(state, {
      type: "toggle-gate",
      gateId: "g8",
      reason: "test",
      title: "Uključen feature gate — Loyalty Engine",
    });
    expect(off.gates.find((g) => g.id === "g8")?.status).toBe("on");
    expect(off.activity[0]?.title).toBe(
      "Uključen feature gate — Loyalty Engine",
    );
  });

  it("never touches coming_soon gates", () => {
    const next = gatesReducer(state, {
      type: "toggle-gate",
      gateId: "g6",
      reason: "pokusaj",
      title: "irrelevant — this transition is refused",
    });
    expect(next).toBe(state);
  });

  it("ignores unknown gate ids", () => {
    const next = gatesReducer(state, {
      type: "toggle-gate",
      gateId: "nepostojeci",
      reason: "x",
      title: "irrelevant — this transition is refused",
    });
    expect(next).toBe(state);
  });
});
