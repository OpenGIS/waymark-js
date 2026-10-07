import { beforeEach, describe, expect, it, vi } from "vitest";

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

  const MockLngLatBounds = vi.fn(function (sw, ne) {
    this._sw = sw ?? null;
    this._ne = ne ?? null;
  });
  MockLngLatBounds.prototype.extend = vi.fn(function (point) {
    if (this._sw === null) {
      this._sw = [point[0], point[1]];
      this._ne = [point[0], point[1]];
      return this;
    }

    this._sw = [
      Math.min(this._sw[0], point[0]),
      Math.min(this._sw[1], point[1]),
    ];
    this._ne = [
      Math.max(this._ne[0], point[0]),
      Math.max(this._ne[1], point[1]),
    ];
    return this;
  });

  const MockMap = vi.fn(function (options = {}) {
    this._options = options;
    this._style = normaliseStyle(options.style);
    this._loaded = false;
    this.on = vi.fn();
    this.off = vi.fn();
    this.fire = vi.fn((eventName, event = {}) => {
      for (const [registeredEventName, handler] of this.on.mock.calls) {
        if (registeredEventName === eventName) {
          handler(event);
        }
      }
    });
    this.getContainer = vi.fn(() => {
      if (typeof options.container === "string") {
        return document.getElementById(options.container);
      }

      return options.container ?? null;
    });
    this.addSource = vi.fn((id, source) => {
      this._style.sources = {
        ...this._style.sources,
        [id]: source,
      };
    });
    this.removeSource = vi.fn((id) => {
      const sources = { ...this._style.sources };
      delete sources[id];
      this._style.sources = sources;
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
    this.removeLayer = vi.fn((layerId) => {
      this._style.layers = (this._style.layers ?? []).filter(
        (layer) => layer.id !== layerId,
      );
    });
    this.setLayoutProperty = vi.fn((layerId, name, value) => {
      const layers = [...(this._style.layers ?? [])];
      const layerIndex = layers.findIndex(
        (existing) => existing.id === layerId,
      );

      if (layerIndex < 0) {
        return;
      }

      layers[layerIndex] = {
        ...layers[layerIndex],
        layout: {
          ...(layers[layerIndex].layout ?? {}),
          [name]: value,
        },
      };
      this._style.layers = layers;
    });
    this.loaded = vi.fn(() => this._loaded);
    this.getStyle = vi.fn(() => this._style);
    this.getSource = vi.fn((id) => this._style.sources[id]);
    this.getLayer = vi.fn((id) =>
      (this._style.layers ?? []).find((layer) => layer.id === id),
    );
    this.getCanvas = vi.fn(() => ({
      style: { cursor: "" },
    }));
    this.getCenter = vi.fn(() => ({ lng: 0, lat: 0 }));
    this.getZoom = vi.fn(() => 2);
    this.fitBounds = vi.fn();
    this.queryRenderedFeatures = vi.fn(() => []);
    this.flyTo = vi.fn();
    this.hasImage = vi.fn(() => false);
    this.addImage = vi.fn();
    this.updateImage = vi.fn();
    this.setProjection = vi.fn();
    this.setStyle = vi.fn((style) => {
      this._style = normaliseStyle(style);
      this.fire("style.load", {
        type: "style.load",
      });
    });
    this.remove = vi.fn();
  });

  return {
    Map: MockMap,
    LngLatBounds: MockLngLatBounds,
  };
});

import { createInstance } from "../../src/entry.js";
import { defaultConfig } from "../../src/config/defaults.js";
import { resolveConfig } from "../../src/config/resolveConfig.js";
import { normaliseInstanceDocument } from "../../src/document/instanceDocument.js";
import {
  clearRuntimeRegistry,
  getCoreByMap,
} from "../../src/runtime/runtimeRegistry.js";
import {
  WAYMARK_DATA_LAYER_ADDED_EVENT,
  WAYMARK_DATA_LAYER_ERROR_EVENT,
  WAYMARK_DATA_LAYER_MOUNTED_EVENT,
  WAYMARK_FEATURE_CLICK_EVENT,
  WAYMARK_FEATURE_HOVER_EVENT,
  WAYMARK_FEATURE_LEAVE_EVENT,
} from "../../src/runtime/createInstanceEvents.js";
import { LngLatBounds, Map } from "maplibre-gl";

const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection",
  features: [],
};

const STYLE_WITH_SYMBOL = {
  version: 8,
  sources: {},
  layers: [
    { id: "background", type: "background" },
    { id: "poi-label", type: "symbol" },
  ],
};

function createMockMap(options = {}) {
  return new Map({
    container: "map",
    style: structuredClone(STYLE_WITH_SYMBOL),
    ...options,
  });
}

/**
 * @param {object} geometry
 * @param {object} [properties]
 */
function featureCollection(geometry, properties = {}) {
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry, properties }],
  };
}

