import { shallowRef, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { defineStore } from "pinia";
import { LngLatBounds } from "maplibre-gl";
import { featureTypes, getFeatureType } from "@/helpers/Overlay.js";
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";

export const useGeoJSONStore = defineStore("geojson", () => {
	// State
	const geoJSON = shallowRef(null);
	const overlays = shallowRef([]);

	// Computed
	const overlaysByType = computed(() => {
		const byType = {
			marker: {},
			line: {},
			shape: {},
		};

		overlays.value.forEach((overlay) => {
			const typeKey = overlay.typeKey || "undefined";

			if (!byType[overlay.featureType][typeKey]) {
				byType[overlay.featureType][typeKey] = [];
			}

			byType[overlay.featureType][typeKey].push(overlay);
		});

		return byType;
	});

	const overlaysBounds = computed(() => {
		const bounds = new LngLatBounds();

		if (overlays.value.length === 0) {
			return null;
		}

		overlays.value.forEach((overlay) => {
			bounds.extend(overlay.getBounds());
		});

		return bounds;
	});

	// Persistence

	const state = computed(() => geoJSON.value);

	const features = computed(() => {
		if (
			geoJSON.value &&
			geoJSON.value.type === "FeatureCollection" &&
			Array.isArray(geoJSON.value.features)
		) {
			return geoJSON.value.features;
		}

		return [];
	});

	const hasFeatures = computed(() => {
		return features.value.length > 0;
	});

	const toJSON = () => {
		return geoJSON.value;
	};

	/*
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
*/

	const fromJSON = (json) => {
		// If valid GeoJSON
		if (
			!json ||
			json.type !== "FeatureCollection" ||
			!Array.isArray(json.features)
		) {
			console.error("Invalid GeoJSON provided to store fromJSON");
			return;
		}

		geoJSON.value = json;

		// Each feature
		json.features.forEach((feature) => {
			// Create overlay ID
			const overlayId = `overlay-${overlays.value.length}`;

			// Create overlay based on feature type
			let overlay = null;
			switch (feature.geometry.type) {
				case "Point":
					overlay = new MarkerOverlay(feature, overlayId);
					break;
				case "LineString":
					overlay = new LineOverlay(feature, overlayId);
					break;
				case "Polygon":
				case "MultiPolygon":
					overlay = new ShapeOverlay(feature, overlayId);
					break;
				default:
					console.warn(
						"Feature geometry type not supported - skipping",
						feature,
					);
					return;
			}

			// Add to store (reassign to trigger shallowRef updates)
			overlays.value = [...overlays.value, overlay];
		});
	};

	// Storage write
	watch(
		() => state.value,
		throttle((newVal) => {
			console.log("GeoJSON store changed:", newVal);
		}, 1000),
		{ deep: true },
	);

	return {
		// State
		state,
		features,
		hasFeatures,
		overlays,
		overlaysByType,
		overlaysBounds,

		// Persistence
		toJSON,
		fromJSON,
	};
});
