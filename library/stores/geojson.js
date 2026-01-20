import { shallowRef } from "vue";
import { defineStore } from "pinia";

export const useGeoJSONStore = defineStore("geojson", () => {
	// State
	const geoJSON = shallowRef(null);

	// Actions
	function setGeoJSON(data) {
		geoJSON.value = data;
	}

	return {
		// State
		geoJSON,

		// Actions
		setGeoJSON,
	};
});
