import { createApp } from "vue";
import { createPinia, storeToRefs } from "pinia";
import { useStateStore } from "@/stores/state.js";
import { useGeoJSONStore } from "@/stores/geojson.js";
import InstanceComponent from "@/components/Instance.vue";
import { featureTypes, getFeatureType } from "@/helpers/Overlay.js";
import { dispatchEvent } from "@/classes/Event.js";
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";
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

  loadGeoJSON() {
    const { features } = storeToRefs(this.geoJSONStore);
    const { map, overlays, overlaysBounds } = storeToRefs(this.stateStore);

    console.log("Loading GeoJSON Features to Map", features);

    if (features.value.length > 0) {
      // Group features by type
      const groupedFeatures = {
        shape: [],
        line: [],
        marker: [],
      };

      useGeoJSONStore()
        .toJSON()
        .features.forEach((feature) => {
          const featureType = getFeatureType(feature);

          if (!featureType || !featureTypes.includes(featureType)) {
            console.warn(
              "Feature Type not recognised or supported - skipping",
              feature,
            );
            return;
          }

          groupedFeatures[featureType].push(feature);
        });

      // Add features to the map in the desired order
      ["shape", "line", "marker"].forEach((type) => {
        groupedFeatures[type].forEach((feature) => {
          const overlayId = `overlay-${overlays.value.length}`;
          const overlay = (() => {
            switch (type) {
              case "marker":
                return new MarkerOverlay(feature, overlayId);
              case "line":
                return new LineOverlay(feature, overlayId);
              case "shape":
                return new ShapeOverlay(feature, overlayId);
            }
          })();

          // Add to store (reassign to trigger shallowRef updates)
          overlays.value = [...overlays.value, overlay];

          // Add to Map
          overlay.addTo(map.value);
        });
      });

      // Fit to bounds
      map.value.fitBounds(overlaysBounds.value, fitBoundsOptions);

      return overlays.value;
    }

    return [];
  }

  // Add Event Listeners
  addListeners() {
    console.log("Adding Map Listeners");

    const { map, mapReady, overlays, view } = storeToRefs(this.stateStore);

    // When MapLibre has loaded
    map.value.on("load", () => {
      mapReady.value = true;

      console.log("Map Loaded");

      // Load GeoJSON if provided
      if (this.geoJSONStore.toJSON()) {
        this.loadGeoJSON();
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
