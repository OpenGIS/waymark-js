import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock maplibre-gl — WebGL is unavailable in JSDOM
vi.mock("maplibre-gl", () => {
  const MockMap = vi.fn(function (options) {
    this._options = options;
    this.on = vi.fn();
    this.remove = vi.fn();
  });
  return { Map: MockMap, setWorkerUrl: vi.fn() };
});

// Suppress CSS import from instanceMap.js
vi.mock("maplibre-gl/dist/maplibre-gl.css", () => ({}));

import { createInstance } from "../../src/entry.js";
import defaultConfig from "../../src/config/defaultConfig.json";
import { clearInstanceRegistry } from "../../src/instance/instanceRegistry.js";
import { resolveConfig } from "../../src/instance/resolveConfig.js";
import { deepMerge } from "../../src/utils/deepMerge.js";
import { Map } from "maplibre-gl";

describe("3. Config", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="map" style="width: 500px; height: 400px;"></div>';
    vi.clearAllMocks();
    clearInstanceRegistry();
  });

  // ------------------------------------------------------------------ //
  // Defaults
  // ------------------------------------------------------------------ //

  describe("Default config source and merge behaviour", () => {
    it("uses JSON defaults as the config source", () => {
      expect(resolveConfig()).toEqual(defaultConfig);
    });

    it("deeply merges nested objects", () => {
      const merged = deepMerge(
        {
          map: {
            options: {
              camera: {
                padding: {
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                },
                bearing: 0,
              },
            },
          },
        },
        {
          map: {
            options: {
              camera: {
                padding: { top: 24 },
              },
            },
          },
        },
      );

      expect(merged).toEqual({
        map: {
          options: {
            camera: {
              padding: { top: 24, right: 0, bottom: 0, left: 0 },
              bearing: 0,
            },
          },
        },
      });
    });

    it("replaces arrays rather than merging by index", () => {
      const merged = deepMerge(
        {
          values: ["a", "b"],
        },
        {
          values: ["c"],
        },
      );

      expect(merged.values).toEqual(["c"]);
    });
  });

  describe("Defaults", () => {
    it("default center is [0, 0]", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ center: [0, 0] }),
      );
    });

    it("default zoom is 2", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(expect.objectContaining({ zoom: 2 }));
    });

    it("default style is the OpenFreeMap Bright style URL", () => {
      createInstance("map");
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "https://tiles.openfreemap.org/styles/bright",
        }),
      );
    });
  });

  // ------------------------------------------------------------------ //
  // config.map
  // ------------------------------------------------------------------ //

  describe("config.map", () => {
    it("forwards custom options.center to MapLibre", () => {
      createInstance("map", {
        map: { options: { center: [-0.1276, 51.5074] } },
      });
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ center: [-0.1276, 51.5074] }),
      );
    });

    it("forwards custom options.zoom to MapLibre", () => {
      createInstance("map", { map: { options: { zoom: 10 } } });
      expect(Map).toHaveBeenCalledWith(expect.objectContaining({ zoom: 10 }));
    });

    it("forwards map.options.style to MapLibre", () => {
      createInstance("map", {
        map: {
          options: { style: "https://example.com/custom-style.json" },
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "https://example.com/custom-style.json",
        }),
      );
    });

    it("keeps the Waymark container authoritative over map.options.container", () => {
      createInstance("map", {
        map: {
          options: { container: "other-element-id" },
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({ container: "map" }),
      );
    });
  });
});
