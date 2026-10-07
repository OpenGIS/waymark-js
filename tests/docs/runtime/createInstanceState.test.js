import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInstanceEvents,
  WAYMARK_STATE_DEBUG_CHANGED_EVENT,
  WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT,
} from "../../../src/runtime/createInstanceEvents.js";
import { createInstanceState } from "../../../src/runtime/state/createInstanceState.js";

describe("Runtime state module", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  it("returns a canonical runtime snapshot and protects internal state", () => {
    const state = createInstanceState({
      id: "map",
      events: createInstanceEvents(document.getElementById("map")),
    });

    const snapshot = state.getSnapshot();
    snapshot.types.beer = { visible: false };

    expect(state.getSnapshot()).toEqual({
      debug: false,
      types: {},
    });
  });

  it("dispatches type visibility updates and ignores no-op updates", () => {
    const events = createInstanceEvents(document.getElementById("map"));
    const onVisibilityEvent = vi.fn();
    events.on(WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT, onVisibilityEvent);

    const state = createInstanceState({ id: "map", events });

    expect(
      state.dispatch("types.visibility.set", {
        typeKey: "beer",
        visible: false,
      }),
    ).toBe(true);

    expect(state.getSnapshot().types).toEqual({
      beer: { visible: false },
    });

    expect(
      state.dispatch("types.visibility.set", {
        typeKey: "beer",
        visible: false,
      }),
    ).toBe(false);
    expect(onVisibilityEvent).toHaveBeenCalledTimes(1);
  });

  it("resets hidden types back to the default visible state", () => {
    const events = createInstanceEvents(document.getElementById("map"));
    const state = createInstanceState({
      id: "map",
      events,
      initialState: {
        types: { beer: { visible: false } },
      },
    });

    expect(state.dispatch("types.visibility.reset")).toBe(true);
    expect(state.getSnapshot().types).toEqual({});
    expect(state.dispatch("types.visibility.reset")).toBe(false);
  });

  it("dispatches debug updates and ignores no-op updates", () => {
    const events = createInstanceEvents(document.getElementById("map"));
    const onDebugEvent = vi.fn();
    events.on(WAYMARK_STATE_DEBUG_CHANGED_EVENT, onDebugEvent);

    const state = createInstanceState({ id: "map", events });

    expect(state.dispatch("debug.set", { enabled: true })).toBe(true);
    expect(state.getSnapshot().debug).toBe(true);

    expect(state.dispatch("debug.set", { enabled: true })).toBe(false);
    expect(onDebugEvent).toHaveBeenCalledTimes(1);
  });
});
