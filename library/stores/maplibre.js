import { ref } from "vue";
import { mapOptions } from "@/helpers/MapLibre.js";
import { Map } from "maplibre-gl";

export function createMapLibreStore(WaymarkInstance) {
	// State
	const store = {
		mapLibreMap: null,
		view: ref({
			bearing: null,
			pitch: null,
			bounds: null,
			zoom: null,
			center: null,
		}),
	};

	// Actions
	function createMap(divID = "") {
		store.mapLibreMap = new Map({
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
		store.mapLibreMap.on("load", () => {
			// Set Initial View
			store.view.value.bounds = store.mapLibreMap.getBounds();
			store.view.value.bearing = store.mapLibreMap.getBearing();
			store.view.value.pitch = store.mapLibreMap.getPitch();
			store.view.value.zoom = store.mapLibreMap.getZoom();
			store.view.value.center = store.mapLibreMap.getCenter();

			WaymarkInstance.dispatchEvent("maplibre-map-ready");
		});

		// Track Bearing
		store.mapLibreMap.on("rotateend", () => {
			store.view.value.bearing = store.mapLibreMap.getBearing();
		});

		// Track Pitch
		store.mapLibreMap.on("pitchend", () => {
			store.view.value.pitch = store.mapLibreMap.getPitch();
		});

		//Track map bounds
		store.mapLibreMap.on("moveend", () => {
			//Set Max bounds
			store.view.value.bounds = store.mapLibreMap.getBounds();
			store.view.value.center = store.mapLibreMap.getCenter();
			store.view.value.zoom = store.mapLibreMap.getZoom();
		});

		// Lines & Shape click handling
		store.mapLibreMap.on("click", (e) => {
			// Create a bounding box to find features within a certain distance of the click
			const bbox = [
				[e.point.x - 10, e.point.y - 10],
				[e.point.x + 10, e.point.y + 10],
			];

			// Query all rendered features
			const features = store.mapLibreMap.queryRenderedFeatures(bbox);

			let match = null;

			// Find first feature that exists in our stores
			for (const feature of features) {
				const id = feature.layer.id;

				// 1. Check standalone overlays (Fast O(1))
				if (overlays.has(id)) {
					match = overlays.get(id);
					break;
				}

				// 2. Check nested maps
				for (const mapInstance of maps.values()) {
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

	store.createMap = createMap;

	return store;
}
