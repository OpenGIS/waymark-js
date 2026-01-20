import { createApp } from "vue";
import { createPinia, storeToRefs } from "pinia";
import { useStateStore } from "@/stores/state.js";
import { useGeoJSONStore } from "@/stores/geojson.js";
import { useMapLibreStore } from "@/stores/maplibre.js";
import InstanceComponent from "@/components/Instance.vue";
import { onEvent } from "@/classes/Event.js";
import { fitBoundsOptions } from "@/helpers/MapLibre.js";

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
      // Add overlays
      this.addOverlays();
    });

    // Mount to DOM
    app.mount("#" + this.config.divID);
  }

  addOverlays() {
    const { overlaysByType, overlaysBounds } = storeToRefs(useGeoJSONStore());
    const { map } = storeToRefs(useMapLibreStore());

    //Add overlays to map
    ["shapes", "lines", "markers"].forEach((type) => {
      overlaysByType.value[type].forEach((overlay) => {
        overlay.addTo(map.value);
      });
    });

    // Set map view to fit overlays
    if (overlaysBounds.value) {
      map.value.fitBounds(overlaysBounds.value, fitBoundsOptions);
    }

    return [];
  }
}
