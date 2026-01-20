import { shallowRef, onMounted, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { defineStore } from "pinia";

export const useGeoJSONStore = defineStore("geojson", () => {
	// State
	const geoJSON = shallowRef(null);

	// Persistence

	const state = computed(() => geoJSON.value);

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

		// Persistence
		toJSON,
		fromJSON,
	};
});
