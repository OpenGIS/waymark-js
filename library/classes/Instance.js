import { ulid } from "ulid";
import { createApp } from "vue";
import { createStateStore } from "@/stores/state.js";
import { createGeoJSONStore } from "@/stores/geojson.js";
import { createMapLibreStore } from "@/stores/maplibre.js";
import InstanceComponent from "@/components/Instance.vue";
import { WaymarkEvent, waymarkEventName } from "@/classes/Event.js";

import {
  flyToOptions,
  rotateOptions,
  easeToOptions,
} from "@/helpers/MapLibre.js";

export default class WaymarkInstance {
  constructor(config = {}) {
    const defaultConfig = {
      id: null,
      geoJSON: {
        type: "FeatureCollection",
        features: [],
      },
      onLoad: null,
      debug: false,
    };

    // Merge config with defaults
    this.config = { ...defaultConfig, ...config };
    this.id = this.config.id;

    // Get the container div
    this.container = document.getElementById(this.id);
    if (!this.container) {
      // console.error("[Waymark] Could not find container with in DOM");
      throw new Error(`Could not find element with id="${this.id}"`);
    }
    this.addEventHandling();

    // Add dimensions
    // container.style.height = "100%";
    // container.style.width = "100%";

    // Create State Store
    this.stateStore = createStateStore(this);

    // Create GeoJSON Store
    this.geoJSONStore = createGeoJSONStore(this);

    // Create MapLibre Store
    this.mapLibreStore = createMapLibreStore(this);

    // Create Vue App for this instance
    const app = createApp(InstanceComponent);

    // Provide stores to app
    app.provide("mapLibreStore", this.mapLibreStore);

    // Setup

    // Mount to DOM
    app.mount("#" + this.id);
  }

  // Event Handling
  dispatchEvent(eventName, params = {}) {
    // Create event
    const event = new WaymarkEvent(eventName, params, this);

    // Fire
    if (this.container) {
      this.container.dispatchEvent(event);
    }
  }

  onEvent(eventName, callback) {
    if (this.container) {
      this.container.addEventListener(waymarkEventName, (event) => {
        if (event.detail && event.detail.eventName === eventName) {
          callback(event);
        }
      });
    }
  }

  addEventHandling() {
    // Debug: Output all Waymark events
    if (this.config.debug) {
      this.container.addEventListener(waymarkEventName, (event) => {
        console.log(`[Waymark][${this.id}][Event]`, event.detail);
      });
    }

    // Listen for maplibre-map-ready event
    this.onEvent("maplibre-map-ready", () => {
      // When GeoJSON data changes
      this.onEvent("geojson-state-change", () => {
        // Draw
        this.drawGeoJSON();
      });

      // Initial
      if (this.config.geoJSON) {
        this.addGeoJSON(this.config.geoJSON);
      }

      // Call onLoad callback
      if (this.config.onLoad && typeof this.config.onLoad === "function") {
        this.config.onLoad(this);
      }
    });
  }

  drawGeoJSON() {
    const { maps } = this.geoJSONStore;
    const { map: mapLibreMap } = this.mapLibreStore;

    maps.value.forEach((waymarkMap) => {
      waymarkMap.addTo(mapLibreMap.value);
    });
  }

  addGeoJSON(geoJSON) {
    this.geoJSONStore.addJSON(geoJSON);
  }

  rotateMap(direction = "cw", degrees = 90) {
    const { map } = this.mapLibreStore;

    // Ensure not currently roating
    if (map.value.isRotating()) {
      return;
    }

    const currentBearing = map.value.getBearing();
    const newBearing =
      direction === "cw" ? currentBearing + degrees : currentBearing - degrees;

    map.value.rotateTo(newBearing, rotateOptions);
  }

  pitchMap(direction = "down", degrees = 15) {
    const { map } = this.mapLibreStore;

    const currentPitch = map.value.getPitch();
    let newPitch =
      direction === "down" ? currentPitch + degrees : currentPitch - degrees;

    // Constrain pitch to 0-60
    newPitch = Math.max(0, Math.min(60, newPitch));

    map.value.easeTo(
      {
        pitch: newPitch,
        ...easeToOptions,
      },
      { easing: (t) => t * (2 - t) },
    );
  }

  pointNorth() {
    const { map } = this.mapLibreStore;

    if (!map.value) return;
    map.value.easeTo({
      bearing: 0,
      ...easeToOptions,
    });
  }

  set3D(is3D = true) {
    const { map } = this.mapLibreStore;

    if (is3D) {
      // Set to 3D
      map.value.easeTo(
        {
          pitch: 60,
          ...easeToOptions,
        },
        { easing: (t) => t * (2 - t) },
      );
    } else {
      // Reset to 2D
      map.value.easeTo(
        {
          pitch: 0,
          ...easeToOptions,
        },
        { easing: (t) => t * (2 - t) },
      );
    }
  }

  toggle3D() {
    const { map, view } = this.mapLibreStore;

    if (view.value.pitch > 0) {
      // Reset to 2D
      map.value.easeTo(
        {
          pitch: 0,
          ...easeToOptions,
        },
        { easing: (t) => t * (2 - t) },
      );
    } else {
      // Set to 3D
      map.value.easeTo(
        {
          pitch: 60,
          ...easeToOptions,
        },
        { easing: (t) => t * (2 - t) },
      );
    }
  }

  resetView() {
    const { overlaysBounds } = this.geoJSONStore;
    const { map } = this.mapLibreStore;
    this.pointNorth();
    this.set3D(false);
    map.value.fitBounds(overlaysBounds.value, flyToOptions);
  }
}
