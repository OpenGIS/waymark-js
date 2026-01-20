import { shallowRef, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { defineStore } from "pinia";
import { LngLatBounds } from "maplibre-gl";
import { getFeatureType } from "@/helpers/Overlay.js";
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";

export const useGeoJSONStore = defineStore("geojson", () => {
	// State
	const overlays = shallowRef([]);

	// Computed
	const overlaysByType = computed(() => {
		return {
			markers: overlays.value.filter(
				(overlay) => overlay.featureType === "marker",
			),
			lines: overlays.value.filter((overlay) => overlay.featureType === "line"),
			shapes: overlays.value.filter(
				(overlay) => overlay.featureType === "shape",
			),
		};
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

	const state = computed(() => toJSON());

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
		const geoJSON = {
			type: "FeatureCollection",
			features: [],
		};

		// overlays.value.forEach((overlay) => {
		// 	geoJSON.features.push(overlay.feature);
		// });

		["markers", "lines", "shapes"].forEach((type) => {
			overlaysByType.value[type].forEach((overlay) => {
				geoJSON.features.push(overlay.feature);
			});
		});

		return geoJSON;
	};

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

		// Each feature
		json.features.forEach((feature) => {
			const featureType = getFeatureType(feature);

			// Create overlay ID
			const overlayId = `${featureType}-${overlays.value.length}`;

			// Create overlay based on feature type
			let overlay = null;
			switch (featureType) {
				case "marker":
					overlay = new MarkerOverlay(feature, overlayId);
					break;
				case "line":
					overlay = new LineOverlay(feature, overlayId);
					break;
				case "shape":
					overlay = new ShapeOverlay(feature, overlayId);
					break;
				default:
					console.warn(
						"Feature Type not recognised or supported - skipping",
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
