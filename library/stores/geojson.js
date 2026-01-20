import { shallowRef, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { defineStore } from "pinia";
import { LngLatBounds } from "maplibre-gl";

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
		if (overlays.value.length === 0) {
			return null;
		}

		const bounds = new LngLatBounds();

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

	const fromJSON = (json) => {
		geoJSON.value = json;
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
