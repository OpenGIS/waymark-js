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

	// Actions

	const addGeoJSON = (geoJSON) => {
		if (!geoJSON || !geoJSON.type) {
			throw new Error("Valid GeoJSON required");
		}

		if (geoJSON.id && items.has(geoJSON.id)) {
			throw new Error("GeoJSON with this ID already exists");
		}

		let item;
		switch (geoJSON.type) {
			case "FeatureCollection":
				// Map
				item = createMap(geoJSON);
				maps.set(item.id, item);

				break;
			case "Feature":
				// Overlay
				item = createOverlay(geoJSON);
				overlays.set(item.id, item);

				break;
			default:
				throw new Error("Valid GeoJSON Feature or FeatureCollection required");
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

	const overlaysBounds = () => {
		const bounds = new LngLatBounds();

		if (overlays.size === 0) {
			return null;
		}

		overlays.forEach((overlay) => {
			bounds.extend(overlay.getBounds());
		});

		return bounds;
	};

	const features = () => {
		if (
			state.value &&
			state.type === "FeatureCollection" &&
			Array.isArray(state.features)
		) {
			return state.features;
		}

		return [];
	};

	const hasFeatures = () => {
		return features.length > 0;
	};

	return {
		// State
		features,
		hasFeatures,
		maps,
		mapsArray,
		overlays,
		overlaysArray,
		overlaysByType,
		overlaysBounds,

		// Actions
		addGeoJSON,
		// addItem,
		updateItem,
		removeItem,
	};
}
