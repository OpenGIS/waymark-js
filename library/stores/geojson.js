import { shallowRef } from "vue";
import { defineStore } from "pinia";

export const useGeoJSONStore = defineStore("geojson", () => {
	const geoJSON = shallowRef(null);

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
