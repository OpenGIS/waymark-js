import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("maplibre-gl", () => {
  const EMPTY_STYLE = {
    version: 8,
    sources: {},
    layers: [],
  };

  /**
   * @param {string | object | undefined} style
   */
  const normaliseStyle = (style) => {
    if (typeof style === "object" && style !== null) {
      return structuredClone(style);
    }

    return structuredClone(EMPTY_STYLE);
  };

  const MockMap = vi.fn(function (options) {
    this._options = options;
    this._style = normaliseStyle(options.style);
    this._view = {
      center: options.center ?? [0, 0],
      zoom: options.zoom ?? 2,
      bearing: options.bearing ?? 0,
      pitch: options.pitch ?? 0,
    };
    this._loaded = false;
    this.on = vi.fn();
    this.off = vi.fn();
    this.remove = vi.fn();
    this.fire = vi.fn((eventName, event = {}) => {
      for (const [registeredEventName, handler] of this.on.mock.calls) {
        if (registeredEventName === eventName) {
          handler(event);
        }
      }
    });
    this.setStyle = vi.fn((style) => {
      this._style = normaliseStyle(style);
      this.fire("style.load", {
        type: "style.load",
      });
    });
    this.addSource = vi.fn((id, source) => {
      this._style.sources = {
        ...this._style.sources,
        [id]: source,
      };
    });
    this.addLayer = vi.fn((layer, beforeId) => {
      const layers = [...(this._style.layers ?? [])];

      if (beforeId) {
        const beforeIndex = layers.findIndex(
          (existing) => existing.id === beforeId,
        );
        if (beforeIndex >= 0) {
          layers.splice(beforeIndex, 0, layer);
        } else {
          layers.push(layer);
        }
      } else {
        layers.push(layer);
      }

      this._style.layers = layers;
    });
    this.moveLayer = vi.fn((layerId, beforeId) => {
      const layers = [...(this._style.layers ?? [])];
      const currentIndex = layers.findIndex(
        (existing) => existing.id === layerId,
      );

      if (currentIndex < 0) {
        return;
      }

      const [layer] = layers.splice(currentIndex, 1);

      if (!beforeId) {
        layers.push(layer);
        this._style.layers = layers;
        return;
      }

      const beforeIndex = layers.findIndex(
        (existing) => existing.id === beforeId,
      );

      if (beforeIndex < 0) {
        layers.push(layer);
      } else {
        layers.splice(beforeIndex, 0, layer);
      }

      this._style.layers = layers;
    });
    this.setPaintProperty = vi.fn((layerId, name, value) => {
      const layers = [...(this._style.layers ?? [])];
      const layerIndex = layers.findIndex(
        (existing) => existing.id === layerId,
      );

      if (layerIndex < 0) {
        return;
      }

      const layer = layers[layerIndex];
      layers[layerIndex] = {
        ...layer,
        paint: {
          ...(layer.paint ?? {}),
          [name]: value,
        },
      };
      this._style.layers = layers;
    });
    this.loaded = vi.fn(() => this._loaded);
    this.getStyle = vi.fn(() => this._style);
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
import { WAYMARK_MAP_BASEMAPS_CHANGED_EVENT } from "../../src/runtime/createInstanceEvents.js";
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
    it("accepts an instance document", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: { options: { zoom: 10 } },
        },
        data: {
          geoJSON: { type: "FeatureCollection", features: [] },
        },
      });

      expect(instance.id).toBe("map");
      expect(getLastMapInstance().on).toHaveBeenCalledWith(
        "load",
        expect.any(Function),
      );
    });

    it("accepts an empty instance document", () => {
      const instance = createInstance({});

      expect(instance.id).toMatch(/^waymark-/);
      expect(instance.toJSON().data.geoJSON).toBeNull();
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
          geoJSON: {
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
        geoJSON: { type: "FeatureCollection", features: [1] },
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

    it("normalises basemap keys in raster-then-vector order", () => {
      const normalised = normaliseInstanceDocument({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: "https://tiles.openfreemap.org/styles/bright",
                },
              ],
              raster: [
                {
                  tileURLTemplates: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                  ],
                },
              ],
            },
          },
        },
      });

      expect(Object.keys(normalised.config.map.basemaps)).toEqual([
        "raster",
        "vector",
      ]);
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
    it("uses documented defaults for camera and attributionControl", () => {
      createInstance({
        config: {
          id: "map",
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [0, 0],
          zoom: 2,
          attributionControl: false,
        }),
      );
    });

    it("injects OpenFreeMap vector only when no basemap entries are configured", () => {
      createInstance({
        config: {
          id: "map",
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "https://tiles.openfreemap.org/styles/bright",
        }),
      );
    });

    it("does not inject default vector when raster-only basemaps are configured", () => {
      createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              raster: [
                {
                  tileURLTemplates: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                  ],
                },
              ],
            },
          },
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: {
            version: 8,
            sources: {},
            layers: [],
          },
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

    it("rejects legacy config.map.options.style", () => {
      expect(() =>
        createInstance({
          config: {
            id: "map",
            map: {
              options: {
                style: "https://example.com/style.json",
              },
            },
          },
        }),
      ).toThrow(
        "Invalid config.map.options.style: use config.map.basemaps.vector[] instead.",
      );
    });

    it("rejects invalid basemap entries with clear path errors", () => {
      expect(() =>
        createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    styleURL: "",
                  },
                ],
              },
            },
          },
        }),
      ).toThrow(
        "Invalid config.map.basemaps.vector[0].styleURL: expected a non-empty string or style object.",
      );

      expect(() =>
        createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                raster: [
                  {
                    tileURLTemplates: [],
                  },
                ],
              },
            },
          },
        }),
      ).toThrow(
        "Invalid config.map.basemaps.raster[0].tileURLTemplates: expected a non-empty string array.",
      );

      expect(() =>
        createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                vector: [
                  {
                    style: "https://example.com/legacy-style.json",
                  },
                ],
              },
            },
          },
        }),
      ).toThrow(
        "Invalid config.map.basemaps.vector[0].style: unexpected key for vector basemap entry.",
      );

      expect(() =>
        createInstance({
          config: {
            id: "map",
            map: {
              basemaps: {
                raster: [
                  {
                    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                  },
                ],
              },
            },
          },
        }),
      ).toThrow(
        "Invalid config.map.basemaps.raster[0].tiles: unexpected key for raster basemap entry.",
      );
    });
  });

  describe("UI shell mode rendering", () => {
    it("keeps the shell mounted and renders the basemaps control in view mode", () => {
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
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );
      const bottomLeftPosition = shellMount?.querySelector(
        '[data-waymark-controls-position="bottomLeft"]',
      );

      expect(shellMount).toBeTruthy();
      expect(basemapsControl).toBeTruthy();
      expect(
        bottomLeftPosition?.querySelector(
          '[data-waymark-control="basemaps-toggle"]',
        ),
      ).toBeTruthy();
      expect(
        shellMount?.querySelector('[data-waymark-modal="true"]'),
      ).toBeNull();
      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeNull();
    });

    it("renders instance document and event feed sections in debug mode", async () => {
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
      const panel = shellMount?.querySelector(
        '[data-waymark-debug-panel="true"]',
      );
      const modal = shellMount?.querySelector('[data-waymark-modal="true"]');
      const debugControl = shellMount?.querySelector(
        '[data-waymark-control="debug-output-toggle"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      expect(modal).toBeTruthy();
      expect(panel).toBeTruthy();
      expect(debugControl).toBeTruthy();
      expect(basemapsControl).toBeTruthy();
      expect(panel?.textContent).toContain("Instance document");
      expect(panel?.textContent).toContain("Waymark events (last 25)");
      expect(panel?.textContent).toContain('"config"');
    });

    it("toggles debug outputs from the internal debug control", async () => {
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
      const debugControl = shellMount?.querySelector(
        '[data-waymark-control="debug-output-toggle"]',
      );

      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeTruthy();

      debugControl?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();

      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeNull();

      debugControl?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();

      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeTruthy();
    });

    it("routes shared modal content between debug and basemaps panels", async () => {
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
      const debugControl = shellMount?.querySelector(
        '[data-waymark-control="debug-output-toggle"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeTruthy();

      basemapsControl?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await nextTick();

      expect(
        shellMount?.querySelector('[data-waymark-modal="true"]'),
      ).toBeTruthy();
      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeNull();
      expect(
        shellMount?.querySelector('[data-waymark-panel="basemaps"]'),
      ).toBeTruthy();

      debugControl?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await nextTick();

      expect(
        shellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeTruthy();
      expect(
        shellMount?.querySelector('[data-waymark-panel="basemaps"]'),
      ).toBeNull();
    });

    it("renders configured vector basemaps as selectable radios in the basemaps panel", async () => {
      createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
          map: {
            basemaps: {
              vector: [
                {
                  title: "OpenFreeMap Bright",
                  styleURL: "https://tiles.openfreemap.org/styles/bright",
                  attributionHTML:
                    "<a href='https://openfreemap.org'>© OpenFreeMap</a>",
                },
                {
                  title: "OpenFreeMap Liberty",
                  styleURL: "https://tiles.openfreemap.org/styles/liberty",
                  attributionHTML:
                    "<a href='https://openfreemap.org'>© OpenFreeMap</a>",
                },
              ],
            },
          },
        },
      });

      await nextTick();

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      basemapsControl?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await nextTick();

      const vectorItems = [
        ...(shellMount?.querySelectorAll(
          '[data-waymark-basemaps-vector-item="true"]',
        ) ?? []),
      ].map((item) => item.textContent?.replace(/\s+/g, " ").trim());

      const vectorRadios = [
        ...(shellMount?.querySelectorAll("[data-waymark-vector-radio]") ?? []),
      ];

      const checkedVectorRadios = vectorRadios.filter((radio) => radio.checked);
      const firstAttribution = shellMount?.querySelector(
        '[data-waymark-basemaps-vector-item="true"] [class$="__attribution"]',
      );

      expect(vectorItems[0]).toContain("OpenFreeMap Bright");
      expect(vectorItems[0]).toContain("Active");
      expect(vectorItems[1]).toContain("OpenFreeMap Liberty");
      expect(vectorItems[1]).toContain("Active");
      expect(vectorRadios).toHaveLength(2);
      expect(checkedVectorRadios).toHaveLength(1);
      expect(
        checkedVectorRadios[0].getAttribute("data-waymark-vector-radio"),
      ).toBe("vector-0");
      expect(firstAttribution?.innerHTML).toBe(
        '<a href="https://openfreemap.org">© OpenFreeMap</a>',
      );
    });

    it("dispatches vector basemap selection from the basemaps panel and updates active state", async () => {
      const instance = createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
          map: {
            basemaps: {
              vector: [
                {
                  title: "Vector A",
                  styleURL: "https://example.com/vector-a-style.json",
                },
                {
                  title: "Vector B",
                  styleURL: "https://example.com/vector-b-style.json",
                },
              ],
            },
          },
        },
      });

      await nextTick();

      const map = getLastMapInstance();
      const core = getCoreById("map");
      const setActiveVectorBasemapSpy = vi.spyOn(
        core.commands.basemaps,
        "setActiveVectorBasemap",
      );

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      basemapsControl?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await nextTick();

      const inactiveVectorRadio = shellMount?.querySelector(
        '[data-waymark-vector-radio="vector-1"]',
      );
      expect(inactiveVectorRadio).toBeTruthy();

      inactiveVectorRadio.checked = true;
      inactiveVectorRadio?.dispatchEvent(
        new Event("change", { bubbles: true }),
      );
      await nextTick();

      expect(setActiveVectorBasemapSpy).toHaveBeenCalledWith("vector-1");
      expect(map.setStyle).toHaveBeenCalledWith(
        "https://example.com/vector-b-style.json",
      );
      expect(instance.toJSON().config.map.basemaps.vector).toEqual([
        expect.objectContaining({
          title: "Vector B",
          styleURL: "https://example.com/vector-b-style.json",
        }),
        expect.objectContaining({
          title: "Vector A",
          styleURL: "https://example.com/vector-a-style.json",
        }),
      ]);

      const checkedVectorRadio = shellMount?.querySelector(
        '[data-waymark-vector-radio="vector-1"]',
      );
      expect(checkedVectorRadio?.checked).toBe(true);
    });

    it("renders raster basemaps section before vector section in the basemaps panel", async () => {
      createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: "https://tiles.openfreemap.org/styles/bright",
                },
              ],
              raster: [
                {
                  tileURLTemplates: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                  ],
                },
              ],
            },
          },
        },
      });

      await nextTick();

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      basemapsControl?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await nextTick();

      const sectionHeadings = [
        ...(shellMount?.querySelectorAll(
          "[data-waymark-panel='basemaps'] h3",
        ) ?? []),
      ].map((heading) => heading.textContent?.trim());

      expect(sectionHeadings).toEqual(["Raster", "Vector"]);
    });

    it("dispatches raster opacity updates from the basemaps panel and applies them live", async () => {
      const instance = createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
          map: {
            basemaps: {
              raster: [
                {
                  title: "Raster A",
                  tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.3,
                },
              ],
            },
          },
        },
      });

      await nextTick();

      const map = getLastMapInstance();
      const core = getCoreById("map");
      expect(core).toBeTruthy();
      const setRasterOpacitySpy = vi.spyOn(
        core.commands.basemaps,
        "setRasterOpacity",
      );
      const basemapEvents = [];

      instance.on(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, (event) => {
        basemapEvents.push(event.detail);
      });

      map.fire("load", { source: "test" });

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      basemapsControl?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await nextTick();

      const opacityInput = shellMount?.querySelector(
        '[data-waymark-raster-opacity-input="raster-0"]',
      );
      expect(opacityInput).toBeTruthy();

      opacityInput.value = "0.8";
      opacityInput.dispatchEvent(new Event("input", { bubbles: true }));
      await nextTick();

      expect(setRasterOpacitySpy).toHaveBeenCalledWith("raster-0", 0.8);
      expect(map.setPaintProperty).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-0",
        "raster-opacity",
        0.8,
      );
      expect(basemapEvents).toHaveLength(1);
      expect(basemapEvents[0]).toEqual(
        expect.objectContaining({
          mutation: "opacity_changed",
        }),
      );
    });

    it("dispatches raster reorder updates from drag and drop and reflects the new order", async () => {
      createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: {
                    version: 8,
                    sources: {},
                    layers: [
                      {
                        id: "background",
                        type: "background",
                      },
                      {
                        id: "poi-label",
                        type: "symbol",
                      },
                    ],
                  },
                },
              ],
              raster: [
                {
                  title: "Raster A",
                  tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                },
                {
                  title: "Raster B",
                  tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                },
              ],
            },
          },
        },
      });

      await nextTick();

      const map = getLastMapInstance();
      const core = getCoreById("map");
      expect(core).toBeTruthy();
      const reorderSpy = vi.spyOn(
        core.commands.basemaps,
        "reorderRasterBasemaps",
      );

      map.fire("load", { source: "test" });

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const basemapsControl = shellMount?.querySelector(
        '[data-waymark-control="basemaps-toggle"]',
      );

      basemapsControl?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await nextTick();

      const firstRasterItem = shellMount?.querySelector(
        '[data-waymark-raster-item="raster-0"]',
      );
      const secondRasterItem = shellMount?.querySelector(
        '[data-waymark-raster-item="raster-1"]',
      );
      expect(firstRasterItem).toBeTruthy();
      expect(secondRasterItem).toBeTruthy();

      firstRasterItem?.dispatchEvent(new Event("dragstart", { bubbles: true }));
      secondRasterItem?.dispatchEvent(new Event("dragover", { bubbles: true }));
      secondRasterItem?.dispatchEvent(new Event("drop", { bubbles: true }));
      firstRasterItem?.dispatchEvent(new Event("dragend", { bubbles: true }));
      await nextTick();

      expect(reorderSpy).toHaveBeenCalledWith(["raster-1", "raster-0"]);

      const rasterLayerIds = map
        .getStyle()
        .layers.filter((layer) => layer.type === "raster")
        .map((layer) => layer.id);

      expect(rasterLayerIds).toEqual([
        "waymark-map-basemap-raster-layer-0",
        "waymark-map-basemap-raster-layer-1",
      ]);
    });

    it("exposes core/app-shell callbacks for basemaps panel open and close", async () => {
      createInstance({
        config: {
          id: "map",
          ui: {
            mode: "view",
          },
        },
      });

      await nextTick();

      const core = getCoreById("map");
      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );

      core?.commands.ui.openBasemapsPanel();
      await nextTick();
      expect(
        shellMount?.querySelector('[data-waymark-panel="basemaps"]'),
      ).toBeTruthy();

      core?.commands.ui.closeBasemapsPanel();
      await nextTick();
      expect(
        shellMount?.querySelector('[data-waymark-modal="true"]'),
      ).toBeNull();
    });

    it("keeps a bounded sanitised feed of Waymark events in debug mode", async () => {
      const instance = createInstance({
        config: {
          id: "map",
          ui: {
            mode: "debug",
          },
        },
      });

      await nextTick();

      const map = getLastMapInstance();

      for (let index = 0; index < 30; index += 1) {
        map.fire("moveend", {
          type: "moveend",
          source: `docs-test-${index}`,
          heavy: {
            nested: true,
          },
        });
      }

      await nextTick();

      const shellMount = document.querySelector(
        '#map [data-waymark-app="true"]',
      );
      const panel = shellMount?.querySelector(
        '[data-waymark-debug-panel="true"]',
      );
      const preElements = panel?.querySelectorAll("pre");
      const events = JSON.parse(preElements?.[1]?.textContent ?? "[]");

      expect(panel).toBeTruthy();
      expect(instance.toJSON().state.ui.mode).toBe("debug");

      expect(events).toHaveLength(25);
      expect(events.every((event) => event.type.startsWith("waymark:"))).toBe(
        true,
      );
      expect(events.every((event) => event.at)).toBe(true);
      expect(events.at(-1)).toEqual(
        expect.objectContaining({
          type: "waymark:map.moveend",
          detail: expect.objectContaining({
            id: "map",
            mapEvent: "moveend",
            hasOriginalEvent: true,
            originalEventType: "moveend",
          }),
        }),
      );
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

    it("uses only the first configured vector basemap at runtime", () => {
      createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: "https://example.com/first-style.json",
                },
                {
                  styleURL: "https://example.com/second-style.json",
                },
              ],
            },
          },
        },
      });

      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "https://example.com/first-style.json",
        }),
      );
    });

    it("stacks raster basemaps with index 0 on top below the first symbol layer", () => {
      createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: {
                    version: 8,
                    sources: {},
                    layers: [
                      {
                        id: "background",
                        type: "background",
                      },
                      {
                        id: "poi-label",
                        type: "symbol",
                      },
                    ],
                  },
                },
              ],
              raster: [
                {
                  tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.7,
                },
                {
                  tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.3,
                },
              ],
            },
          },
        },
      });

      const map = getLastMapInstance();
      map.fire("load", { source: "test" });

      const addedLayerCalls = map.addLayer.mock.calls.map(
        ([layer, beforeId]) => ({
          id: layer.id,
          beforeId,
          opacity: layer.paint?.["raster-opacity"],
        }),
      );

      expect(addedLayerCalls).toEqual([
        {
          id: "waymark-map-basemap-raster-layer-0",
          beforeId: "poi-label",
          opacity: 0.7,
        },
        {
          id: "waymark-map-basemap-raster-layer-1",
          beforeId: "waymark-map-basemap-raster-layer-0",
          opacity: 0.3,
        },
      ]);
    });

    it("updates raster opacity live through core basemap commands", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: {
                    version: 8,
                    sources: {},
                    layers: [
                      {
                        id: "background",
                        type: "background",
                      },
                    ],
                  },
                },
              ],
              raster: [
                {
                  tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.6,
                },
                {
                  tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.3,
                },
              ],
            },
          },
        },
      });

      const map = getLastMapInstance();
      const core = getCoreById("map");
      const basemapEvents = [];

      instance.on(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, (event) => {
        basemapEvents.push(event.detail);
      });

      map.fire("load", { source: "test" });

      core.commands.basemaps.setRasterOpacity("raster-1", 0.9);
      core.commands.basemaps.setRasterOpacity("missing", 0.2);

      expect(map.setPaintProperty).toHaveBeenCalledTimes(1);
      expect(map.setPaintProperty).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-1",
        "raster-opacity",
        0.9,
      );

      expect(basemapEvents).toEqual([
        {
          id: "map",
          mutation: "opacity_changed",
          changed: {
            basemapIds: ["raster-1"],
            opacity: {
              "raster-1": 0.9,
            },
          },
          basemaps: {
            vector: [
              expect.objectContaining({
                styleURL: expect.any(Object),
              }),
            ],
            raster: [
              expect.objectContaining({
                basemapId: "raster-0",
                opacity: 0.6,
              }),
              expect.objectContaining({
                basemapId: "raster-1",
                opacity: 0.9,
              }),
            ],
          },
        },
      ]);

      expect(instance.toJSON().config.map.basemaps.raster).toEqual([
        expect.objectContaining({ opacity: 0.6 }),
        expect.objectContaining({ opacity: 0.9 }),
      ]);
    });

    it("reorders raster basemaps live through core basemap commands", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: {
                    version: 8,
                    sources: {},
                    layers: [
                      {
                        id: "background",
                        type: "background",
                      },
                      {
                        id: "poi-label",
                        type: "symbol",
                      },
                    ],
                  },
                },
              ],
              raster: [
                {
                  tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                },
                {
                  tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                },
              ],
            },
          },
        },
      });

      const map = getLastMapInstance();
      const core = getCoreById("map");
      const basemapEvents = [];

      instance.on(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, (event) => {
        basemapEvents.push(event.detail);
      });

      map.fire("load", { source: "test" });
      core.commands.basemaps.reorderRasterBasemaps(["raster-1", "raster-0"]);

      expect(map.moveLayer).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-1",
        "poi-label",
      );
      expect(map.moveLayer).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-0",
        "waymark-map-basemap-raster-layer-1",
      );

      const rasterLayerIds = map
        .getStyle()
        .layers.filter((layer) => layer.type === "raster")
        .map((layer) => layer.id);

      expect(rasterLayerIds).toEqual([
        "waymark-map-basemap-raster-layer-0",
        "waymark-map-basemap-raster-layer-1",
      ]);

      expect(basemapEvents).toEqual([
        {
          id: "map",
          mutation: "reordered",
          changed: {
            basemapIds: ["raster-1", "raster-0"],
            orderedBasemapIds: ["raster-1", "raster-0"],
          },
          basemaps: {
            vector: [
              expect.objectContaining({
                styleURL: expect.any(Object),
              }),
            ],
            raster: [
              expect.objectContaining({
                basemapId: "raster-1",
                tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
              }),
              expect.objectContaining({
                basemapId: "raster-0",
                tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
              }),
            ],
          },
        },
      ]);

      expect(instance.toJSON().config.map.basemaps.raster).toEqual([
        expect.objectContaining({
          tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
        }),
        expect.objectContaining({
          tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
        }),
      ]);
    });

    it("sets the active vector basemap through core commands and emits a vector mutation event", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  title: "Vector A",
                  styleURL: "https://example.com/vector-a-style.json",
                },
                {
                  title: "Vector B",
                  styleURL: "https://example.com/vector-b-style.json",
                },
              ],
            },
          },
        },
      });

      const map = getLastMapInstance();
      const core = getCoreById("map");
      const basemapEvents = [];

      instance.on(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, (event) => {
        basemapEvents.push(event.detail);
      });

      core.commands.basemaps.setActiveVectorBasemap("vector-1");

      expect(map.setStyle).toHaveBeenCalledWith(
        "https://example.com/vector-b-style.json",
      );

      expect(basemapEvents).toEqual([
        {
          id: "map",
          mutation: "vector_changed",
          changed: {
            basemapIds: ["vector-1"],
            orderedBasemapIds: ["vector-1", "vector-0"],
          },
          basemaps: {
            vector: [
              expect.objectContaining({
                basemapId: "vector-1",
                title: "Vector B",
                styleURL: "https://example.com/vector-b-style.json",
              }),
              expect.objectContaining({
                basemapId: "vector-0",
                title: "Vector A",
                styleURL: "https://example.com/vector-a-style.json",
              }),
            ],
            raster: [],
          },
        },
      ]);

      expect(instance.toJSON().config.map.basemaps.vector).toEqual([
        expect.objectContaining({
          title: "Vector B",
          styleURL: "https://example.com/vector-b-style.json",
        }),
        expect.objectContaining({
          title: "Vector A",
          styleURL: "https://example.com/vector-a-style.json",
        }),
      ]);
    });

    it("no-ops vector basemap activation when id is invalid or already active", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  title: "Vector A",
                  styleURL: "https://example.com/vector-a-style.json",
                },
                {
                  title: "Vector B",
                  styleURL: "https://example.com/vector-b-style.json",
                },
              ],
            },
          },
        },
      });

      const core = getCoreById("map");
      const basemapEvents = [];

      instance.on(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, (event) => {
        basemapEvents.push(event.detail);
      });

      core.commands.basemaps.setActiveVectorBasemap("missing");
      core.commands.basemaps.setActiveVectorBasemap("vector-0");

      expect(basemapEvents).toEqual([]);
      expect(instance.toJSON().config.map.basemaps.vector).toEqual([
        expect.objectContaining({
          title: "Vector A",
          styleURL: "https://example.com/vector-a-style.json",
        }),
        expect.objectContaining({
          title: "Vector B",
          styleURL: "https://example.com/vector-b-style.json",
        }),
      ]);
    });

    it("keeps raster overlays live after a vector style switch", () => {
      createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  title: "Vector A",
                  styleURL: {
                    version: 8,
                    sources: {},
                    layers: [
                      {
                        id: "a-label",
                        type: "symbol",
                      },
                    ],
                  },
                },
                {
                  title: "Vector B",
                  styleURL: {
                    version: 8,
                    sources: {},
                    layers: [
                      {
                        id: "b-label",
                        type: "symbol",
                      },
                    ],
                  },
                },
              ],
              raster: [
                {
                  tileURLTemplates: ["https://a.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.4,
                },
                {
                  tileURLTemplates: ["https://b.example.com/{z}/{x}/{y}.png"],
                  opacity: 0.7,
                },
              ],
            },
          },
        },
      });

      const map = getLastMapInstance();
      const core = getCoreById("map");

      map.fire("load", { source: "test" });
      expect(map.addLayer).toHaveBeenCalledTimes(2);

      core.commands.basemaps.setActiveVectorBasemap("vector-1");
      expect(map.setStyle).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: [expect.objectContaining({ id: "b-label", type: "symbol" })],
        }),
      );
      expect(map.addLayer).toHaveBeenCalledTimes(4);

      core.commands.basemaps.setRasterOpacity("raster-0", 0.9);
      core.commands.basemaps.reorderRasterBasemaps(["raster-1", "raster-0"]);

      expect(map.setPaintProperty).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-0",
        "raster-opacity",
        0.9,
      );
      expect(map.moveLayer).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-1",
        "b-label",
      );
      expect(map.moveLayer).toHaveBeenCalledWith(
        "waymark-map-basemap-raster-layer-0",
        "waymark-map-basemap-raster-layer-1",
      );
    });

    it("no-ops vector style switching when map/styleURL is unavailable", () => {
      createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  title: "Vector A",
                  styleURL: "https://example.com/vector-a-style.json",
                },
                {
                  title: "Vector B",
                  styleURL: "https://example.com/vector-b-style.json",
                },
              ],
            },
          },
        },
      });

      const map = getLastMapInstance();
      const core = getCoreById("map");
      map.setStyle = undefined;

      expect(() => {
        core.commands.basemaps.setActiveVectorBasemap("vector-1");
      }).not.toThrow();

      map.setStyle = vi.fn();
      core.basemaps.vector[1].styleURL = undefined;

      expect(() => {
        core.commands.basemaps.setActiveVectorBasemap("vector-0");
      }).not.toThrow();
      expect(map.setStyle).not.toHaveBeenCalled();
    });

    it("keeps empty raster basemap state unchanged for live mutation commands", () => {
      createInstance({
        config: {
          id: "map",
        },
      });

      const core = getCoreById("map");

      core.commands.basemaps.setRasterOpacity("raster-0", 0.5);
      core.commands.basemaps.reorderRasterBasemaps(["raster-0"]);

      expect(
        core.instanceDocument.toJSON().config.map.basemaps,
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
    it("recreates on the same id using the incoming instance document", () => {
      const first = createInstance({
        config: {
          id: "map",
          map: { options: { zoom: 10 } },
        },
      });
      const firstMap = getLastMapInstance();

      const second = createInstance({
        config: { id: "map", map: { options: { zoom: 2 } } },
        data: { geoJSON: { type: "FeatureCollection", features: [] } },
      });
      const secondMap = getLastMapInstance();

      expect(second).not.toBe(first);
      expect(firstMap.remove).toHaveBeenCalledTimes(1);
      expect(Map).toHaveBeenCalledTimes(2);
      expect(secondMap._options.zoom).toBe(2);
      expect(second.toJSON().data.geoJSON).toEqual({
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
      expect(
        secondShellMount?.querySelector('[data-waymark-debug-panel="true"]'),
      ).toBeTruthy();
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

  describe("InstanceDocument shape", () => {
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
            geoJSON: null,
          },
        }),
      );
    });

    it("keeps runtime metadata out of toJSON", () => {
      createInstance({
        config: {
          id: "map",
          ui: { mode: "debug" },
        },
        data: {
          geoJSON: { type: "FeatureCollection", features: [] },
        },
      });

      const core = getCoreById("map");
      const instanceDocument = core?.publicApi.toJSON();

      expect(instanceDocument?.data.geoJSON).toEqual({
        type: "FeatureCollection",
        features: [],
      });
      expect(instanceDocument?.runtime).toBeUndefined();
    });

    it("omits runtime-injected default basemap from toJSON", () => {
      const instance = createInstance({
        config: {
          id: "map",
        },
      });

      expect(instance.toJSON().config.map.basemaps).toBeUndefined();
    });

    it("preserves explicitly authored basemaps, including explicit OpenFreeMap values", () => {
      const instance = createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: "https://tiles.openfreemap.org/styles/bright",
                  title: "OpenFreeMap Bright",
                },
              ],
              raster: [
                {
                  tileURLTemplates: [
                    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                  ],
                  opacity: 0.5,
                },
              ],
            },
          },
        },
      });

      expect(instance.toJSON().config.map.basemaps).toEqual({
        raster: [
          {
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            opacity: 0.5,
          },
        ],
        vector: [
          {
            styleURL: "https://tiles.openfreemap.org/styles/bright",
            title: "OpenFreeMap Bright",
          },
        ],
      });

      expect(Object.keys(instance.toJSON().config.map.basemaps)).toEqual([
        "raster",
        "vector",
      ]);
    });

    it("omits empty basemap arrays from toJSON output", () => {
      const vectorOnly = createInstance({
        config: {
          id: "map",
          map: {
            basemaps: {
              vector: [
                {
                  styleURL: "https://example.com/vector-style.json",
                },
              ],
              raster: [],
            },
          },
        },
      });

      expect(vectorOnly.toJSON().config.map.basemaps).toEqual({
        vector: [
          {
            styleURL: "https://example.com/vector-style.json",
          },
        ],
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
          geoJSON,
        },
      });

      document.body.innerHTML +=
        '<div id="map-two" style="width: 500px; height: 400px;"></div>';
      const two = createInstance({
        config: {
          id: "map-two",
        },
        data: {
          geoJSON,
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
