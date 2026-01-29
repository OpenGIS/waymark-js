import { ref, shallowRef, watch } from "vue";
import { throttle } from "lodash-es";
import { mapOptions } from "@/helpers/MapLibre.js";
import { Map } from "maplibre-gl";

export function createMapLibreStore(WaymarkInstance) {
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
			...(WaymarkInstance.config.mapOptions || {}),
		});

		addListeners();
	}

	// Add Event Listeners
	function addListeners() {
		const { overlays, maps } = WaymarkInstance.geoJSONStore;

		// When MapLibre has loaded
		map.value.on("load", () => {
			mapReady.value = true;

			// Set Initial View
			view.value.bounds = map.value.getBounds();
			view.value.bearing = map.value.getBearing();
			view.value.pitch = map.value.getPitch();
			view.value.zoom = map.value.getZoom();
			view.value.center = map.value.getCenter();

			WaymarkInstance.dispatchEvent("maplibre-map-ready");
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

			// Query all rendered features
			const features = map.value.queryRenderedFeatures(bbox);

			let match = null;

			// Find first feature that exists in our stores
			for (const feature of features) {
				const id = feature.layer.id;

				// 1. Check standalone overlays (Fast O(1))
				if (overlays.value.has(id)) {
					match = overlays.value.get(id);
					break;
				}

				// 2. Check nested maps
				for (const mapInstance of maps.value.values()) {
					if (mapInstance.hasOverlay(id)) {
						match = mapInstance.getOverlay(id);
						break;
					}
				}

				if (match) break;
			}

			if (match) {
				WaymarkInstance.setActiveOverlay(match);
			} else {
				// Remove active overlay
				WaymarkInstance.setActiveOverlay();
			}
		});
	}

	watch(
		() => view.value,
		throttle((viewValue) => {
			if (!mapReady.value) return;

			WaymarkInstance.dispatchEvent("maplibre-view-change", {
				view: viewValue,
			});
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
