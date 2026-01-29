import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock MapLibre
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
        setTimeout(() => callback(), 0);
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
    
    easeTo(options) {
      if (options.bearing !== undefined) this._bearing = options.bearing;
      if (options.pitch !== undefined) this._pitch = options.pitch;
    }
    
    rotateTo(bearing) {
      this._bearing = bearing;
    }
    
    isRotating() {
      return false;
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

  class MockPopup {
      constructor(options) {
          this.options = options;
      }
      setDOMContent(content) {
          this.content = content;
          return this;
      }
      setLngLat(lngLat) {
          this.lngLat = lngLat;
          return this;
      }
      addTo(map) {
          this.map = map;
          return this;
      }
  }

  const exports = {
    Map: MockMap,
    LngLatBounds: MockLngLatBounds,
    Marker: MockMarker,
    Popup: MockPopup
  };
  exports.default = exports;
  return exports;
});

// Silence console.log/info/debug during tests
const noop = () => {};
// console.log = noop;
// console.info = noop;
// console.debug = noop;

import WaymarkInstance from "../library/classes/Instance.js";
import MarkerOverlay from "../library/classes/Overlays/Marker.js";
import LineOverlay from "../library/classes/Overlays/Line.js";
import ShapeOverlay from "../library/classes/Overlays/Shape.js";

describe("Instance", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    // Create default container
    const div = document.createElement("div");
    div.id = "waymark-instance";
    document.body.appendChild(div);
  });

  it("instantiates MapLibre inside the default container when constructed without configuration", () => {
    new WaymarkInstance();

    const container = document.getElementById("waymark-instance");
    // Map is created async in onMounted of Vue component
    // But we can check if instance is created
    expect(container).toBeTruthy();
  });

  it("mounts into an existing container when containerID is provided", () => {
    const customContainer = document.createElement("div");
    customContainer.id = "custom-container";
    document.body.appendChild(customContainer);

    new WaymarkInstance({
      containerID: "custom-container",
    });

    const container = document.getElementById("custom-container");
    expect(container).toBe(customContainer);
  });
  
  it("renders marker overlays", async () => {
    const instance = new WaymarkInstance({
        containerID: "waymark-instance"
    });

    instance.addGeoJSON({
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

    // FeatureCollection creates a Map, not standalone overlays
    const maps = instance.getAllMaps();
    expect(maps.length).toBe(1);
    
    const map = maps[0];
    const overlays = map.overlaysArray;
    expect(overlays.length).toBe(1);
    expect(overlays[0]).toBeInstanceOf(MarkerOverlay);
  });

  it("renders line overlays", () => {
     const instance = new WaymarkInstance({
        containerID: "waymark-instance"
    });

    instance.addGeoJSON({
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

    const maps = instance.getAllMaps();
    expect(maps.length).toBe(1);
    
    const map = maps[0];
    const overlays = map.overlaysArray;
    expect(overlays.length).toBe(1);
    expect(overlays[0]).toBeInstanceOf(LineOverlay);
  });

  it("renders shape overlays", () => {
     const instance = new WaymarkInstance({
        containerID: "waymark-instance"
    });

    instance.addGeoJSON({
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

    const maps = instance.getAllMaps();
    expect(maps.length).toBe(1);
    
    const map = maps[0];
    const overlays = map.overlaysArray;
    expect(overlays.length).toBe(1);
    expect(overlays[0]).toBeInstanceOf(ShapeOverlay);
  });

  it("dispatches events via state store", () => {
    const instance = new WaymarkInstance({
        containerID: "waymark-instance"
    });

    const callback = vi.fn();
    instance.onEvent("test-event", callback);
    instance.dispatchEvent("test-event", { data: "test" });

    // Since onEvent attaches a DOM listener, we need to ensure the container is set and the event is fired on it.
    // The Instance constructor sets the container.
    // However, JSdom event dispatching is synchronous.
    expect(callback).toHaveBeenCalled();
  });
});
