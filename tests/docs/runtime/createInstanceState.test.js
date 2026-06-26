import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createInstanceEvents,
  WAYMARK_STATE_CHANGED_EVENT,
  WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
  WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT,
  WAYMARK_STATE_UI_MODE_CHANGED_EVENT,
  WAYMARK_STATE_UI_PANEL_CHANGED_EVENT,
} from "../../../src/runtime/createInstanceEvents.js";
import { createInstanceState } from "../../../src/runtime/state/createInstanceState.js";

describe("Runtime state module", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
  });

  it("returns a canonical runtime snapshot and protects internal state", () => {
    const state = createInstanceState({
      id: "map",
      events: createInstanceEvents("map"),
    });

    const snapshot = state.getSnapshot();
    snapshot.ui.mode = "debug";
    snapshot.map.camera.zoom = 9;

    expect(state.getSnapshot()).toEqual({
      map: {
        camera: {
          center: [0, 0],
          zoom: 2,
          bearing: 0,
          pitch: 0,
        },
        basemaps: {
          vector: [],
          raster: [],
        },
      },
      ui: {
        mode: "view",
        activePanel: null,
        panelContext: null,
      },
    });
  });

  it("dispatches ui.mode updates with scoped and global state events", () => {
    const events = createInstanceEvents("map");
    const onScopedEvent = vi.fn();
    const onGlobalEvent = vi.fn();
    const onSubscribe = vi.fn();

    events.on(WAYMARK_STATE_UI_MODE_CHANGED_EVENT, onScopedEvent);
    events.on(WAYMARK_STATE_CHANGED_EVENT, onGlobalEvent);

    const state = createInstanceState({
      id: "map",
      events,
    });

    state.subscribe(onSubscribe);

    const changed = state.dispatch(
      "ui.mode.set",
      { mode: "debug" },
      "test:ui.mode",
    );

    expect(changed).toBe(true);
    expect(state.getSnapshot().ui.mode).toBe("debug");

    const detail = expect.objectContaining({
      id: "map",
      command: "ui.mode.set",
      scope: "ui.mode",
      previous: "view",
      next: "debug",
      source: "test:ui.mode",
      snapshot: expect.objectContaining({
        ui: expect.objectContaining({
          mode: "debug",
        }),
      }),
    });

    expect(onScopedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail,
      }),
    );
    expect(onGlobalEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail,
      }),
    );
    expect(onSubscribe).toHaveBeenCalledWith(detail);
  });

  it("dispatches map.camera updates and ignores no-op updates", () => {
    const events = createInstanceEvents("map");
    const onCameraEvent = vi.fn();
    events.on(WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT, onCameraEvent);

    const state = createInstanceState({
      id: "map",
      events,
      initialState: {
        map: {
          camera: {
            center: [1, 2],
            zoom: 3,
            bearing: 4,
            pitch: 5,
          },
        },
      },
    });

    expect(
      state.dispatch("map.camera.set", {
        zoom: 10,
      }),
    ).toBe(true);

    expect(state.getSnapshot().map.camera).toEqual({
      center: [1, 2],
      zoom: 10,
      bearing: 4,
      pitch: 5,
    });

    expect(
      state.dispatch("map.camera.set", {
        zoom: 10,
      }),
    ).toBe(false);
    expect(onCameraEvent).toHaveBeenCalledTimes(1);
  });

  it("dispatches ui panel changes for active panel and panel context commands", () => {
    const events = createInstanceEvents("map");
    const onPanelEvent = vi.fn();
    events.on(WAYMARK_STATE_UI_PANEL_CHANGED_EVENT, onPanelEvent);

    const state = createInstanceState({
      id: "map",
      events,
      initialState: {
        ui: {
          mode: "debug",
        },
      },
    });

    expect(
      state.dispatch(
        "ui.activePanel.set",
        {
          activePanel: "debug-output",
        },
        "test:ui.panel.active",
      ),
    ).toBe(true);

    expect(
      state.dispatch(
        "ui.panelContext.set",
        {
          panelContext: {
            source: "test:debug-control",
          },
        },
        "test:ui.panel.context",
      ),
    ).toBe(true);

    expect(state.getSnapshot().ui).toEqual(
      expect.objectContaining({
        mode: "debug",
        activePanel: "debug-output",
        panelContext: {
          source: "test:debug-control",
        },
      }),
    );

    expect(onPanelEvent).toHaveBeenCalledTimes(2);
    expect(onPanelEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        detail: expect.objectContaining({
          scope: "ui.panel",
          command: "ui.activePanel.set",
          source: "test:ui.panel.active",
        }),
      }),
    );
    expect(onPanelEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        detail: expect.objectContaining({
          scope: "ui.panel",
          command: "ui.panelContext.set",
          source: "test:ui.panel.context",
        }),
      }),
    );
  });

  it("dispatches basemap mutation commands and preserves canonical runtime order", () => {
    const events = createInstanceEvents("map");
    const onBasemapsEvent = vi.fn();
    events.on(WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT, onBasemapsEvent);

    const state = createInstanceState({
      id: "map",
      events,
      initialState: {
        map: {
          basemaps: {
            vector: [
              {
                basemapId: "vector-0",
                styleURL: "https://example.com/vector-a.json",
              },
              {
                basemapId: "vector-1",
                styleURL: "https://example.com/vector-b.json",
              },
            ],
            raster: [
              {
                basemapId: "raster-0",
                tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                opacity: 0.4,
              },
              {
                basemapId: "raster-1",
                tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                opacity: 0.7,
              },
            ],
          },
        },
      },
    });

    expect(
      state.dispatch("map.basemaps.raster.opacity.set", {
        basemapId: "raster-1",
        opacity: 0.9,
      }),
    ).toBe(true);
    expect(
      state.dispatch("map.basemaps.raster.reorder", {
        orderedBasemapIds: ["raster-1", "raster-0"],
      }),
    ).toBe(true);
    expect(
      state.dispatch("map.basemaps.vector.active.set", {
        basemapId: "vector-1",
      }),
    ).toBe(true);

    expect(state.getSnapshot().map.basemaps).toEqual({
      vector: [
        expect.objectContaining({
          basemapId: "vector-1",
        }),
        expect.objectContaining({
          basemapId: "vector-0",
        }),
      ],
      raster: [
        expect.objectContaining({
          basemapId: "raster-1",
          opacity: 0.9,
        }),
        expect.objectContaining({
          basemapId: "raster-0",
          opacity: 0.4,
        }),
      ],
    });

    expect(onBasemapsEvent).toHaveBeenCalledTimes(3);
    expect(onBasemapsEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        detail: expect.objectContaining({
          command: "map.basemaps.raster.opacity.set",
          meta: expect.objectContaining({
            mutation: "opacity_changed",
          }),
        }),
      }),
    );
    expect(onBasemapsEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        detail: expect.objectContaining({
          command: "map.basemaps.raster.reorder",
          meta: expect.objectContaining({
            mutation: "reordered",
          }),
        }),
      }),
    );
    expect(onBasemapsEvent).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        detail: expect.objectContaining({
          command: "map.basemaps.vector.active.set",
          meta: expect.objectContaining({
            mutation: "vector_changed",
          }),
        }),
      }),
    );
  });
});
