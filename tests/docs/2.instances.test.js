import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock maplibre-gl — WebGL is unavailable in JSDOM
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

// Suppress CSS import from createMap.js
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { createInstance } from "../../src/entry.js";
import { clearRuntimeRegistry } from "../../src/core/runtimeRegistry.js";
import { Map } from "maplibre-gl";

describe("2. Instances", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="map" style="width: 500px; height: 400px;"></div>';
    vi.clearAllMocks();
    clearRuntimeRegistry();
  });

  // ------------------------------------------------------------------ //
  // Quick Start
  // ------------------------------------------------------------------ //

  describe("Quick Start", () => {
    it("creates an instance result object", () => {
      const instance = createInstance("map");
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

    it("mounts into the specified container ID", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ container: "map" }),
      );
    });

    it("creates and mounts into a random container when id is omitted", () => {
      const instance = createInstance();

      expect(instance.id).toMatch(/^waymark-/);
      expect(document.getElementById(instance.id)).toBeTruthy();
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ container: instance.id }),
      );
    });
  });

  // ------------------------------------------------------------------ //
  // Factory defaults
  // ------------------------------------------------------------------ //

  describe("Factory defaults", () => {
    it("defaults to the OpenFreeMap Bright style", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "https://tiles.openfreemap.org/styles/bright",
        }),
      );
    });

    it("defaults to center [0, 0]", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ center: [0, 0] }),
      );
    });

    it("defaults to zoom 2", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(expect.objectContaining({ zoom: 2 }));
    });
  });

  // ------------------------------------------------------------------ //
  // Factory options
  // ------------------------------------------------------------------ //

  describe("Factory options", () => {
    it("accepts a custom style via config.map.options.style", () => {
      createInstance("map", {
        map: {
          options: { style: "https://custom.tiles.json" },
        },
      });
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ style: "https://custom.tiles.json" }),
      );
    });

    it("accepts a custom center via config.map.options.center", () => {
      createInstance("map", {
        map: { options: { center: [-0.1276, 51.5074] } },
      });
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ center: [-0.1276, 51.5074] }),
      );
    });

    it("accepts a custom zoom via config.map.options.zoom", () => {
      createInstance("map", { map: { options: { zoom: 10 } } });
      expect(Map).toHaveBeenCalledWith(expect.objectContaining({ zoom: 10 }));
    });

    it("passes arbitrary MapLibre options through config.map.options", () => {
      createInstance("map", { map: { options: { bearing: 15 } } });
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ bearing: 15 }),
      );
    });
  });

  // ------------------------------------------------------------------ //
  // Accessing the MapLibre instance
  // ------------------------------------------------------------------ //

  describe("Accessing the MapLibre instance", () => {
    it("returns the MapLibre map via the result map property", () => {
      const instance = createInstance("map");
      expect(instance.map).toBeDefined();
    });

    it("result.map is the map returned by createInstance", () => {
      const instance = createInstance("map");
      expect(Map).toHaveBeenCalledOnce();
      expect(instance.map).toHaveProperty("_options");
      expect(instance.map._options).toMatchObject({ container: "map" });
    });
  });

  // ------------------------------------------------------------------ //
  // Instance registry behaviour
  // ------------------------------------------------------------------ //

  describe("Instance registry behaviour", () => {
    it("returns the same existing instance for the same ID", () => {
      const first = createInstance("map");
      const second = createInstance("map");

      expect(first).toBe(second);
      expect(Map).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------ //
  // Instance events
  // ------------------------------------------------------------------ //

  describe("Instance events", () => {
    it("on and off subscribe to container events", () => {
      const instance = createInstance("map");
      const handler = vi.fn();

      instance.on("waymark:test", handler);

      const container = document.getElementById("map");
      container.dispatchEvent(new CustomEvent("waymark:test"));

      expect(handler).toHaveBeenCalledTimes(1);

      instance.off("waymark:test", handler);
      container.dispatchEvent(new CustomEvent("waymark:test"));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("once subscribes to one container event dispatch", () => {
      const instance = createInstance("map");
      const handler = vi.fn();

      instance.once("waymark:test-once", handler);

      const container = document.getElementById("map");
      container.dispatchEvent(new CustomEvent("waymark:test-once"));
      container.dispatchEvent(new CustomEvent("waymark:test-once"));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("emits waymark:instance.created with a lightweight detail payload", () => {
      const created = vi.fn();
      document
        .getElementById("map")
        .addEventListener("waymark:instance.created", created);

      createInstance("map");

      expect(created).toHaveBeenCalledTimes(1);
      expect(created.mock.calls[0][0].detail).toEqual({ id: "map" });
    });

    it("emits waymark:instance.reused when requesting the same ID", () => {
      const instance = createInstance("map");
      const reused = vi.fn();

      instance.on("waymark:instance.reused", reused);
      createInstance("map");

      expect(reused).toHaveBeenCalledTimes(1);
      expect(reused.mock.calls[0][0].detail).toEqual({ id: "map" });
    });

    it("emits waymark:instance.destroyed once per lifecycle", () => {
      const instance = createInstance("map");
      const destroyed = vi.fn();

      instance.on("waymark:instance.destroyed", destroyed);

      instance.destroy();
      instance.destroy();

      expect(destroyed).toHaveBeenCalledTimes(1);
      expect(destroyed.mock.calls[0][0].detail).toEqual({ id: "map" });
    });

    it("forwards selected map events as namespaced waymark:map.* events", () => {
      const instance = createInstance("map");
      const seen = [];
      const forwardedMapEvents = [
        ["load", "waymark:map.load"],
        ["moveend", "waymark:map.moveend"],
        ["zoomend", "waymark:map.zoomend"],
        ["rotateend", "waymark:map.rotateend"],
        ["pitchend", "waymark:map.pitchend"],
      ];

      for (const [, forwardedEventName] of forwardedMapEvents) {
        instance.on(forwardedEventName, (event) => {
          seen.push({
            type: event.type,
            detail: {
              id: event.detail.id,
              mapEvent: event.detail.mapEvent,
            },
          });
        });
      }

      for (const [mapEventName] of forwardedMapEvents) {
        for (const [eventName, handler] of instance.map.on.mock.calls) {
          if (eventName === mapEventName) {
            handler({ source: "unit-test", mapEventName });
          }
        }
      }

      expect(seen).toEqual([
        {
          type: "waymark:map.load",
          detail: { id: "map", mapEvent: "load" },
        },
        {
          type: "waymark:map.moveend",
          detail: { id: "map", mapEvent: "moveend" },
        },
        {
          type: "waymark:map.zoomend",
          detail: { id: "map", mapEvent: "zoomend" },
        },
        {
          type: "waymark:map.rotateend",
          detail: { id: "map", mapEvent: "rotateend" },
        },
        {
          type: "waymark:map.pitchend",
          detail: { id: "map", mapEvent: "pitchend" },
        },
      ]);
    });

    it("removes forwarded map event listeners during destroy", () => {
      const instance = createInstance("map");

      instance.destroy();

      const offEventNames = instance.map.off.mock.calls.map(([eventName]) =>
        String(eventName),
      );

      expect(offEventNames).toEqual(
        expect.arrayContaining([
          "load",
          "moveend",
          "zoomend",
          "rotateend",
          "pitchend",
        ]),
      );
    });
  });

  // ------------------------------------------------------------------ //
  // Initial GeoJSON
  // ------------------------------------------------------------------ //

  describe("Initial GeoJSON", () => {
    const initialGeoJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [-0.13, 51.5],
              [-0.12, 51.51],
            ],
          },
          properties: {},
        },
      ],
    };

    it("accepts GeoJSON as the third argument and renders it on load", () => {
      const instance = createInstance("map", undefined, initialGeoJSON);

      expect(instance.map.on).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );

      for (const [eventName, handler] of instance.map.on.mock.calls) {
        if (eventName === "load") {
          handler();
        }
      }

      expect(instance.map.addSource).toHaveBeenCalledWith(
        "waymark-map-geojson-source",
        {
          type: "geojson",
          data: initialGeoJSON,
        },
      );

      expect(instance.map.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "waymark-map-geojson-layer",
          source: "waymark-map-geojson-source",
          type: "line",
        }),
      );
    });

    it("uses instance-scoped source and layer IDs to avoid collisions", () => {
      document.body.innerHTML +=
        '<div id="map-two" style="width: 500px; height: 400px;"></div>';

      const instanceOne = createInstance("map", undefined, initialGeoJSON);
      const instanceTwo = createInstance("map-two", undefined, initialGeoJSON);

      for (const [eventName, handler] of instanceOne.map.on.mock.calls) {
        if (eventName === "load") {
          handler();
        }
      }

      for (const [eventName, handler] of instanceTwo.map.on.mock.calls) {
        if (eventName === "load") {
          handler();
        }
      }

      expect(instanceOne.map.addSource).toHaveBeenCalledWith(
        "waymark-map-geojson-source",
        expect.any(Object),
      );
      expect(instanceTwo.map.addSource).toHaveBeenCalledWith(
        "waymark-map-two-geojson-source",
        expect.any(Object),
      );

      expect(instanceOne.map.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({ id: "waymark-map-geojson-layer" }),
      );
      expect(instanceTwo.map.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "waymark-map-two-geojson-layer",
        }),
      );
    });
  });

  // ------------------------------------------------------------------ //
  // Lifecycle and snapshots
  // ------------------------------------------------------------------ //

  describe("Lifecycle and snapshots", () => {
    it("mounts the app shell and renders readable snapshot JSON", async () => {
      createInstance("map");

      await Promise.resolve();

      const mountElement = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const snapshotSummary = document.querySelector(
        '#map [data-waymark-app="true"] summary',
      );
      const snapshotPre = document.querySelector(
        '#map [data-waymark-app="true"] pre',
      );

      expect(mountElement).toBeTruthy();
      expect(snapshotSummary?.textContent).toContain("Instance snapshot");
      expect(snapshotPre?.textContent).toContain('"version": 1');
      expect(snapshotPre?.textContent).toContain('"map": {');
      expect(snapshotPre?.textContent).toContain('"ui": {');
      expect(snapshotPre?.textContent).toContain('"data": {');
      expect(snapshotPre?.textContent).toContain("\n");

      const parsedSnapshot = JSON.parse(snapshotPre?.textContent ?? "{}");

      expect(parsedSnapshot).toEqual(
        expect.objectContaining({
          version: 1,
          map: expect.objectContaining({
            center: expect.any(Array),
            zoom: expect.any(Number),
            bearing: expect.any(Number),
            pitch: expect.any(Number),
          }),
          ui: expect.objectContaining({
            hasAppShell: true,
          }),
          data: expect.objectContaining({
            geojson: expect.objectContaining({
              sourceId: expect.any(String),
              layerId: expect.any(String),
            }),
          }),
        }),
      );
    });

    it("getSnapshot returns a serialisable instance snapshot payload", () => {
      const instance = createInstance("map", {
        map: {
          options: {
            center: [-0.1276, 51.5074],
            zoom: 10,
            bearing: 15,
            pitch: 30,
          },
        },
      });

      expect(instance.getSnapshot()).toEqual({
        version: 1,
        map: {
          center: [-0.1276, 51.5074],
          zoom: 10,
          bearing: 15,
          pitch: 30,
        },
        ui: {
          hasAppShell: true,
        },
        data: {
          geojson: {
            sourceId: "waymark-map-geojson-source",
            layerId: "waymark-map-geojson-layer",
            geojson: null,
          },
        },
      });
    });

    it("refreshes shell snapshot from forwarded waymark:map.* container events", async () => {
      const instance = createInstance("map", {
        map: {
          options: {
            zoom: 15,
          },
        },
      });

      await Promise.resolve();

      const snapshotPre = document.querySelector(
        '#map [data-waymark-app="true"] pre',
      );
      const container = document.getElementById("map");

      expect(snapshotPre?.textContent).toContain('"zoom": 15');

      instance.map._view.zoom = 16;
      container?.dispatchEvent(
        new CustomEvent("waymark:map.zoomend", {
          detail: {
            id: "map",
            mapEvent: "zoomend",
          },
        }),
      );

      await Promise.resolve();

      expect(snapshotPre?.textContent).toContain('"zoom": 16');
    });

    it("removes shell refresh listeners from container events on destroy", () => {
      const container = document.getElementById("map");
      const addListenerSpy = vi.spyOn(container, "addEventListener");
      const removeListenerSpy = vi.spyOn(container, "removeEventListener");

      const instance = createInstance("map");
      instance.destroy();

      const expectedEvents = [
        "waymark:map.load",
        "waymark:map.moveend",
        "waymark:map.zoomend",
        "waymark:map.rotateend",
        "waymark:map.pitchend",
      ];

      for (const eventName of expectedEvents) {
        expect(addListenerSpy).toHaveBeenCalledWith(
          eventName,
          expect.any(Function),
          undefined,
        );
        expect(removeListenerSpy).toHaveBeenCalledWith(
          eventName,
          expect.any(Function),
          undefined,
        );
      }
    });

    it("destroy removes map resources and allows a clean recreate", () => {
      const first = createInstance("map");
      first.destroy();

      expect(first.map.remove).toHaveBeenCalledTimes(1);

      const recreated = createInstance("map");

      expect(recreated).not.toBe(first);
      expect(Map).toHaveBeenCalledTimes(2);
    });

    it("destroy is safe to call more than once", () => {
      const instance = createInstance("map");

      instance.destroy();
      instance.destroy();

      expect(instance.map.remove).toHaveBeenCalledTimes(1);
    });
  });
});
