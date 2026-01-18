import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("maplibre-gl", () => {
  class MockMap {
    constructor(options = {}) {
      this.handlers = {};
      this.options = options;
      this.sources = {};
      this.layers = [];
      this._styleLayers = [];
      this.markers = [];
      const [defaultLng, defaultLat] = Array.isArray(options.center)
        ? options.center
        : [0, 0];
      this._zoom = options.zoom ?? 0;
      this._center = { lat: defaultLat, lng: defaultLng };

      const containerOption = options.container;
      const containerElement =
        typeof containerOption === "string"
          ? document.getElementById(containerOption)
          : containerOption;
      this.containerElement = containerElement;

      if (containerElement) {
        this.canvas = document.createElement("div");
        this.canvas.className = "maplibregl-canvas";
        this.canvas.dataset.testid = "mock-maplibre-canvas";
        containerElement.appendChild(this.canvas);

        if (options.attributionControl !== false) {
          this.attributionControl = document.createElement("div");
          this.attributionControl.className =
            "maplibregl-ctrl-bottom-right maplibregl-ctrl attribution";
          containerElement.appendChild(this.attributionControl);
        }
      } else {
        this.canvas = document.createElement("div");
      }
    }

    on(event, callback) {
      this.handlers[event] = callback;
      if (event === "load") {
        callback();
      }
    }

    queryRenderedFeatures() {
      return [];
    }

    getBounds() {
      return new MockLngLatBounds([-180, -90], [180, 90]);
    }

    fitBounds(bounds) {
      if (bounds instanceof MockLngLatBounds) {
        const center = bounds.getCenter();
        this._center = center;
      }
    }

    flyTo(options = {}) {
      if (typeof options.zoom === "number") {
        this._zoom = options.zoom;
      }
      if (Array.isArray(options.center)) {
        this._center = { lng: options.center[0], lat: options.center[1] };
      }
    }

    getZoom() {
      return this._zoom;
    }

    getCenter() {
      return this._center;
    }

    getCanvas() {
      return this.canvas;
    }

    addSource(id, source) {
      this.sources[id] = source;
    }

    addLayer(layer, beforeId) {
      const layerCopy = JSON.parse(JSON.stringify(layer));
      const insert = (targetArray) => {
        if (beforeId) {
          const index = targetArray.findIndex((l) => l.id === beforeId);
          if (index >= 0) {
            targetArray.splice(index, 0, JSON.parse(JSON.stringify(layerCopy)));
            return;
          }
        }
        targetArray.push(JSON.parse(JSON.stringify(layerCopy)));
      };

      insert(this.layers);
      insert(this._styleLayers);
    }

    getStyle() {
      return {
        layers: this._styleLayers,
      };
    }

    setLayoutProperty(id, property, value) {
      const updateLayer = (target) => {
        if (!target) return;
        target.layout = target.layout || {};
        target.layout[property] = value;
      };

      updateLayer(this.layers.find((layer) => layer.id === id));
      updateLayer(this._styleLayers.find((layer) => layer.id === id));
    }

    getLayer(id) {
      return (
        this.layers.find((layer) => layer.id === id) ||
        this._styleLayers.find((layer) => layer.id === id)
      );
    }

    getSource(id) {
      return this.sources[id];
    }

    removeLayer(id) {
      const removeFrom = (arr) => {
        const index = arr.findIndex((layer) => layer.id === id);
        if (index >= 0) {
          arr.splice(index, 1);
        }
      };
      removeFrom(this.layers);
      removeFrom(this._styleLayers);
    }

    removeSource(id) {
      delete this.sources[id];
    }

    getBearing() {
      return this._bearing || 0;
    }

    getPitch() {
      return this._pitch || 0;
    }
  }

  class MockLngLatBounds {
    constructor(sw = [0, 0], ne = sw) {
      const normalise = (value) => {
        if (Array.isArray(value)) {
          return { lng: value[0], lat: value[1] };
        }
        return value || { lng: 0, lat: 0 };
      };

      this.sw = normalise(sw);
      this.ne = normalise(ne);
    }

    extend(coord) {
      if (!coord) {
        return this;
      }

      if (coord instanceof MockLngLatBounds || (coord.sw && coord.ne)) {
        this.extend(coord.sw);
        this.extend(coord.ne);
        return this;
      }

      const point = Array.isArray(coord)
        ? { lng: coord[0], lat: coord[1] }
        : coord;
      this.sw.lng = Math.min(this.sw.lng, point.lng);
      this.sw.lat = Math.min(this.sw.lat, point.lat);
      this.ne.lng = Math.max(this.ne.lng, point.lng);
      this.ne.lat = Math.max(this.ne.lat, point.lat);
      return this;
    }

    contains(coord) {
      const point = Array.isArray(coord)
        ? { lng: coord[0], lat: coord[1] }
        : coord;
      return (
        point.lng >= this.sw.lng &&
        point.lng <= this.ne.lng &&
        point.lat >= this.sw.lat &&
        point.lat <= this.ne.lat
      );
    }

    getCenter() {
      return {
        lng: (this.sw.lng + this.ne.lng) / 2,
        lat: (this.sw.lat + this.ne.lat) / 2,
      };
    }

    getNorth() {
      return this.ne.lat;
    }

    getSouth() {
      return this.sw.lat;
    }

    getEast() {
      return this.ne.lng;
    }

    getWest() {
      return this.sw.lng;
    }
  }

  class MockMarker {
    constructor({ element } = {}) {
      this.element = element || document.createElement("div");
      this.lngLat = null;
      this.map = null;
    }

    setLngLat(lngLat) {
      this.lngLat = lngLat;
      return this;
    }

    addTo(map) {
      this.map = map;
      map.markers.push(this);
      if (map.containerElement && this.element) {
        map.containerElement.appendChild(this.element);
      }
      return this;
    }

    remove() {
      if (this.element?.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
      if (this.map) {
        const index = this.map.markers.indexOf(this);
        if (index >= 0) {
          this.map.markers.splice(index, 1);
        }
      }
      this.map = null;
    }

    getElement() {
      return this.element;
    }
  }

  const exports = {
    Map: MockMap,
    LngLatBounds: MockLngLatBounds,
    Marker: MockMarker,
  };
  exports.default = exports;
  return exports;
});

// Silence console.log/info/debug during tests
const noop = () => {};
console.log = noop;
console.info = noop;
console.debug = noop;

import { Instance } from "../library/entry.js";
import { TileLayer } from "../library/classes/TileLayer.js";
import {
  MarkerOverlay,
  LineOverlay,
  ShapeOverlay,
} from "../library/classes/Overlays.js";

describe("Instance", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("instantiates MapLibre inside the default container when constructed without configuration", () => {
    new Instance();

    const container = document.getElementById("waymark-instance");
    const mapContainer = document.getElementById("waymark-instance-map");
    const mapCanvas = document.querySelector(
      "#waymark-instance-map .maplibregl-canvas",
    );
    const attributionControl = document.querySelector(
      "#waymark-instance-map .maplibregl-ctrl-bottom-right",
    );

    expect(container).toBeTruthy();
    expect(mapContainer).toBeTruthy();
    expect(mapCanvas).toBeTruthy();
    expect(attributionControl).toBeFalsy();
  });

  it("mounts into an existing container when map_options.div_id is provided", () => {
    const customContainer = document.createElement("div");
    customContainer.id = "custom-container";
    document.body.appendChild(customContainer);

    new Instance({
      map_options: {
        div_id: "custom-container",
      },
    });

    const defaultContainer = document.getElementById("waymark-instance");
    const container = document.getElementById("custom-container");
    const mapContainer = document.getElementById("custom-container-map");
    const mapCanvas = document.querySelector(
      "#custom-container-map .maplibregl-canvas",
    );
    const attributionControl = document.querySelector(
      "#custom-container-map .maplibregl-ctrl-bottom-right",
    );

    expect(defaultContainer).toBeFalsy();
    expect(container).toBe(customContainer);
    expect(mapContainer).toBeTruthy();
    expect(mapCanvas).toBeTruthy();
    expect(attributionControl).toBeFalsy();
  });

  it("applies MapLibre options to enable attribution control", () => {
    const instance = new Instance({
      map_options: {
        maplibre_options: {
          attributionControl: true,
        },
      },
    });

    const mapContainer = document.getElementById("waymark-instance-map");
    const attributionControl = document.querySelector(
      "#waymark-instance-map .maplibregl-ctrl-bottom-right",
    );

    expect(mapContainer).toBeTruthy();
    expect(attributionControl).toBeTruthy();
    expect(instance.store.map.value.options.attributionControl).toBe(true);
  });

  it("respects MapLibre option overrides when attribution control is disabled", () => {
    const instance = new Instance({
      map_options: {
        maplibre_options: {
          attributionControl: false,
        },
      },
    });

    const mapContainer = document.getElementById("waymark-instance-map");
    const attributionControl = document.querySelector(
      "#waymark-instance-map .maplibregl-ctrl-bottom-right",
    );

    expect(mapContainer).toBeTruthy();
    expect(attributionControl).toBeFalsy();
    expect(instance.store.map.value.options.attributionControl).toBe(false);
  });

  it("passes additional MapLibre options through to the map instance", () => {
    const customStyle = "https://tiles.example.com/style.json";

    const instance = new Instance({
      map_options: {
        maplibre_options: {
          attributionControl: true,
          style: customStyle,
          maxZoom: 20,
        },
      },
    });

    const map = instance.store.map.value;

    expect(map.options.style).toBe(customStyle);
    expect(map.options.maxZoom).toBe(20);
    expect(
      document.querySelector(
        "#waymark-instance-map .maplibregl-ctrl-bottom-right",
      ),
    ).toBeTruthy();
  });

  it("registers configured tile layers on the map and activates the first entry", () => {
    const tileLayerConfig = [
      {
        layer_name: "Layer One",
        layer_url: "https://tiles.example.com/one/{z}/{x}/{y}.png",
        layer_attribution: "Layer One Attribution",
        layer_max_zoom: "17",
      },
      {
        layer_name: "Layer Two",
        layer_url: "https://tiles.example.com/two/{z}/{x}/{y}.png",
        layer_attribution: "Layer Two Attribution",
        layer_max_zoom: "16",
      },
    ];

    const instance = new Instance({
      map_options: {
        tile_layers: tileLayerConfig,
      },
    });

    const map = instance.store.map.value;
    const [tileLayerOne, tileLayerTwo] =
      instance.store.config.value.getTileLayers();

    expect(tileLayerOne).toBeInstanceOf(TileLayer);
    expect(tileLayerTwo).toBeInstanceOf(TileLayer);

    const firstLayer = map.layers.find((layer) => layer.id === tileLayerOne.id);
    const secondLayer = map.layers.find(
      (layer) => layer.id === tileLayerTwo.id,
    );

    expect(map.sources).toHaveProperty(tileLayerOne.id);
    expect(map.sources[tileLayerOne.id]).toEqual(
      expect.objectContaining({
        type: "raster",
        tiles: [tileLayerOne.data.layer_url],
      }),
    );

    expect(map.sources).toHaveProperty(tileLayerTwo.id);
    expect(map.sources[tileLayerTwo.id]).toEqual(
      expect.objectContaining({
        type: "raster",
        tiles: [tileLayerTwo.data.layer_url],
      }),
    );
    expect(firstLayer).toBeTruthy();
    expect(secondLayer).toBeTruthy();
  });

  it("merges tile layer defaults when optional fields are omitted", () => {
    const instance = new Instance({
      map_options: {
        tile_layers: [
          {
            layer_name: "Layer Defaults",
          },
        ],
      },
    });

    const [tileLayer] = instance.store.config.value.getTileLayers();

    expect(tileLayer).toBeInstanceOf(TileLayer);
    expect(tileLayer.data.layer_url).toBe(
      "http://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    expect(tileLayer.data.layer_attribution).toContain("OpenStreetMap");
    expect(tileLayer.data.layer_max_zoom).toBe("18");
    expect(tileLayer.toSource()).toEqual(
      expect.objectContaining({
        maxzoom: 18,
        tiles: ["http://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      }),
    );
  });

  it("renders marker overlays using configured marker types", () => {
    const instance = new Instance({
      map_options: {
        marker_types: [
          {
            marker_title: "Cafe",
            marker_colour: "#123456",
            icon_colour: "#abcdef",
            marker_shape: "marker",
            marker_size: "medium",
            icon_type: "icon",
            marker_icon: "ion-coffee",
          },
        ],
      },
    });

    instance.loadGeoJSON({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [13.41, 52.52],
          },
          properties: {
            type: "cafe",
            title: "Test Cafe",
          },
        },
      ],
    });

    const overlays = instance.store.overlays.value;
    const map = instance.store.map.value;

    expect(overlays).toHaveLength(1);
    expect(overlays[0]).toBeInstanceOf(MarkerOverlay);
    expect(map.markers).toHaveLength(1);

    const markerElement = map.markers[0].getElement();
    expect(markerElement.className).toContain("waymark-marker-cafe");

    const background = markerElement.querySelector(
      ".waymark-marker-background",
    );
    expect(background).toBeTruthy();
    expect(background.getAttribute("style")).toContain("#123456");
  });

  it("renders line overlays using configured line types", () => {
    const instance = new Instance({
      map_options: {
        line_types: [
          {
            line_title: "Trail",
            line_colour: "#ff9900",
            line_weight: "5",
          },
        ],
      },
    });

    instance.loadGeoJSON({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [-0.1357, 51.509],
              [-0.1, 51.52],
            ],
          },
          properties: {
            type: "trail",
            title: "City Trail",
          },
        },
      ],
    });

    const overlays = instance.store.overlays.value;
    const map = instance.store.map.value;

    expect(overlays).toHaveLength(1);
    expect(overlays[0]).toBeInstanceOf(LineOverlay);

    const lineLayer = map.layers.find((layer) => layer.id === "overlay-0");
    expect(lineLayer).toBeTruthy();
    expect(lineLayer.type).toBe("line");
    expect(lineLayer.paint["line-color"]).toBe("#ff9900");
    expect(lineLayer.paint["line-width"]).toBe(5);
  });

  it("renders shape overlays using configured shape types", () => {
    const instance = new Instance({
      map_options: {
        shape_types: [
          {
            shape_title: "Park",
            shape_colour: "#228B22",
            fill_opacity: "0.3",
          },
        ],
      },
    });

    instance.loadGeoJSON({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-0.15, 51.5],
                [-0.14, 51.5],
                [-0.14, 51.51],
                [-0.15, 51.51],
                [-0.15, 51.5],
              ],
            ],
          },
          properties: {
            type: "park",
            title: "Central Park",
          },
        },
      ],
    });

    const overlays = instance.store.overlays.value;
    const map = instance.store.map.value;

    expect(overlays).toHaveLength(1);
    expect(overlays[0]).toBeInstanceOf(ShapeOverlay);

    const shapeLayer = map.layers.find((layer) => layer.id === "overlay-0");
    expect(shapeLayer).toBeTruthy();
    expect(shapeLayer.type).toBe("fill");
    expect(shapeLayer.paint["fill-color"]).toBe("#228B22");
    expect(shapeLayer.paint["fill-opacity"]).toBe(0.3);
    expect(shapeLayer.paint["fill-outline-color"]).toBe("#228B22");

    const strokeLayer = map.layers.find(
      (layer) => layer.id === "overlay-0-stroke",
    );
    expect(strokeLayer).toBeTruthy();
    expect(strokeLayer.type).toBe("line");
    expect(strokeLayer.paint["line-color"]).toBe("#228B22");
    expect(strokeLayer.paint["line-width"]).toBe(1);

    // Test highlight
    overlays[0].addHighlight();
    const highlightLayer = map.layers.find(
      (layer) => layer.id === "overlay-0-highlight",
    );
    expect(highlightLayer).toBeTruthy();
    // Should be after the stroke layer (which is after the fill layer)
    const strokeIndex = map.layers.findIndex(
      (l) => l.id === "overlay-0-stroke",
    );
    const highlightIndex = map.layers.findIndex(
      (l) => l.id === "overlay-0-highlight",
    );
    expect(highlightIndex).toBeGreaterThan(strokeIndex);
  });
});
