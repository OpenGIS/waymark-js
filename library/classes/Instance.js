import { createApp } from "vue";
import { createPinia, storeToRefs } from "pinia";
import { useStateStore } from "@/stores/state.js";
import { useGeoJSONStore } from "@/stores/geojson.js";
import InstanceComponent from "@/components/Instance.vue";
import { dispatchEvent } from "@/classes/Event.js";

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
    this.stateStore = useStateStore();
    this.stateStore.setContainer(container);

    this.geoJSONStore = useGeoJSONStore();
    this.geoJSONStore.fromJSON(this.config.geoJSON);

    // Mount to DOM
    app.mount("#" + this.config.divID);

    // Add listeners on mount
    this.addListeners();
  }

  addOverlays() {
    const { overlays, overlaysBounds } = storeToRefs(this.geoJSONStore);
    const { map } = storeToRefs(this.stateStore);

    console.log("Loading Overlays from store", overlays);

    //Add overlays to map
    overlays.value.forEach((overlay) => {
      overlay.addTo(map.value);
    });

    // Set map view to fit overlays
    if (overlaysBounds.value) {
      map.value.fitBounds(overlaysBounds.value, fitBoundsOptions);
    }

    return [];
  }

  // Add Event Listeners
  addListeners() {
    console.log("Adding Map Listeners");

    const { map, mapReady, view } = storeToRefs(this.stateStore);
    const { overlays } = storeToRefs(this.geoJSONStore);

    // When MapLibre has loaded
    map.value.on("load", () => {
      mapReady.value = true;

      console.log("Map Loaded");

      // Load GeoJSON if provided
      if (this.geoJSONStore.toJSON()) {
        this.addOverlays();
      }

      // Set Initial View
      view.value.bounds = map.value.getBounds();
      view.value.bearing = map.value.getBearing();
      view.value.pitch = map.value.getPitch();
      view.value.zoom = map.value.getZoom();
      view.value.center = map.value.getCenter();

      dispatchEvent("instance-ready");
    });

    // Track Bearing
    map.value.on("rotateend", () => {
      view.value.bearing = map.value.getBearing();
    });

    // Track Pitch
    map.value.on("pitchend", () => {
      view.value.pitch = map.value.getPitch();
    });

    //Track map bounds
    map.value.on("moveend", () => {
      //Set Max bounds
      view.value.bounds = map.value.getBounds();
      view.value.center = map.value.getCenter();
      view.value.zoom = map.value.getZoom();
    });

    // Lines & Shape click handling
    map.value.on("click", (e) => {
      // Create a bounding box to find features within a certain distance of the click
      const bbox = [
        [e.point.x - 10, e.point.y - 10],
        [e.point.x + 10, e.point.y + 10],
      ];

      // Get features around click
      const features = map.value.queryRenderedFeatures(bbox, {
        layers: overlays.value
          // .filter((o) => o.featureType !== "marker")
          .map((o) => o.id),
      });

      // Features found
      if (features.length) {
        // Get the closest overlay
        const overlay = overlays.value.find(
          (o) => o.id === features[0].layer.id,
        );

        if (overlay) {
          console.log("Feature clicked:", overlay);

          this.stateStore.setActiveOverlay(overlay);
        }
        // No features found
      } else {
        // Remove active overlay
        this.stateStore.setActiveOverlay();
      }
    });
  }
}
