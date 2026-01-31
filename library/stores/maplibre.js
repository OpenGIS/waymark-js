export function createMapLibreStore(WaymarkInstance) {
	// State
	const store = {
		mapLibreMap: WaymarkInstance.mapLibreMap,
		view: {
			bearing: null,
			pitch: null,
			bounds: null,
			zoom: null,
			center: null,
		},
	};

	// Add Event Listeners
	function addListeners() {
		const { overlays, maps } = WaymarkInstance.geoJSONStore;

		// When MapLibre has loaded
		store.mapLibreMap.on("load", () => {
			// Set Initial View
			store.view.bounds = store.mapLibreMap.getBounds();
			store.view.bearing = store.mapLibreMap.getBearing();
			store.view.pitch = store.mapLibreMap.getPitch();
			store.view.zoom = store.mapLibreMap.getZoom();
			store.view.center = store.mapLibreMap.getCenter();

			WaymarkInstance.dispatchEvent("maplibre-map-ready");
		});

		// Track Bearing
		store.mapLibreMap.on("rotateend", () => {
			store.view.bearing = store.mapLibreMap.getBearing();

			WaymarkInstance.dispatchEvent("maplibre-map-view-change");
		});

		// Track Pitch
		store.mapLibreMap.on("pitchend", () => {
			store.view.pitch = store.mapLibreMap.getPitch();

			WaymarkInstance.dispatchEvent("maplibre-map-view-change");
		});

		//Track map bounds
		store.mapLibreMap.on("moveend", () => {
			//Set Max bounds
			store.view.bounds = store.mapLibreMap.getBounds();
			store.view.center = store.mapLibreMap.getCenter();
			store.view.zoom = store.mapLibreMap.getZoom();

			WaymarkInstance.dispatchEvent("maplibre-map-view-change");
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

	addListeners();

	return store;
}
