import { shallowRef, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { defineStore } from "pinia";

export const useGeoJSONStore = defineStore("geojson", () => {
	// State
	const geoJSON = shallowRef(null);

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

		// Persistence
		toJSON,
		fromJSON,
	};
});
