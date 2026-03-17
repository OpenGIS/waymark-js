import { LngLatBounds } from "maplibre-gl";
import { createOverlay, createMap } from "@/helpers/Factory.js";
import WaymarkMap from "@/classes/Map.js";
import WaymarkOverlay from "@/classes/Overlays/Overlay.js";

export function createGeoJSONStore(WaymarkInstance) {
	// State
	const items = new Map();
	const maps = new Map();
	const overlays = new Map();

	const mapsArray = () => {
		return Array.from(maps.values());
	};

	const overlaysArray = () => {
		return Array.from(overlays.values());
	};

	const getBounds = () => {
		const bounds = new LngLatBounds();

		items.forEach((item) => {
			// Use Waymark .bbox property
			if (item.bbox) {
				bounds.extend([item.bbox[0], item.bbox[1]]);
				bounds.extend([item.bbox[2], item.bbox[3]]);
			}
		});

		return bounds;
	};

	// Actions

	const getItem = (itemID) => {
		return items.get(itemID) || null;
	};

	const addItem = (geoJSON = {}) => {
		if (!geoJSON || !geoJSON.type) {
			throw new Error("Valid GeoJSON required");
		}

		if (geoJSON.id && items.has(geoJSON.id)) {
			throw new Error("GeoJSON with this ID already exists");
		}

		let item = null;

		// Map
		if (geoJSON instanceof WaymarkMap) {
			item = geoJSON;
			maps.set(item.id, item);

			// Add overlays
			item.overlays.forEach((overlay) => {
				items.set(overlay.id, overlay);
			});

			// Overlay
		} else if (geoJSON instanceof WaymarkOverlay) {
			item = geoJSON;
			overlays.set(item.id, item);
			// Raw GeoJSON
		} else {
			switch (geoJSON.type) {
				case "FeatureCollection":
					// Map
					item = createMap(geoJSON);
					maps.set(item.id, item);

					// Add overlays
					item.overlays.forEach((overlay) => {
						items.set(overlay.id, overlay);
					});

					break;
				case "Feature":
					// Overlay
					item = createOverlay(geoJSON);
					overlays.set(item.id, item);

					break;
				default:
					throw new Error(
						"Valid GeoJSON Feature or FeatureCollection required",
					);
			}
		}

		items.set(item.id, item);

		WaymarkInstance.dispatchEvent("geojson-item-added", {
			item,
		});

		return item;
	};

	const removeItem = (item = {}) => {
		if (!item.id) {
			throw new Error("Item must have an ID");
		}

		if (!items.has(item.id)) {
			throw new Error("Item with this ID does not exist");
		}

		items.delete(item.id);

		switch (true) {
			case item instanceof WaymarkMap:
				maps.delete(item.id);

				break;
			case item instanceof WaymarkOverlay:
				overlays.delete(item.id);

				break;
			default:
				throw new Error("WaymarkMap or WaymarkOverlay instance required");
		}

		WaymarkInstance.dispatchEvent("geojson-item-removed", {
			item,
		});

		return item;
	};

	const hasItem = (itemID) => {
		return items.has(itemID);
	};

	const updateItem = (item = {}) => {
		if (!item.id) {
			throw new Error("Item must have an ID");
		}

		if (!items.has(item.id)) {
			throw new Error("Item with this ID does not exist");
		}

		items.set(item.id, item);

		WaymarkInstance.dispatchEvent("geojson-item-updated", {
			item,
		});

		return item;
	};

	// Getters

	const overlaysByType = () => {
		const overlaysArray = Array.from(overlays.values());
		return {
			markers: overlaysArray.filter(
				(overlay) => overlay.featureType === "marker",
			),
			lines: overlaysArray.filter((overlay) => overlay.featureType === "line"),
			shapes: overlaysArray.filter(
				(overlay) => overlay.featureType === "shape",
			),
		};
	};

	return {
		// State
		maps,
		mapsArray,
		overlays,
		overlaysArray,
		overlaysByType,
		getBounds,
		hasItem,

		// Actions

		getItem,
		addItem,
		updateItem,
		removeItem,
	};
}
