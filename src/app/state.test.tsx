import { describe, expect, it } from "vitest";
import { createDefaultState, DEFAULT_TARGET_DURATION_SEC } from "../shared/lib/defaults";
import { reducer } from "./state";

describe("app state reducer", () => {
  it("replaces an existing timer when adding a new one with the same name", () => {
    const state = {
      ...createDefaultState("2026-04-07T08:00:00.000Z"),
      timers: [
        {
          id: "timer-old",
          name: "Leifheit Wäscheständer",
          startAt: "2026-04-06T08:00:00.000Z",
          targetDurationSec: 10,
          status: "active" as const
        }
      ]
    };

    const nextState = reducer(state, {
      type: "ADD_TIMER",
      payload: {
        name: "  Leifheit Wäscheständer  ",
        template: {
          id: "tpl-leifheit",
          name: "Leifheit Wäscheständer",
          emoji: "🧺",
          targetDurationSec: 42
        }
      }
    });

    expect(nextState.timers).toHaveLength(1);
    expect(nextState.timers[0].id).not.toBe("timer-old");
    expect(nextState.timers[0].name).toBe("Leifheit Wäscheständer");
    expect(nextState.timers[0].targetDurationSec).toBe(42);
  });

  it("keeps only the edited timer when it is renamed to an existing name", () => {
    const state = {
      ...createDefaultState("2026-04-07T08:00:00.000Z"),
      timers: [
        {
          id: "timer-a",
          name: "Leifheit Wäscheständer",
          startAt: "2026-04-06T08:00:00.000Z",
          targetDurationSec: DEFAULT_TARGET_DURATION_SEC,
          status: "active" as const
        },
        {
          id: "timer-b",
          name: "Handtücher",
          startAt: "2026-04-07T08:00:00.000Z",
          targetDurationSec: DEFAULT_TARGET_DURATION_SEC,
          status: "active" as const
        }
      ]
    };

    const nextState = reducer(state, {
      type: "UPDATE_TIMER",
      payload: {
        id: "timer-b",
        name: "Leifheit Wäscheständer",
        startAt: "2026-04-07T10:00:00.000Z"
      }
    });

    expect(nextState.timers).toHaveLength(1);
    expect(nextState.timers[0].id).toBe("timer-b");
    expect(nextState.timers[0].name).toBe("Leifheit Wäscheständer");
    expect(nextState.timers[0].startAt).toBe("2026-04-07T10:00:00.000Z");
  });
});
