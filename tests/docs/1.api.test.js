import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("maplibre-gl", () => {
  const MockMap = vi.fn(function (options) {
    this._options = options;
    this._view = {
      center: options.center ?? [0, 0],
      zoom: options.zoom ?? 2,
      bearing: options.bearing ?? 0,
      pitch: options.pitch ?? 0,
    };
    this.on = vi.fn();
    this.off = vi.fn();
    this.remove = vi.fn();
    this.addSource = vi.fn();
    this.addLayer = vi.fn();
    this.loaded = vi.fn(() => false);
    this.getCenter = vi.fn(() => ({
      lng: this._view.center[0],
      lat: this._view.center[1],
    }));
    this.getZoom = vi.fn(() => this._view.zoom);
    this.getBearing = vi.fn(() => this._view.bearing);
    this.getPitch = vi.fn(() => this._view.pitch);
  });
  return { Map: MockMap, setWorkerUrl: vi.fn() };
});

vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { createInstance } from "../../src/entry.js";
import { resolveConfig } from "../../src/config/resolveConfig.js";
import { normaliseInstanceDocument } from "../../src/document/instanceDocument.js";
import {
  clearRuntimeRegistry,
  getCoreById,
} from "../../src/runtime/runtimeRegistry.js";
import { Map } from "maplibre-gl";

function getLastMapInstance() {
  return Map.mock.instances.at(-1);
}

