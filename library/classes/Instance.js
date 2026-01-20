import { createApp } from "vue";
import { createPinia } from "pinia";
import { useStateStore } from "@/stores/state.js";
import { useGeoJSONStore } from "@/stores/geojson.js";
import { useMapLibreStore } from "@/stores/maplibre.js";
import InstanceComponent from "@/components/Instance.vue";

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
    this.stateStore = useStateStore();
    this.stateStore.setContainer(container);

    this.geoJSONStore = useGeoJSONStore();
    this.geoJSONStore.fromJSON(this.config.geoJSON);

    this.mapLibreStore = useMapLibreStore();

    // Mount to DOM
    app.mount("#" + this.config.divID);
  }
}
