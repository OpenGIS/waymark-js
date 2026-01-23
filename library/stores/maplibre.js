import { ref, shallowRef, watch } from "vue";
import { throttle } from "lodash-es";
import { mapOptions } from "@/helpers/MapLibre.js";
import { Map } from "maplibre-gl";

export function createMapLibreStore(stateStore, geoJSONStore) {
	const { dispatchEvent } = stateStore;

	// State
	const map = shallowRef(null);
	const mapReady = shallowRef(false);
	const view = ref({
		bearing: null,
		pitch: null,
		bounds: null,
		zoom: null,
		center: null,
	});

	// Actions
	function createMap(divID = "") {
		map.value = new Map({
			container: divID,
			...mapOptions,
		});

		addListeners();
	}

	// Add Event Listeners
	function addListeners() {
		const { overlays } = geoJSONStore;

		// When MapLibre has loaded
		map.value.on("load", () => {
			mapReady.value = true;

			// Set Initial View
			view.value.bounds = map.value.getBounds();
			view.value.bearing = map.value.getBearing();
			view.value.pitch = map.value.getPitch();
			view.value.zoom = map.value.getZoom();
			view.value.center = map.value.getCenter();

			dispatchEvent("maplibre-map-ready");
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
				layers: overlays.value.map((o) => o.id),
			});

			// Features found
			if (features.length) {
				// Get the closest overlay
				const overlay = overlays.value.find(
					(o) => o.id === features[0].layer.id,
				);

				if (overlay && stateStore) {
					stateStore.setActiveOverlay(overlay);
				}
				// No features found
			} else {
				// Remove active overlay
				if (stateStore) {
					stateStore.setActiveOverlay();
				}
			}
		});
	}

	watch(
		() => view.value,
		throttle((newVal) => {
			if (!mapReady.value) return;

			dispatchEvent("maplibre-view-change");
		}, 1000),
		{ deep: true },
	);

	return {
		// State
		mapReady,
		map,
		view,

		// Actions
		createMap,
	};
}
