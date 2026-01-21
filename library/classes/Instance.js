import { createApp } from "vue";
import { createPinia, storeToRefs } from "pinia";
import { useStateStore } from "@/stores/state.js";
import { useGeoJSONStore } from "@/stores/geojson.js";
import { useMapLibreStore } from "@/stores/maplibre.js";
import InstanceComponent from "@/components/Instance.vue";
import { onEvent, dispatchEvent } from "@/classes/Event.js";
import {
  fitBoundsOptions,
  flyToOptions,
  rotateOptions,
  easeToOptions,
} from "@/helpers/MapLibre.js";

export class Instance {
  constructor(config = {}) {
    const defaultConfig = {
      divID: "waymark-instance",
      geoJSON: {
        type: "FeatureCollection",
        features: [],
      },
      state: {},
    };

    // Merge config with defaults
    this.config = { ...defaultConfig, ...config };

    // Get the container div
    const container = document.getElementById(this.config.divID);
    if (!container) {
      console.error("[Waymark] Could not find container in DOM");
    }

    // Add dimensions
    container.style.height = "100%";
    container.style.width = "100%";

    // Create Pinia
    const pinia = createPinia();

    // Create Vue App for this instance
    const app = createApp(InstanceComponent);
    app.use(pinia);

    // Init Stores
    useStateStore().setContainer(container);
    useGeoJSONStore().fromJSON(this.config.geoJSON);

    // Listen for maplibre-map-ready event
    onEvent("maplibre-map-ready", () => {
      const { maps } = storeToRefs(useGeoJSONStore());
      const { map: mapLibreMap } = storeToRefs(useMapLibreStore());

      maps.value.forEach((waymarkMap) => {
        waymarkMap.addTo(mapLibreMap.value);
      });
    });

    // Mount to DOM
    app.mount("#" + this.config.divID);
  }

  rotateMap(direction = "cw", degrees = 90) {
    const { map } = storeToRefs(useMapLibreStore());

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
    const { map } = storeToRefs(useMapLibreStore());

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
    const { map } = storeToRefs(useMapLibreStore());

    if (!map.value) return;
    map.value.easeTo({
      bearing: 0,
      ...easeToOptions,
    });
  }

  set3D(is3D = true) {
    const { map } = storeToRefs(useMapLibreStore());

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
    const { map, view } = storeToRefs(useMapLibreStore());

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
    const { overlaysBounds } = storeToRefs(useGeoJSONStore());
    const { map } = storeToRefs(useMapLibreStore());
    this.pointNorth();
    this.set3D(false);
    map.value.fitBounds(overlaysBounds.value, flyToOptions);
  }
}
