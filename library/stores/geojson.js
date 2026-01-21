import { shallowRef, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { defineStore } from "pinia";
import { LngLatBounds } from "maplibre-gl";
import { getFeatureType } from "@/helpers/Overlay.js";
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";
import { dispatchEvent } from "@/classes/Event.js";
import { WaymarkMap } from "@/classes/Map.js";

export const useGeoJSONStore = defineStore("geojson", () => {
	// State
	const maps = shallowRef([]);
	const overlays = shallowRef([]);

	// Actions
	const addMap = (map) => {
		maps.value.push(map);

		// Add overlays too
		overlays.value = [...overlays.value, ...map.overlays];

		dispatchEvent("geojson-map-added", { overlayCount: map.overlays.length });
	};

	// Getters
	const state = computed(() => toJSON());

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

	const features = computed(() => {
		if (
			state.value &&
			state.value.type === "FeatureCollection" &&
			Array.isArray(state.value.features)
		) {
			return state.value.features;
		}

		return [];
	});

	const hasFeatures = computed(() => {
		return features.value.length > 0;
	});

	// Persistence

	const toJSON = () => {
		const geoJSON = {
			type: "FeatureCollection",
			features: [],
		};

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

		addMap(new WaymarkMap(json));
	};

	watch(
		() => state.value,
		throttle((newVal) => {
			dispatchEvent("geojson-state-change");
		}, 1000),
		{ deep: true },
	);

	return {
		// State
		state,
		features,
		hasFeatures,
		maps,
		overlays,
		overlaysByType,
		overlaysBounds,

		// Persistence
		toJSON,
		fromJSON,
	};
});