describe("1. API", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="map"></div>';
    vi.clearAllMocks();
    clearRuntimeRegistry();
  });

  describe("Quick start", () => {
    it("creates an instance for an injected map", () => {
      const map = createMockMap();
      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
        },
      });

      expect(instance.id).toBe("map");
      expect(instance.toJSON().config.id).toBe("map");
      expect(getCoreByMap(map)).toBeTruthy();
    });
  });

  describe("Factory signature", () => {
    it("accepts a map and an instance document", () => {
      const map = createMockMap();
      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [{ data: EMPTY_FEATURE_COLLECTION }],
          },
        },
      });

      expect(instance.id).toBe("map");
      expect(map.on).toHaveBeenCalledWith("load", expect.any(Function));
    });

    it("accepts an empty instance document", () => {
      const map = createMockMap();
      const instance = createInstance({ map });

      expect(instance.id).toMatch(/^waymark-/);
      expect(instance.toJSON().data.layers).toEqual([]);
    });

    it("supports strict round-trip serialisation", () => {
      const first = createInstance({
        map: createMockMap(),
        document: {
          config: { id: "map" },
          data: {
            layers: [{ data: EMPTY_FEATURE_COLLECTION }],
          },
        },
      });

      document.body.innerHTML += '<div id="map-two"></div>';

      const second = createInstance({
        map: createMockMap({ container: "map-two" }),
        document: first.toJSON(),
      });

      expect(second.toJSON()).toEqual(first.toJSON());
    });

    it("normalises to strict top-level config/state/data keys", () => {
      const normalised = normaliseInstanceDocument({
        config: {
          id: "map",
        },
        state: {
          debug: true,
          unknown: true,
        },
        data: {
          layers: [
            {
              data: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    geometry: null,
                  },
                ],
              },
            },
          ],
        },
        unknown: true,
      });

      expect(Object.keys(normalised)).toEqual(["config", "state", "data"]);
      expect(normalised.config).toEqual({ id: "map", debug: false });
      expect(normalised.state).toEqual({ debug: true });
      expect(normalised.data).toEqual({
        layers: [
          {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: null,
                },
              ],
            },
          },
        ],
      });
    });

    it("defaults data layer type to geojson when omitted", () => {
      const normalised = normaliseInstanceDocument({
        data: {
          layers: [
            {
              data: EMPTY_FEATURE_COLLECTION,
            },
          ],
        },
      });

      expect(normalised.data.layers).toEqual([
        {
          type: "geojson",
          data: EMPTY_FEATURE_COLLECTION,
        },
      ]);
    });

    it("accepts minimal GeoJSON shapes for data layers", () => {
      const normalised = normaliseInstanceDocument({
        data: {
          layers: [
            { data: EMPTY_FEATURE_COLLECTION },
            {
              data: {
                type: "Feature",
                geometry: null,
              },
            },
            {
              data: {
                type: "GeometryCollection",
                geometries: [
                  {
                    type: "Point",
                    coordinates: [0, 0],
                  },
                ],
              },
            },
          ],
        },
      });

      expect(normalised.data.layers).toHaveLength(3);
    });

    it("rejects invalid GeoJSON shapes for data layers", () => {
      expect(() =>
        normaliseInstanceDocument({
          data: {
            layers: [{ data: { type: "FeatureCollection" } }],
          },
        }),
      ).toThrow("Invalid data.layers[0].data.features: expected an array.");

      expect(() =>
        normaliseInstanceDocument({
          data: {
            layers: [
              {
                data: {
                  type: "LineString",
                  coordinates: [[0, 0]],
                },
              },
            ],
          },
        }),
      ).toThrow(
        "Invalid data.layers[0].data.coordinates: expected a LineString coordinates array with at least two positions.",
      );
    });

    it("rejects unsupported data layer types", () => {
      expect(() =>
        normaliseInstanceDocument({
          data: {
            layers: [
              {
                type: "raster",
                data: EMPTY_FEATURE_COLLECTION,
              },
            ],
          },
        }),
      ).toThrow(
        "Invalid data.layers[0].type: only geojson is currently supported.",
      );
    });
  });

  describe("Map injection", () => {
    it("throws a TypeError when no map is provided", () => {
      expect(() => createInstance()).toThrow(TypeError);
      expect(() => createInstance()).toThrow(
        "createInstance({ map }) requires a MapLibre-compatible map instance; received undefined.",
      );
    });

    it("throws a TypeError naming the missing map methods", () => {
      expect(() => createInstance({ map: {} })).toThrow(TypeError);
      expect(() => createInstance({ map: {} })).toThrow(
        /Missing method\(s\): getContainer, on, off, addSource, addLayer, getStyle, fitBounds\./,
      );
    });

    it("throws when the same map already has a runtime", () => {
      const map = createMockMap();

      createInstance({ map, document: { config: { id: "map" } } });

      expect(() =>
        createInstance({ map, document: { config: { id: "map" } } }),
      ).toThrow(
        "This map already has a Waymark instance. Call destroy() on the existing instance before creating another.",
      );
    });

    it("mounts immediately when the injected map is already loaded", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      expect(map.getSource("waymark-map-geojson-source-0")).toBeTruthy();
      expect(map.getLayer("waymark-map-geojson-layer-0-line")).toBeTruthy();
    });

    it("waits for load when the injected map is not yet loaded", () => {
      const map = createMockMap();

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      expect(map.getSource("waymark-map-geojson-source-0")).toBeUndefined();

      map.fire("load", { type: "load" });

      expect(map.getSource("waymark-map-geojson-source-0")).toBeTruthy();
    });
  });

  describe("Config defaults and merge behaviour", () => {
    it("uses documented debug defaults", () => {
      expect(defaultConfig.debug).toBe(false);
      expect(resolveConfig({}).debug).toBe(false);
    });

    it("normalises debug to a boolean", () => {
      expect(resolveConfig({ debug: true }).debug).toBe(true);
      expect(resolveConfig({ debug: "yes" }).debug).toBe(false);
    });
  });

  describe("Returned instance shape", () => {
    it("returns the documented API methods", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
      });

      expect(instance).toEqual(
        expect.objectContaining({
          id: "map",
          toJSON: expect.any(Function),
          data: expect.objectContaining({
            addLayer: expect.any(Function),
            fitBounds: expect.any(Function),
          }),
          destroy: expect.any(Function),
          on: expect.any(Function),
          off: expect.any(Function),
          once: expect.any(Function),
        }),
      );
      expect(instance.data.featureProperties).toBeUndefined();
    });
  });

  describe("Instance reuse and destroy semantics", () => {
    it("destroy() leaves the map and container intact", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      instance.destroy();

      expect(map.remove).not.toHaveBeenCalled();
      expect(document.getElementById("map")).toBeTruthy();
      expect(getCoreByMap(map)).toBeUndefined();
    });

    it("destroy removes Waymark-owned sources and layers", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      expect(map.getSource("waymark-map-geojson-source-0")).toBeTruthy();

      instance.destroy();

      expect(map.getSource("waymark-map-geojson-source-0")).toBeUndefined();
      expect(map.getLayer("waymark-map-geojson-layer-0-line")).toBeUndefined();
    });

    it("destroy is idempotent and allows a fresh instance on the same map", () => {
      const map = createMockMap();

      const first = createInstance({
        map,
        document: { config: { id: "map" } },
      });

      first.destroy();
      first.destroy();

      const second = createInstance({
        map,
        document: { config: { id: "map" } },
      });

      expect(second).not.toBe(first);
      expect(map.remove).not.toHaveBeenCalled();
    });
  });

  describe("Instance event API", () => {
    it("supports on/off/once on the map container", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
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

    it("emits lifecycle created and destroyed events with id detail", () => {
      const container = document.getElementById("map");
      const created = vi.fn();
      const destroyed = vi.fn();
      container.addEventListener("waymark:instance.created", created);
      container.addEventListener("waymark:instance.destroyed", destroyed);

      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
      });

      instance.destroy();

      expect(created.mock.calls[0][0].detail).toEqual({ id: "map" });
      expect(destroyed.mock.calls[0][0].detail).toEqual({ id: "map" });
    });
  });

  describe("InstanceDocument shape", () => {
    it("toJSON has no map or ui slices", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
      });

      const instanceDocument = instance.toJSON();

      expect(Object.keys(instanceDocument)).toEqual([
        "config",
        "state",
        "data",
      ]);
      expect(instanceDocument.config["map"]).toBeUndefined();
      expect(instanceDocument.config.ui).toBeUndefined();
      expect(instanceDocument.state["map"]).toBeUndefined();
    });

    it("keeps runtime metadata out of toJSON", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      const instanceDocument = instance.toJSON();

      expect(instanceDocument.data.layers).toEqual([
        { type: "geojson", data: EMPTY_FEATURE_COLLECTION },
      ]);
      expect(instanceDocument.runtime).toBeUndefined();
    });

    it("serialises a state.types delta for hidden types", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: {
          config: {
            id: "map",
            types: {
              beer: { paint: { circle: { "circle-color": "#754423" } } },
            },
          },
        },
      });

      instance.types.setVisibility("beer", false);

      expect(instance.toJSON().state.types).toEqual({
        beer: { visible: false },
      });
    });

    it("serialises a state.debug delta", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
      });

      instance.debug.setEnabled(true);

      expect(instance.toJSON().state.debug).toBe(true);
    });
  });

  describe("Initial GeoJSON overlay", () => {
    it("emits waymark:data.layer.added when runtime addLayer succeeds", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
      });
      const seen = [];

      instance.on(WAYMARK_DATA_LAYER_ADDED_EVENT, (event) => {
        seen.push(event.detail);
      });

      instance.data.addLayer({ data: EMPTY_FEATURE_COLLECTION });

      expect(seen).toEqual([
        {
          id: "map",
          layer: {
            type: "geojson",
            data: EMPTY_FEATURE_COLLECTION,
          },
        },
      ]);
    });

    it("emits waymark:data.layer.error with validation stage and rethrows", () => {
      const instance = createInstance({
        map: createMockMap(),
        document: { config: { id: "map" } },
      });
      const seen = [];

      instance.on(WAYMARK_DATA_LAYER_ERROR_EVENT, (event) => {
        seen.push(event.detail);
      });

      expect(() =>
        instance.data.addLayer({
          data: { type: "FeatureCollection" },
        }),
      ).toThrow("Invalid data.layers[0].data.features: expected an array.");

      expect(seen).toEqual([
        {
          id: "map",
          stage: "validation",
          message: "Invalid data.layers[0].data.features: expected an array.",
        },
      ]);
    });

    it("emits waymark:data.layer.error with runtime stage and rethrows", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: { config: { id: "map" } },
      });

      map.addSource.mockImplementationOnce(() => {
        throw new Error("Map source add failed.");
      });

      const seen = [];

      instance.on(WAYMARK_DATA_LAYER_ERROR_EVENT, (event) => {
        seen.push(event.detail);
      });

      expect(() =>
        instance.data.addLayer({ data: EMPTY_FEATURE_COLLECTION }),
      ).toThrow("Map source add failed.");

      expect(seen).toEqual([
        {
          id: "map",
          stage: "runtime",
          message: "Map source add failed.",
        },
      ]);
    });

    it("scopes source and layer ids by instance token", () => {
      const geoJSON = EMPTY_FEATURE_COLLECTION;

      const oneMap = createMockMap();
      oneMap._loaded = true;
      const one = createInstance({
        map: oneMap,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: geoJSON }] },
        },
      });

      document.body.innerHTML += '<div id="map-two"></div>';

      const twoMap = createMockMap({ container: "map-two" });
      twoMap._loaded = true;
      const two = createInstance({
        map: twoMap,
        document: {
          config: { id: "map-two" },
          data: { layers: [{ data: geoJSON }] },
        },
      });

      expect(one.id).toBe("map");
      expect(two.id).toBe("map-two");
      expect(oneMap.getSource("waymark-map-geojson-source-0")).toBeTruthy();
      expect(twoMap.getSource("waymark-map-two-geojson-source-0")).toBeTruthy();
    });

    it("renders a point layer as a circle with an invisible hit circle", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      properties: {},
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      expect(map.getStyle().layers.map((layer) => layer.id)).toEqual([
        "background",
        "waymark-map-geojson-layer-0-circle-hit",
        "waymark-map-geojson-layer-0-circle",
        "poi-label",
      ]);
    });

    it("renders points as a circle sublayer with no symbol sublayer when no icon is defined", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: {
            id: "map",
            types: {
              beer: { paint: { circle: { "circle-color": "#754423" } } },
            },
          },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      properties: { waymarkType: "beer" },
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const typedCircle = map.getLayer(
        "waymark-map-geojson-layer-0-circle-type-beer",
      );

      expect(typedCircle.type).toBe("circle");
      expect(
        map
          .getStyle()
          .layers.some(
            (layer) =>
              layer.id.startsWith("waymark-map-geojson-layer-") &&
              layer.type === "symbol",
          ),
      ).toBe(false);
      expect(map.addImage).not.toHaveBeenCalled();
    });

    it("treats types[].icon as a name hook for a symbol sublayer without registering an image", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: {
            id: "map",
            types: {
              beer: {
                icon: "beer-icon",
                paint: { circle: { "circle-color": "#754423" } },
              },
            },
          },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      properties: { waymarkType: "beer" },
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const symbolLayer = map.getLayer(
        "waymark-map-geojson-layer-0-symbol-type-beer",
      );

      expect(symbolLayer.type).toBe("symbol");
      expect(symbolLayer.layout).toEqual({
        "icon-image": "beer-icon",
        "icon-size": 1.5,
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      });
      expect(symbolLayer.paint).toEqual({ "icon-opacity": 1 });

      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-hit-beer").paint,
      ).toEqual({
        "circle-color": "#754423",
        "circle-radius": 14,
        "circle-opacity": 0,
      });

      expect(map.addImage).not.toHaveBeenCalled();
      expect(map.updateImage).not.toHaveBeenCalled();
    });

    it("hides and restores every layer of an icon type, including its hit circle", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: {
          config: {
            id: "map",
            types: {
              photo: {
                icon: "photo-marker",
                paint: { circle: { "circle-color": "#70af00" } },
              },
            },
          },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      properties: { waymarkType: "photo" },
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const symbolLayerId = "waymark-map-geojson-layer-0-symbol-type-photo";
      const hitLayerId = "waymark-map-geojson-layer-0-circle-hit-photo";

      instance.types.setVisibility("photo", false);

      expect(map.getLayer(symbolLayerId).layout.visibility).toBe("none");
      expect(map.getLayer(hitLayerId).layout.visibility).toBe("none");

      instance.types.setVisibility("photo", true);

      expect(map.getLayer(symbolLayerId).layout.visibility).toBe("visible");
      expect(map.getLayer(hitLayerId).layout.visibility).toBe("visible");
    });

    it("renders geometry families as circle, line, and fill layers with stable defaults", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: featureCollection({
                  type: "Point",
                  coordinates: [-0.1276, 51.5074],
                }),
              },
              {
                data: featureCollection({
                  type: "MultiPoint",
                  coordinates: [
                    [-0.1276, 51.5074],
                    [-1.2577, 51.752],
                  ],
                }),
              },
              {
                data: featureCollection({
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                }),
              },
              {
                data: featureCollection({
                  type: "MultiLineString",
                  coordinates: [
                    [
                      [0, 0],
                      [1, 1],
                    ],
                    [
                      [1, 1],
                      [2, 2],
                    ],
                  ],
                }),
              },
              {
                data: featureCollection({
                  type: "Polygon",
                  coordinates: [
                    [
                      [0, 0],
                      [2, 0],
                      [2, 2],
                      [0, 2],
                      [0, 0],
                    ],
                  ],
                }),
              },
              {
                data: featureCollection({
                  type: "MultiPolygon",
                  coordinates: [
                    [
                      [
                        [0, 0],
                        [1, 0],
                        [1, 1],
                        [0, 1],
                        [0, 0],
                      ],
                    ],
                  ],
                }),
              },
            ],
          },
        },
      });

      const layersById = Object.fromEntries(
        map
          .getStyle()
          .layers.map((layer) => [
            layer.id,
            { type: layer.type, paint: layer.paint },
          ]),
      );

      expect(map.getStyle().layers.map((layer) => layer.id)).toEqual([
        "background",
        "waymark-map-geojson-layer-5-fill",
        "waymark-map-geojson-layer-4-fill",
        "waymark-map-geojson-layer-3-line",
        "waymark-map-geojson-layer-2-line",
        "waymark-map-geojson-layer-1-circle-hit",
        "waymark-map-geojson-layer-1-circle",
        "waymark-map-geojson-layer-0-circle-hit",
        "waymark-map-geojson-layer-0-circle",
        "poi-label",
      ]);

      expect(layersById["waymark-map-geojson-layer-0-circle"]).toEqual({
        type: "circle",
        paint: {
          "circle-radius": 5,
          "circle-color": "#e6194b",
        },
      });
      expect(layersById["waymark-map-geojson-layer-1-circle"]).toEqual({
        type: "circle",
        paint: {
          "circle-radius": 5,
          "circle-color": "#3cb44b",
        },
      });
      expect(layersById["waymark-map-geojson-layer-2-line"]).toEqual({
        type: "line",
        paint: {
          "line-width": 3,
          "line-color": "#ffe119",
        },
      });
      expect(layersById["waymark-map-geojson-layer-3-line"]).toEqual({
        type: "line",
        paint: {
          "line-width": 3,
          "line-color": "#4363d8",
        },
      });
      expect(layersById["waymark-map-geojson-layer-4-fill"]).toEqual({
        type: "fill",
        paint: {
          "fill-opacity": 0.35,
          "fill-color": "#f58231",
        },
      });
      expect(layersById["waymark-map-geojson-layer-5-fill"]).toEqual({
        type: "fill",
        paint: {
          "fill-opacity": 0.35,
          "fill-color": "#911eb4",
        },
      });

      expect(layersById["waymark-map-geojson-layer-0-circle-hit"]).toEqual({
        type: "circle",
        paint: {
          "circle-color": "#e6194b",
          "circle-radius": 14,
          "circle-opacity": 0,
        },
      });
      expect(layersById["waymark-map-geojson-layer-1-circle-hit"]).toEqual({
        type: "circle",
        paint: {
          "circle-color": "#3cb44b",
          "circle-radius": 14,
          "circle-opacity": 0,
        },
      });
    });

    it("renders mixed geometry families from a single FeatureCollection layer", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: {
                        type: "Point",
                        coordinates: [-0.1276, 51.5074],
                      },
                      properties: {},
                    },
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [0, 0],
                          [1, 1],
                        ],
                      },
                      properties: {},
                    },
                    {
                      type: "Feature",
                      geometry: {
                        type: "Polygon",
                        coordinates: [
                          [
                            [0, 0],
                            [2, 0],
                            [2, 2],
                            [0, 2],
                            [0, 0],
                          ],
                        ],
                      },
                      properties: {},
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const layersById = Object.fromEntries(
        map
          .getStyle()
          .layers.map((layer) => [
            layer.id,
            { type: layer.type, paint: layer.paint },
          ]),
      );

      expect(map.getStyle().layers.map((layer) => layer.id)).toEqual([
        "background",
        "waymark-map-geojson-layer-0-circle-hit",
        "waymark-map-geojson-layer-0-fill",
        "waymark-map-geojson-layer-0-line",
        "waymark-map-geojson-layer-0-circle",
        "poi-label",
      ]);

      expect(layersById["waymark-map-geojson-layer-0-circle"]).toEqual({
        type: "circle",
        paint: {
          "circle-radius": 5,
          "circle-color": "#e6194b",
        },
      });
      expect(layersById["waymark-map-geojson-layer-0-line"]).toEqual({
        type: "line",
        paint: {
          "line-width": 3,
          "line-color": "#e6194b",
        },
      });
      expect(layersById["waymark-map-geojson-layer-0-fill"]).toEqual({
        type: "fill",
        paint: {
          "fill-opacity": 0.35,
          "fill-color": "#e6194b",
        },
      });
      expect(layersById["waymark-map-geojson-layer-0-circle-hit"]).toEqual({
        type: "circle",
        paint: {
          "circle-color": "#e6194b",
          "circle-radius": 14,
          "circle-opacity": 0,
        },
      });
    });

    it("constrains each family layer to its own geometry type for a mixed FeatureCollection", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      properties: {},
                    },
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [0, 0],
                          [1, 1],
                        ],
                      },
                      properties: {},
                    },
                    {
                      type: "Feature",
                      geometry: {
                        type: "Polygon",
                        coordinates: [
                          [
                            [0, 0],
                            [2, 0],
                            [2, 2],
                            [0, 2],
                            [0, 0],
                          ],
                        ],
                      },
                      properties: {},
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      expect(map.getLayer("waymark-map-geojson-layer-0-circle").filter).toEqual(
        ["==", ["geometry-type"], "Point"],
      );
      expect(map.getLayer("waymark-map-geojson-layer-0-line").filter).toEqual([
        "==",
        ["geometry-type"],
        "LineString",
      ]);
      expect(map.getLayer("waymark-map-geojson-layer-0-fill").filter).toEqual([
        "==",
        ["geometry-type"],
        "Polygon",
      ]);

      // Derived hit circles must carry the same combined filter as their source.
      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-hit").filter,
      ).toEqual(["==", ["geometry-type"], "Point"]);
    });

    it("applies config.types paint to typed sublayers", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: {
            id: "map",
            types: {
              beer: {
                paint: {
                  circle: { "circle-color": "#754423", "circle-radius": 8 },
                  line: { "line-color": "#654321" },
                  fill: { "fill-color": "#987654" },
                },
              },
            },
          },
          data: {
            layers: [
              {
                data: {
                  type: "FeatureCollection",
                  features: [
                    {
                      type: "Feature",
                      geometry: { type: "Point", coordinates: [0, 0] },
                      properties: { waymarkType: "beer" },
                    },
                    {
                      type: "Feature",
                      geometry: {
                        type: "LineString",
                        coordinates: [
                          [0, 0],
                          [1, 1],
                        ],
                      },
                      properties: { waymarkType: "beer" },
                    },
                    {
                      type: "Feature",
                      geometry: {
                        type: "Polygon",
                        coordinates: [
                          [
                            [0, 0],
                            [2, 0],
                            [2, 2],
                            [0, 2],
                            [0, 0],
                          ],
                        ],
                      },
                      properties: { waymarkType: "beer" },
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-type-beer"),
      ).toBeTruthy();

      expect(map.getLayer("waymark-map-geojson-layer-0-circle").paint).toEqual({
        "circle-radius": 5,
        "circle-color": "#e6194b",
      });
      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-type-beer").paint,
      ).toEqual({
        "circle-radius": 8,
        "circle-color": "#754423",
      });
      expect(map.getLayer("waymark-map-geojson-layer-0-line").paint).toEqual({
        "line-width": 3,
        "line-color": "#e6194b",
      });
      expect(
        map.getLayer("waymark-map-geojson-layer-0-line-type-beer").paint,
      ).toEqual({
        "line-width": 3,
        "line-color": "#654321",
      });
      expect(map.getLayer("waymark-map-geojson-layer-0-fill").paint).toEqual({
        "fill-opacity": 0.35,
        "fill-color": "#e6194b",
      });
      expect(
        map.getLayer("waymark-map-geojson-layer-0-fill-type-beer").paint,
      ).toEqual({
        "fill-opacity": 0.35,
        "fill-color": "#987654",
      });

      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-hit").paint,
      ).toEqual({
        "circle-color": "#e6194b",
        "circle-radius": 14,
        "circle-opacity": 0,
      });
      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-type-beer-hit").paint,
      ).toEqual({
        "circle-color": "#754423",
        "circle-radius": 14,
        "circle-opacity": 0,
      });

      // Untyped fallbacks AND their geometry constraint with the no-type
      // predicate; typed sublayers AND it with the type predicate.
      expect(map.getLayer("waymark-map-geojson-layer-0-circle").filter).toEqual(
        [
          "all",
          ["==", ["geometry-type"], "Point"],
          ["!", ["has", "waymarkType"]],
        ],
      );
      expect(map.getLayer("waymark-map-geojson-layer-0-line").filter).toEqual([
        "all",
        ["==", ["geometry-type"], "LineString"],
        ["!", ["has", "waymarkType"]],
      ]);
      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-type-beer").filter,
      ).toEqual([
        "all",
        ["==", ["geometry-type"], "Point"],
        ["==", ["get", "waymarkType"], "beer"],
      ]);
      expect(
        map.getLayer("waymark-map-geojson-layer-0-line-type-beer").filter,
      ).toEqual([
        "all",
        ["==", ["geometry-type"], "LineString"],
        ["==", ["get", "waymarkType"], "beer"],
      ]);
      expect(
        map.getLayer("waymark-map-geojson-layer-0-fill-type-beer").filter,
      ).toEqual([
        "all",
        ["==", ["geometry-type"], "Polygon"],
        ["==", ["get", "waymarkType"], "beer"],
      ]);
    });

    it("applies data.layers[].paint to untyped sublayers only", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: {
            id: "map",
            types: {
              road: { paint: { line: { "line-color": "#abcdef" } } },
            },
          },
          data: {
            layers: [
              {
                data: featureCollection({
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                }),
                paint: { line: { "line-color": "#123456", "line-width": 2 } },
              },
            ],
          },
        },
      });

      expect(
        map.getLayer("waymark-map-geojson-layer-0-line-type-road"),
      ).toBeTruthy();

      expect(map.getLayer("waymark-map-geojson-layer-0-line").paint).toEqual({
        "line-width": 2,
        "line-color": "#123456",
      });
      expect(
        map.getLayer("waymark-map-geojson-layer-0-line-type-road").paint,
      ).toEqual({
        "line-width": 3,
        "line-color": "#abcdef",
      });
    });

    it("merges config.paint under type and layer overrides", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: {
            id: "map",
            paint: {
              circle: { "circle-color": "#101010" },
              line: { "line-width": 9, "line-color": "#101010" },
              fill: { "fill-opacity": 0.8 },
            },
            types: {
              beer: { paint: { circle: { "circle-color": "#754423" } } },
            },
          },
          data: {
            layers: [
              {
                data: featureCollection({
                  type: "Point",
                  coordinates: [0, 0],
                }),
              },
              {
                data: featureCollection({
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                }),
                paint: { line: { "line-color": "#123456" } },
              },
              {
                data: featureCollection({
                  type: "Polygon",
                  coordinates: [
                    [
                      [0, 0],
                      [2, 0],
                      [2, 2],
                      [0, 2],
                      [0, 0],
                    ],
                  ],
                }),
              },
            ],
          },
        },
      });

      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-type-beer"),
      ).toBeTruthy();

      // Instance paint overrides the colour pool but keeps the family default.
      expect(map.getLayer("waymark-map-geojson-layer-0-circle").paint).toEqual({
        "circle-radius": 5,
        "circle-color": "#101010",
      });
      // Type paint overrides instance paint; family defaults still survive.
      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-type-beer").paint,
      ).toEqual({
        "circle-radius": 5,
        "circle-color": "#754423",
      });
      // Instance paint overrides the line default; layer paint overrides both.
      expect(map.getLayer("waymark-map-geojson-layer-1-line").paint).toEqual({
        "line-width": 9,
        "line-color": "#123456",
      });
      // Instance paint overrides the fill default; the pool colour remains.
      expect(map.getLayer("waymark-map-geojson-layer-2-fill").paint).toEqual({
        "fill-opacity": 0.8,
        "fill-color": "#ffe119",
      });
    });

    it("wraps paint in coalesce expressions for features carrying waymarkPaint", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: featureCollection(
                  { type: "Point", coordinates: [0, 0] },
                  {
                    waymarkPaint: {
                      "circle-color": "#000000",
                      "circle-radius": 10,
                    },
                  },
                ),
              },
            ],
          },
        },
      });

      expect(map.getLayer("waymark-map-geojson-layer-0-circle").paint).toEqual({
        "circle-radius": [
          "coalesce",
          ["get", "circle-radius", ["get", "waymarkPaint", ["properties"]]],
          5,
        ],
        "circle-color": [
          "coalesce",
          ["get", "circle-color", ["get", "waymarkPaint", ["properties"]]],
          "#e6194b",
        ],
      });

      // Hit circles stay static so click targeting does not become data-driven.
      expect(
        map.getLayer("waymark-map-geojson-layer-0-circle-hit").paint,
      ).toEqual({
        "circle-color": "#e6194b",
        "circle-radius": 14,
        "circle-opacity": 0,
      });
    });

    it("emits waymark:data.layer.mounted when sublayers are mounted", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: { config: { id: "map" } },
      });

      const seen = [];
      instance.on(WAYMARK_DATA_LAYER_MOUNTED_EVENT, (event) => {
        seen.push(event.detail);
      });

      instance.data.addLayer({
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [0, 0] },
              properties: {},
            },
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [0, 0],
                  [1, 1],
                ],
              },
              properties: {},
            },
          ],
        },
      });

      expect(seen).toEqual([
        {
          id: "map",
          layerIndex: 0,
          mountedFamilies: ["circle", "line", "circle"],
          mountedLayerIds: [
            "waymark-map-geojson-layer-0-circle",
            "waymark-map-geojson-layer-0-line",
            "waymark-map-geojson-layer-0-circle-hit",
          ],
          mountedTypes: [],
        },
      ]);
    });

    it("fits bounds via the injected map.fitBounds when fitBounds defaults to true", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: { config: { id: "map" } },
      });

      instance.data.addLayer({
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [0, 0],
                  [1, 1],
                ],
              },
              properties: {},
            },
          ],
        },
      });

      expect(map.fitBounds).toHaveBeenCalledTimes(1);
      expect(map.fitBounds).toHaveBeenCalledWith(expect.any(LngLatBounds), {
        padding: 20,
      });

      const bounds = map.fitBounds.mock.calls[0][0];
      expect(bounds._sw).toEqual([0, 0]);
      expect(bounds._ne).toEqual([1, 1]);
    });

    it("skips bounds fitting when fitBounds is false", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: { config: { id: "map" } },
      });

      instance.data.addLayer(
        {
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                },
                properties: {},
              },
            ],
          },
        },
        { fitBounds: false },
      );

      expect(map.fitBounds).not.toHaveBeenCalled();
    });

    it("remounts GeoJSON layers after a style.load", () => {
      const map = createMockMap();
      map._loaded = true;

      createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      map.setStyle({ version: 8, sources: {}, layers: [] });

      expect(map.getSource("waymark-map-geojson-source-0")).toBeTruthy();
      expect(map.getLayer("waymark-map-geojson-layer-0-line")).toBeTruthy();
    });

    it("cleans up map event handlers on destroy", () => {
      const map = createMockMap();

      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: { layers: [{ data: EMPTY_FEATURE_COLLECTION }] },
        },
      });

      instance.destroy();

      expect(map.off).toHaveBeenCalledWith("load", expect.any(Function));
      expect(map.off).toHaveBeenCalledWith("style.load", expect.any(Function));
    });
  });

  describe("Feature interaction events", () => {
    function createPointInstance() {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: featureCollection(
                  { type: "Point", coordinates: [0, 0] },
                  { title: "Test", description: "Test feature" },
                ),
              },
            ],
          },
        },
      });

      return { map, instance };
    }

    function renderedFeature(layerId, properties = {}) {
      return {
        type: "Feature",
        id: `${layerId}-feature`,
        geometry: { type: "Point", coordinates: [0, 0] },
        properties,
        // MapLibre presentation internals: must never reach the emitted detail.
        layer: { id: layerId },
        source: `${layerId}-source`,
        state: { loaded: true },
        _vectorTileFeature: {},
      };
    }

    function cleanFeature(layerId, properties = {}) {
      return {
        type: "Feature",
        id: `${layerId}-feature`,
        geometry: { type: "Point", coordinates: [0, 0] },
        properties,
      };
    }

    const HIT_LAYER = "waymark-map-geojson-layer-0-circle-hit";
    const LINE_LAYER = "waymark-map-geojson-layer-1-line";

    it("emits waymark:feature.click with the resolved feature detail", () => {
      const { map, instance } = createPointInstance();
      const seen = [];

      instance.on(WAYMARK_FEATURE_CLICK_EVENT, (event) => {
        seen.push(event.detail);
      });

      const feature = renderedFeature(HIT_LAYER, { title: "Test" });
      map.queryRenderedFeatures.mockReturnValue([feature]);

      const lngLat = { lng: 0, lat: 0 };
      const originalEvent = { type: "click" };
      map.fire("click", { point: { x: 1, y: 1 }, lngLat, originalEvent });

      expect(seen).toEqual([
        {
          id: "map",
          feature: cleanFeature(HIT_LAYER, { title: "Test" }),
          layerId: HIT_LAYER,
          lngLat,
          originalEvent,
        },
      ]);
    });

    it("strips MapLibre internals from the emitted feature", () => {
      const { map, instance } = createPointInstance();
      const seen = [];

      instance.on(WAYMARK_FEATURE_CLICK_EVENT, (event) => {
        seen.push(event.detail);
      });

      map.queryRenderedFeatures.mockReturnValue([
        renderedFeature(HIT_LAYER, { title: "Test" }),
      ]);

      map.fire("click", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].feature).toEqual(
        cleanFeature(HIT_LAYER, { title: "Test" }),
      );
      expect(seen[0].feature).not.toHaveProperty("layer");
      expect(seen[0].feature).not.toHaveProperty("source");
      expect(seen[0].feature).not.toHaveProperty("state");
      expect(seen[0].feature).not.toHaveProperty("_vectorTileFeature");
    });

    it("omits the feature id when the rendered feature has none", () => {
      const { map, instance } = createPointInstance();
      const seen = [];

      instance.on(WAYMARK_FEATURE_CLICK_EVENT, (event) => {
        seen.push(event.detail);
      });

      const feature = renderedFeature(HIT_LAYER, { title: "No id" });
      delete feature.id;
      map.queryRenderedFeatures.mockReturnValue([feature]);

      map.fire("click", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].feature).toEqual({
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { title: "No id" },
      });
      expect(seen[0].feature).not.toHaveProperty("id");
    });

    it("prefers the highest-priority layer when features overlap", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: featureCollection({ type: "Point", coordinates: [0, 0] }),
              },
              {
                data: featureCollection({
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                }),
              },
            ],
          },
        },
      });

      const seen = [];

      instance.on(WAYMARK_FEATURE_CLICK_EVENT, (event) => {
        seen.push(event.detail.layerId);
      });

      const lineFeature = renderedFeature(LINE_LAYER);
      const hitCircleFeature = renderedFeature(HIT_LAYER);

      // Return the lower-priority line first to prove priority beats render order.
      map.queryRenderedFeatures.mockReturnValue([
        lineFeature,
        hitCircleFeature,
      ]);

      map.fire("click", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      expect(seen).toEqual([HIT_LAYER]);
    });

    it("emits hover once per feature entry and suppresses repeats", () => {
      const { map, instance } = createPointInstance();
      const hovers = [];
      const leaves = [];

      instance.on(WAYMARK_FEATURE_HOVER_EVENT, (event) => {
        hovers.push(event.detail);
      });
      instance.on(WAYMARK_FEATURE_LEAVE_EVENT, (event) => {
        leaves.push(event.detail);
      });

      map.queryRenderedFeatures.mockReturnValue([renderedFeature(HIT_LAYER)]);

      const event = {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      };

      map.fire("mousemove", event);
      map.fire("mousemove", event);

      expect(hovers).toHaveLength(1);
      expect(hovers[0].layerId).toBe(HIT_LAYER);
      expect(leaves).toHaveLength(0);
    });

    it("emits leave then hover when the pointer moves directly onto a different feature", () => {
      const map = createMockMap();
      map._loaded = true;

      const instance = createInstance({
        map,
        document: {
          config: { id: "map" },
          data: {
            layers: [
              {
                data: featureCollection({ type: "Point", coordinates: [0, 0] }),
              },
              {
                data: featureCollection({
                  type: "LineString",
                  coordinates: [
                    [0, 0],
                    [1, 1],
                  ],
                }),
              },
            ],
          },
        },
      });

      const events = [];

      instance.on(WAYMARK_FEATURE_HOVER_EVENT, (event) => {
        events.push({ type: "hover", detail: event.detail });
      });
      instance.on(WAYMARK_FEATURE_LEAVE_EVENT, (event) => {
        events.push({ type: "leave", detail: event.detail });
      });

      const featureA = renderedFeature(HIT_LAYER, { title: "A" });
      const featureB = renderedFeature(LINE_LAYER, { title: "B" });

      const firstMove = {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      };

      map.queryRenderedFeatures.mockReturnValue([featureA]);
      map.fire("mousemove", firstMove);

      const secondMove = {
        point: { x: 2, y: 2 },
        lngLat: { lng: 1, lat: 1 },
        originalEvent: {},
      };

      map.queryRenderedFeatures.mockReturnValue([featureB]);
      map.fire("mousemove", secondMove);

      expect(events.map(({ type }) => type)).toEqual([
        "hover",
        "leave",
        "hover",
      ]);
      expect(events[0].detail).toEqual({
        id: "map",
        feature: cleanFeature(HIT_LAYER, { title: "A" }),
        layerId: HIT_LAYER,
        lngLat: firstMove.lngLat,
        originalEvent: firstMove.originalEvent,
      });
      expect(events[1].detail).toEqual({
        id: "map",
        feature: cleanFeature(HIT_LAYER, { title: "A" }),
        layerId: HIT_LAYER,
        lngLat: secondMove.lngLat,
        originalEvent: secondMove.originalEvent,
      });
      expect(events[2].detail).toEqual({
        id: "map",
        feature: cleanFeature(LINE_LAYER, { title: "B" }),
        layerId: LINE_LAYER,
        lngLat: secondMove.lngLat,
        originalEvent: secondMove.originalEvent,
      });
    });

    it("emits leave when the pointer moves onto empty map space", () => {
      const { map, instance } = createPointInstance();
      const hovers = [];
      const leaves = [];

      instance.on(WAYMARK_FEATURE_HOVER_EVENT, (event) => {
        hovers.push(event.detail);
      });
      instance.on(WAYMARK_FEATURE_LEAVE_EVENT, (event) => {
        leaves.push(event.detail);
      });

      const feature = renderedFeature(HIT_LAYER);
      map.queryRenderedFeatures.mockReturnValue([feature]);
      map.fire("mousemove", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      map.queryRenderedFeatures.mockReturnValue([]);
      map.fire("mousemove", {
        point: { x: 50, y: 50 },
        lngLat: { lng: 5, lat: 5 },
        originalEvent: {},
      });

      expect(hovers).toHaveLength(1);
      expect(leaves).toHaveLength(1);
      expect(leaves[0].feature).toEqual(cleanFeature(HIT_LAYER));
      expect(leaves[0].layerId).toBe(HIT_LAYER);
      expect(leaves[0].lngLat).toEqual({ lng: 5, lat: 5 });
    });

    it("emits leave when the pointer leaves the map canvas", () => {
      const { map, instance } = createPointInstance();
      const leaves = [];

      instance.on(WAYMARK_FEATURE_LEAVE_EVENT, (event) => {
        leaves.push(event.detail);
      });

      const feature = renderedFeature(HIT_LAYER);
      map.queryRenderedFeatures.mockReturnValue([feature]);
      map.fire("mousemove", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      map.fire("mouseout", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      expect(leaves).toHaveLength(1);
      expect(leaves[0].feature).toEqual(cleanFeature(HIT_LAYER));
      expect(leaves[0].layerId).toBe(HIT_LAYER);
    });

    it("does not emit after destroy and detaches map listeners", () => {
      const { map, instance } = createPointInstance();
      const seen = [];

      instance.on(WAYMARK_FEATURE_CLICK_EVENT, (event) => {
        seen.push(event.detail);
      });
      instance.on(WAYMARK_FEATURE_HOVER_EVENT, (event) => {
        seen.push(event.detail);
      });
      instance.on(WAYMARK_FEATURE_LEAVE_EVENT, (event) => {
        seen.push(event.detail);
      });

      map.queryRenderedFeatures.mockReturnValue([renderedFeature(HIT_LAYER)]);

      instance.destroy();

      map.fire("click", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });
      map.fire("mousemove", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });
      map.fire("mouseout", {
        point: { x: 1, y: 1 },
        lngLat: { lng: 0, lat: 0 },
        originalEvent: {},
      });

      expect(seen).toEqual([]);
      expect(map.off).toHaveBeenCalledWith("click", expect.any(Function));
      expect(map.off).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(map.off).toHaveBeenCalledWith("mouseout", expect.any(Function));
    });

    it("does not expose featureProperties on the instance or toJSON", () => {
      const { instance } = createPointInstance();

      expect(instance.data.featureProperties).toBeUndefined();
      expect(JSON.stringify(instance.toJSON())).not.toContain(
        "featureProperties",
      );
    });
  });
});
