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
import {
  clearRuntimeRegistry,
  getCoreById,
} from "../../src/core/runtimeRegistry.js";
import { Map } from "maplibre-gl";

describe("1. API", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="map" style="width: 500px; height: 400px;"></div>';
    vi.clearAllMocks();
    clearRuntimeRegistry();
  });

  describe("Quick start", () => {
    it("creates an instance for a valid container", () => {
      const instance = createInstance({ id: "map" });
      expect(instance.id).toBe("map");
      expect(instance.map).toBeTruthy();
    });
  });

  describe("Factory signature", () => {
    it("accepts config and geoJSON", () => {
      const geoJSON = { type: "FeatureCollection", features: [] };
      const instance = createInstance(
        { id: "map", map: { options: { zoom: 10 } } },
        geoJSON,
      );

      expect(instance.id).toBe("map");
      expect(instance.map.on).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );
    });

    it("accepts an empty config object with geoJSON", () => {
      const geoJSON = { type: "FeatureCollection", features: [] };
      const instance = createInstance({}, geoJSON);

      expect(instance.id).toMatch(/^waymark-/);
      expect(instance.map.on).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );
    });
  });

  describe("Container resolution", () => {
    it("throws when a provided container is missing", () => {
      expect(() => createInstance({ id: "missing-container" })).toThrow(
        'Waymark container "missing-container" was not found.',
      );
    });

    it("creates and appends a random container when id is omitted", () => {
      const instance = createInstance();
      expect(instance.id).toMatch(/^waymark-/);
      expect(document.getElementById(instance.id)).toBeTruthy();
    });
  });

  describe("Config defaults and merge behaviour", () => {
    it("uses documented defaults including attributionControl false", () => {
      createInstance({ id: "map" });
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
        id: "map",
        ui: {
          mode: "view",
        },
      });

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );

      expect(shellMount).toBeTruthy();
      expect(shellMount.querySelector("details")).toBeNull();
    });

    it("renders snapshot content in debug mode", async () => {
      createInstance({
        id: "map",
        ui: {
          mode: "debug",
        },
      });

      await nextTick();

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const summary = shellMount?.querySelector("summary");

      expect(summary?.textContent).toContain("Instance snapshot");
      expect(shellMount?.textContent).toContain('"version": 1');
    });

    it("switches mode by clearing and repopulating shell mode content", async () => {
      const instance = createInstance({
        id: "map",
        ui: {
          mode: "debug",
        },
      });

      await nextTick();

      const core = getCoreById("map");
      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );

      expect(shellMount?.querySelector("details")).toBeTruthy();
      expect(instance.getSnapshot().ui.mode).toBe("debug");

      core.lifecycle.setMode("view");
      await nextTick();
      expect(shellMount?.querySelector("details")).toBeNull();
      expect(instance.getSnapshot().ui.mode).toBe("view");

      core.lifecycle.setMode("debug");
      await nextTick();
      expect(shellMount?.querySelector("details")).toBeTruthy();
      expect(instance.getSnapshot().ui.mode).toBe("debug");
    });
  });

  describe("Map options pass-through", () => {
    it("forwards map.options values except container", () => {
      createInstance({
        id: "map",
        map: {
          options: {
            center: [-0.1276, 51.5074],
            zoom: 10,
            bearing: 15,
            container: "other",
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
  });

  describe("Returned instance shape", () => {
    it("returns the documented API methods", () => {
      const instance = createInstance({ id: "map" });
      expect(instance).toEqual(
        expect.objectContaining({
          id: "map",
          map: expect.any(Object),
          config: expect.any(Object),
          getSnapshot: expect.any(Function),
          destroy: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          once: expect.any(Function),
        }),
      );
    });
  });

  describe("Instance reuse and destroy semantics", () => {
    it("reuses same instance by id and ignores subsequent config/geoJSON", () => {
      const first = createInstance({
        id: "map",
        map: { options: { zoom: 10 } },
      });

      const second = createInstance(
        { id: "map", map: { options: { zoom: 2 } } },
        { type: "FeatureCollection", features: [] },
      );

      expect(second).toBe(first);
      expect(Map).toHaveBeenCalledTimes(1);
      expect(second.map._options.zoom).toBe(10);
    });

    it("destroy is idempotent and allows clean recreation", () => {
      const first = createInstance({ id: "map" });
      first.destroy();
      first.destroy();

      const second = createInstance({ id: "map" });

      expect(first.map.remove).toHaveBeenCalledTimes(1);
      expect(second).not.toBe(first);
      expect(Map).toHaveBeenCalledTimes(2);
    });

    it("keeps destroy and reuse stable after internal mode switching", () => {
      const first = createInstance({ id: "map", ui: { mode: "view" } });
      const firstCore = getCoreById("map");

      firstCore.lifecycle.setMode("debug");
      firstCore.lifecycle.setMode("view");

      first.destroy();
      expect(
        document.querySelector('#map [data-waymark-app="true"]'),
      ).toBeNull();

      const second = createInstance({ id: "map", ui: { mode: "debug" } });
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
      const instance = createInstance({ id: "map" });
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

      const first = createInstance({ id: "map" });
      const reused = vi.fn();
      first.on("waymark:instance.reused", reused);
      first.on("waymark:instance.destroyed", reused);
      createInstance({ id: "map" });
      first.destroy();

      expect(created.mock.calls[0][0].detail).toEqual({ id: "map" });
      expect(reused).toHaveBeenCalledTimes(2);
    });

    it("forwards map events with originalEvent in detail", () => {
      const instance = createInstance({ id: "map" });
      const seen = [];

      instance.on("waymark:map.moveend", (event) => {
        seen.push(event.detail);
      });

      for (const [eventName, handler] of instance.map.on.mock.calls) {
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

  describe("Snapshot shape", () => {
    it("returns a serialisable snapshot payload", () => {
      const instance = createInstance({
        id: "map",
        map: {
          options: {
            center: [-0.1276, 51.5074],
            zoom: 10,
            bearing: 15,
            pitch: 30,
          },
        },
      });

      expect(instance.getSnapshot()).toEqual(
        expect.objectContaining({
          version: 1,
          map: {
            center: [-0.1276, 51.5074],
            zoom: 10,
            bearing: 15,
            pitch: 30,
          },
          ui: {
            mode: "view",
          },
          data: {
            geojson: expect.objectContaining({
              sourceId: "waymark-map-geojson-source",
              layerId: "waymark-map-geojson-layer",
            }),
          },
        }),
      );
    });
  });

  describe("Initial GeoJSON overlay", () => {
    it("adds source and layer ids scoped by instance id", () => {
      const geoJSON = { type: "FeatureCollection", features: [] };
      const one = createInstance({ id: "map" }, geoJSON);

      document.body.innerHTML +=
        '<div id="map-two" style="width: 500px; height: 400px;"></div>';
      const two = createInstance({ id: "map-two" }, geoJSON);

      for (const [eventName, handler] of one.map.on.mock.calls) {
        if (eventName === "load") handler();
      }
      for (const [eventName, handler] of two.map.on.mock.calls) {
        if (eventName === "load") handler();
      }

      expect(one.map.addSource).toHaveBeenCalledWith(
        "waymark-map-geojson-source",
        expect.any(Object),
      );
      expect(two.map.addSource).toHaveBeenCalledWith(
        "waymark-map-two-geojson-source",
        expect.any(Object),
      );
    });
  });
});