describe("1. API", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="map" style="width: 500px; height: 400px;"></div>';
    vi.clearAllMocks();
    clearRuntimeRegistry();
  });

  describe("Quick start", () => {
    it("creates an instance for a valid container", () => {
      const instance = createInstance({
        config: {
          id: "map",
        },
      });

      expect(instance.id).toBe("map");
      expect(instance.toJSON().config.id).toBe("map");
    });
  });

  describe("Factory signature", () => {
    it("accepts an instance JSON document", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: { options: { zoom: 10 } },
        },
        data: {
          geojson: { type: "FeatureCollection", features: [] },
        },
      });

      expect(instance.id).toBe("map");
      expect(getLastMapInstance().on).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );
    });

    it("accepts an empty instance JSON document", () => {
      const instance = createInstance({});

      expect(instance.id).toMatch(/^waymark-/);
      expect(instance.toJSON().data.geojson).toBeNull();
    });

    it("supports strict round-trip serialisation", () => {
      const first = createInstance({
        config: {
          id: "map",
          ui: { mode: "debug" },
          map: {
            options: {
              center: [-3, 55],
              zoom: 9,
            },
          },
        },
        data: {
          geojson: {
            type: "FeatureCollection",
            features: [],
          },
        },
      });

      const second = createInstance(first.toJSON());

      expect(second.toJSON()).toEqual(first.toJSON());
    });

    it("normalises to strict top-level config/state/data keys", () => {
      const normalised = normaliseInstanceDocument({
        config: {
          id: "map",
        },
        state: {
          map: {
            center: [-3, 55],
            zoom: 8,
            bearing: 20,
            pitch: 30,
            ignored: true,
          },
          ui: {
            mode: "invalid",
          },
        },
        data: {
          geojson: { type: "FeatureCollection", features: [] },
          geoJSON: { type: "FeatureCollection", features: [1] },
        },
        unknown: true,
      });

      expect(Object.keys(normalised)).toEqual(["config", "state", "data"]);
      expect(normalised.state.map).toEqual({
        center: [-3, 55],
        zoom: 8,
        bearing: 20,
        pitch: 30,
      });
      expect(normalised.state.ui.mode).toBe("view");
      expect(normalised.data).toEqual({
        geojson: { type: "FeatureCollection", features: [] },
      });
    });

    it("applies state camera values over config.map.options", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            options: {
              zoom: 4,
              center: [0, 0],
            },
          },
        },
        state: {
          map: {
            zoom: 12,
            center: [-0.1276, 51.5074],
          },
        },
      });

      expect(instance.toJSON().state.map.zoom).toBe(12);
      expect(instance.toJSON().state.map.center).toEqual([-0.1276, 51.5074]);
    });
  });

  describe("Container resolution", () => {
    it("throws when a provided container is missing", () => {
      expect(() =>
        createInstance({
          config: {
            id: "missing-container",
          },
        }),
      ).toThrow('Waymark container "missing-container" was not found.');
    });

    it("creates and appends a random container when id is omitted", () => {
      const instance = createInstance();
      expect(instance.id).toMatch(/^waymark-/);
      expect(document.getElementById(instance.id)).toBeTruthy();
    });
  });

  describe("Config defaults and merge behaviour", () => {
    it("uses documented defaults including attributionControl false", () => {
      createInstance({
        config: {
          id: "map",
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [0, 0],
          zoom: 2,
          style: "https://tiles.openfreemap.org/styles/bright",
          attributionControl: false,
        }),
      );
    });

    it("deeply merges consumer config over defaults", () => {
      const resolved = resolveConfig({
        map: {
          options: {
            camera: {
              padding: {
                top: 24,
              },
            },
          },
        },
      });

      expect(resolved.map.options.zoom).toBe(2);
      expect(resolved.map.options.camera.padding.top).toBe(24);
    });

    it("falls back to view mode when ui.mode is invalid", () => {
      const resolved = resolveConfig({
        ui: {
          mode: "invalid-mode",
        },
      });

      expect(resolved.ui.mode).toBe("view");
    });
  });

  describe("UI shell mode rendering", () => {
    it("keeps the shell mounted with empty mode content in view mode", () => {
      createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
        },
      });

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );

      expect(shellMount).toBeTruthy();
      expect(shellMount.querySelector("details")).toBeNull();
    });

    it("renders debug payload content in debug mode", async () => {
      createInstance({
        config: {
          id: "map",
          ui: {
            mode: "debug",
          },
        },
      });

      await nextTick();

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const summary = shellMount?.querySelector("summary");

      expect(summary?.textContent).toContain("Instance debug payload");
      expect(shellMount?.textContent).toContain('"instanceDocument"');
    });

    it("switches mode by clearing and repopulating shell mode content", async () => {
      const instance = createInstance({
        config: {
          id: "map",
          ui: {
            mode: "debug",
          },
        },
      });

      await nextTick();

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );

      expect(shellMount?.querySelector("details")).toBeTruthy();
      expect(instance.toJSON().state.ui.mode).toBe("debug");

      instance.ui.setMode("view");
      await nextTick();
      expect(shellMount?.querySelector("details")).toBeNull();
      expect(instance.toJSON().state.ui.mode).toBe("view");

      instance.ui.setMode("debug");
      await nextTick();
      expect(shellMount?.querySelector("details")).toBeTruthy();
      expect(instance.toJSON().state.ui.mode).toBe("debug");
    });
  });

  describe("Map options pass-through", () => {
    it("forwards map.options values except container", () => {
      createInstance({
        config: {
          id: "map",
          map: {
            options: {
              center: [-0.1276, 51.5074],
              zoom: 10,
              bearing: 15,
              container: "other",
            },
          },
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [-0.1276, 51.5074],
          zoom: 10,
          bearing: 15,
          container: "map",
        }),
      );
    });

    it("drops non-serialisable map options deterministically", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            options: {
              zoom: 10,
              transformRequest: () => ({ url: "x" }),
              nested: {
                onClick: () => {},
                ok: true,
              },
            },
          },
        },
      });

      expect(instance.toJSON().config.map.options).toEqual(
        expect.objectContaining({
          zoom: 10,
          nested: {
            ok: true,
          },
        }),
      );
      expect(
        instance.toJSON().config.map.options.transformRequest,
      ).toBeUndefined();
      expect(
        instance.toJSON().config.map.options.nested.onClick,
      ).toBeUndefined();
    });
  });

  describe("Returned instance shape", () => {
    it("returns the documented API methods", () => {
      const instance = createInstance({
        config: {
          id: "map",
        },
      });

      expect(instance).toEqual(
        expect.objectContaining({
          id: "map",
          toJSON: expect.any(Function),
          ui: expect.objectContaining({
            setMode: expect.any(Function),
          }),
          destroy: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          once: expect.any(Function),
        }),
      );
    });
  });

  describe("Instance reuse and destroy semantics", () => {
    it("recreates on the same id using the incoming instance JSON", () => {
      const first = createInstance({
        config: {
          id: "map",
          map: { options: { zoom: 10 } },
        },
      });
      const firstMap = getLastMapInstance();

      const second = createInstance({
        config: { id: "map", map: { options: { zoom: 2 } } },
        data: { geojson: { type: "FeatureCollection", features: [] } },
      });
      const secondMap = getLastMapInstance();

      expect(second).not.toBe(first);
      expect(firstMap.remove).toHaveBeenCalledTimes(1);
      expect(Map).toHaveBeenCalledTimes(2);
      expect(secondMap._options.zoom).toBe(2);
      expect(second.toJSON().data.geojson).toEqual({
        type: "FeatureCollection",
        features: [],
      });
    });

    it("destroy is idempotent and allows clean recreation", () => {
      const first = createInstance({
        config: {
          id: "map",
        },
      });
      const firstMap = getLastMapInstance();

      first.destroy();
      first.destroy();

      const second = createInstance({
        config: {
          id: "map",
        },
      });

      expect(firstMap.remove).toHaveBeenCalledTimes(1);
      expect(second).not.toBe(first);
      expect(Map).toHaveBeenCalledTimes(2);
    });

    it("keeps destroy and reuse stable after internal mode switching", () => {
      const first = createInstance({
        config: {
          id: "map",
          ui: { mode: "view" },
        },
      });

      first.ui.setMode("debug");
      first.ui.setMode("view");

      first.destroy();
      expect(
        document.querySelector('#map [data-waymark-app="true"]'),
      ).toBeNull();

      const second = createInstance({
        config: {
          id: "map",
          ui: { mode: "debug" },
        },
      });

      const secondShellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );

      expect(second).not.toBe(first);
      expect(secondShellMount).toBeTruthy();
      expect(secondShellMount?.querySelector("details")).toBeTruthy();
    });
  });

  describe("Instance event API", () => {
    it("supports on/off/once on container events", () => {
      const instance = createInstance({
        config: {
          id: "map",
        },
      });

      const onHandler = vi.fn();
      const onceHandler = vi.fn();

      instance.on("waymark:test", onHandler);
      instance.once("waymark:test", onceHandler);

      const container = document.getElementById("map");
      container.dispatchEvent(new CustomEvent("waymark:test"));
      container.dispatchEvent(new CustomEvent("waymark:test"));

      instance.off("waymark:test", onHandler);
      container.dispatchEvent(new CustomEvent("waymark:test"));

      expect(onHandler).toHaveBeenCalledTimes(2);
      expect(onceHandler).toHaveBeenCalledTimes(1);
    });

    it("emits lifecycle events with id detail", () => {
      const container = document.getElementById("map");
      const created = vi.fn();
      container.addEventListener("waymark:instance.created", created);

      const first = createInstance({
        config: {
          id: "map",
        },
      });

      const reused = vi.fn();
      const destroyed = vi.fn();
      first.on("waymark:instance.recreated", reused);
      first.on("waymark:instance.destroyed", destroyed);
      createInstance({
        config: {
          id: "map",
        },
      });

      first.destroy();

      expect(created.mock.calls[0][0].detail).toEqual({ id: "map" });
      expect(reused).toHaveBeenCalledTimes(1);
      expect(destroyed).toHaveBeenCalledTimes(1);
    });

    it("emits waymark:ui.mode.changed with rich module detail", () => {
      const instance = createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
        },
      });
      const seen = [];

      instance.on("waymark:ui.mode.changed", (event) => {
        seen.push(event.detail);
      });

      instance.ui.setMode("debug");

      expect(seen).toEqual([
        {
          id: "map",
          module: "ui",
          event: "mode.changed",
          previous: "view",
          next: "debug",
          source: "public:ui.setMode",
        },
      ]);
      expect(instance.toJSON().state.ui.mode).toBe("debug");
    });

    it("syncs map camera into state.map on map end events", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            options: {
              center: [0, 0],
              zoom: 5,
            },
          },
        },
      });
      const map = getLastMapInstance();

      map._view = {
        center: [12.3, 45.6],
        zoom: 8,
        bearing: 30,
        pitch: 20,
      };

      for (const [eventName, handler] of map.on.mock.calls) {
        if (eventName === "moveend") {
          handler({ source: "docs-test" });
        }
      }

      expect(instance.toJSON().state.map).toEqual({
        center: [12.3, 45.6],
        zoom: 8,
        bearing: 30,
        pitch: 20,
      });
    });

    it("forwards map events with originalEvent in detail", () => {
      const instance = createInstance({
        config: {
          id: "map",
        },
      });
      const map = getLastMapInstance();

      const seen = [];

      instance.on("waymark:map.moveend", (event) => {
        seen.push(event.detail);
      });

      for (const [eventName, handler] of map.on.mock.calls) {
        if (eventName === "moveend") {
          handler({ source: "docs-test", type: "moveend" });
        }
      }

      expect(seen).toEqual([
        {
          id: "map",
          mapEvent: "moveend",
          originalEvent: {
            source: "docs-test",
            type: "moveend",
          },
        },
      ]);
    });
  });

  describe("Instance JSON shape", () => {
    it("toJSON returns a serialisable instance document payload", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            options: {
              center: [-0.1276, 51.5074],
              zoom: 10,
              bearing: 15,
              pitch: 30,
            },
          },
        },
      });

      expect(instance.toJSON()).toEqual(
        expect.objectContaining({
          config: {
            id: "map",
            map: {
              options: expect.any(Object),
            },
            ui: {
              mode: "view",
            },
          },
          state: {
            map: {
              center: [-0.1276, 51.5074],
              zoom: 10,
              bearing: 15,
              pitch: 30,
            },
            ui: {
              mode: "view",
            },
          },
          data: {
            geojson: null,
          },
        }),
      );
    });

    it("keeps runtime metadata out of toJSON and exposes it in debug payload", () => {
      createInstance({
        config: {
          id: "map",
          ui: { mode: "debug" },
        },
        data: {
          geojson: { type: "FeatureCollection", features: [] },
        },
      });

      const core = getCoreById("map");
      const instanceDocument = core?.publicApi.toJSON();
      const debugPayload = core?.debug.toJSON();

      expect(instanceDocument?.data.geojson).toEqual({
        type: "FeatureCollection",
        features: [],
      });
      expect(debugPayload?.runtime.geojson).toEqual({
        sourceId: "waymark-map-geojson-source",
        layerId: "waymark-map-geojson-layer",
      });
    });
  });

  describe("Initial GeoJSON overlay", () => {
    it("adds source and layer ids scoped by instance id", () => {
      const geoJSON = { type: "FeatureCollection", features: [] };
      const one = createInstance({
        config: {
          id: "map",
        },
        data: {
          geojson: geoJSON,
        },
      });

      document.body.innerHTML +=
        '<div id="map-two" style="width: 500px; height: 400px;"></div>';
      const two = createInstance({
        config: {
          id: "map-two",
        },
        data: {
          geojson: geoJSON,
        },
      });
      const [oneMap, twoMap] = Map.mock.instances;

      for (const [eventName, handler] of oneMap.on.mock.calls) {
        if (eventName === "load") handler();
      }
      for (const [eventName, handler] of twoMap.on.mock.calls) {
        if (eventName === "load") handler();
      }

      expect(oneMap.addSource).toHaveBeenCalledWith(
        "waymark-map-geojson-source",
        expect.any(Object),
      );
      expect(twoMap.addSource).toHaveBeenCalledWith(
        "waymark-map-two-geojson-source",
        expect.any(Object),
      );
    });
  });
});
