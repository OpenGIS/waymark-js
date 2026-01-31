import { LngLatBounds } from "maplibre-gl";
import { createOverlay, createMap } from "@/helpers/Factory.js";
import WaymarkMap from "@/classes/Map.js";
import WaymarkOverlay from "@/classes/Overlays/Overlay.js";

export function createGeoJSONStore(WaymarkInstance) {
	// State
	const maps = new Map();
	const overlays = new Map();

	const mapsArray = () => {
		return Array.from(maps.values());
	};

	const overlaysArray = () => {
		return Array.from(overlays.values());
	};

	// Actions

	const addGeoJSON = (json) => {
		if (!json || !json.type) {
			throw new Error("Valid GeoJSON required");
		}

		switch (json.type) {
			case "FeatureCollection":
				//Create & Add Map
				const map = createMap(json);
				addMap(map);

				return map;

				break;
			case "Feature":
				//Create & Add Overlay
				const overlay = createOverlay(json);
				addOverlay(overlay);

				return overlay;

				break;
			default:
				throw new Error("Valid GeoJSON Feature or FeatureCollection required");
		}
	};

	const addMap = (map) => {
		// Ensure is WaymarkMap
		if (!(map instanceof WaymarkMap)) {
			throw new Error("WaymarkMap instance required");
		}

		// Ensure not already added
		if (maps.has(map.id)) {
			return;
		}

		maps.set(map.id, map);

		WaymarkInstance.dispatchEvent("geojson-state-change");
		WaymarkInstance.dispatchEvent("geojson-map-added", { map });
	};

	const removeMap = (map) => {
		// Ensure is WaymarkMap
		if (!(map instanceof WaymarkMap)) {
			throw new Error("WaymarkMap instance required");
		}

		// Ensure already added
		if (!maps.has(map.id)) {
			return;
		}

		maps.delete(map.id);

		WaymarkInstance.dispatchEvent("geojson-state-change");
		WaymarkInstance.dispatchEvent("geojson-map-removed", { map });
	};

	const addOverlay = (overlay) => {
		// Ensure is WaymarkOverlay
		if (!(overlay instanceof WaymarkOverlay)) {
			throw new Error("WaymarkOverlay instance required");
		}

		// Ensure not already added
		if (overlays.has(overlay.id)) {
			return;
		}

		overlays.set(overlay.id, overlay);

		WaymarkInstance.dispatchEvent("geojson-state-change");
		WaymarkInstance.dispatchEvent("geojson-overlay-added", { overlay });
	};

	const removeOverlay = (overlay) => {
		// Ensure is WaymarkOverlay
		if (!(overlay instanceof WaymarkOverlay)) {
			throw new Error("WaymarkOverlay instance required");
		}

		// Ensure already added
		if (!overlays.has(overlay.id)) {
			return;
		}

		overlays.delete(overlay.id);

		WaymarkInstance.dispatchEvent("geojson-state-change");
		WaymarkInstance.dispatchEvent("geojson-overlay-removed", { overlay });
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
		addMap,
		removeMap,
		addOverlay,
		removeOverlay,
	};
}
