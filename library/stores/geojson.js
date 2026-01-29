import { ref, watch, computed, triggerRef } from "vue";
import { throttle } from "lodash-es";
import { LngLatBounds } from "maplibre-gl";
import { createOverlay, createMap } from "@/helpers/Factory.js";
import WaymarkMap from "@/classes/Map.js";
import WaymarkOverlay from "@/classes/Overlays/Overlay.js";

export function createGeoJSONStore(WaymarkInstance) {
	// State
	const maps = ref(new Map());
	const overlays = ref(new Map());

	const mapsArray = computed(() => {
		return Array.from(maps.value.values());
	});

	const overlaysArray = computed(() => {
		return Array.from(overlays.value.values());
	});

	const toJSON = computed(() => {
		return {
			maps: mapsArray.value.map((map) => map.toJSON()),
			overlays: overlaysArray.value.map((overlay) => overlay.toJSON()),
		};
	});

	// Fire event every time toJSON changes
	watch(
		() => toJSON.value,
		throttle((newValue) => {
			WaymarkInstance.dispatchEvent("geojson-state-change", {
				geoJSON: newValue,
			});
		}, 250),
		{ deep: true },
	);

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
		if (maps.value.has(map.id)) {
			return;
		}

		maps.value.set(map.id, map);
		triggerRef(maps);

		// Add overlays too
		// map.overlays.forEach((overlay) => {
		// 	addOverlay(overlay);
		// });
		// triggerRef(overlays);

		WaymarkInstance.dispatchEvent("geojson-map-added", { map });
	};

	const removeMap = (map) => {
		// Ensure is WaymarkMap
		if (!(map instanceof WaymarkMap)) {
			throw new Error("WaymarkMap instance required");
		}

		// Ensure already added
		if (!maps.value.has(map.id)) {
			return;
		}

		maps.value.delete(map.id);
		triggerRef(maps);

		// Remove overlays too
		// map.overlays.forEach((overlay) => {
		// 	removeOverlay(overlay);
		// });
		// triggerRef(overlays);

		WaymarkInstance.dispatchEvent("geojson-map-removed", { map });
	};

	const addOverlay = (overlay) => {
		// Ensure is WaymarkOverlay
		if (!(overlay instanceof WaymarkOverlay)) {
			throw new Error("WaymarkOverlay instance required");
		}

		// Ensure not already added
		if (overlays.value.has(overlay.id)) {
			return;
		}

		overlays.value.set(overlay.id, overlay);
		triggerRef(overlays);

		WaymarkInstance.dispatchEvent("geojson-overlay-added", { overlay });
	};

	const removeOverlay = (overlay) => {
		// Ensure is WaymarkOverlay
		if (!(overlay instanceof WaymarkOverlay)) {
			throw new Error("WaymarkOverlay instance required");
		}

		// Ensure already added
		if (!overlays.value.has(overlay.id)) {
			return;
		}

		overlays.value.delete(overlay.id);
		triggerRef(overlays);

		WaymarkInstance.dispatchEvent("geojson-overlay-removed", { overlay });
	};

	// Getters

	const overlaysByType = computed(() => {
		const overlaysArray = Array.from(overlays.value.values());
		return {
			markers: overlaysArray.filter(
				(overlay) => overlay.featureType === "marker",
			),
			lines: overlaysArray.filter((overlay) => overlay.featureType === "line"),
			shapes: overlaysArray.filter(
				(overlay) => overlay.featureType === "shape",
			),
		};
	});

	const overlaysBounds = computed(() => {
		const bounds = new LngLatBounds();

		if (overlays.value.size === 0) {
			return null;
		}

		overlays.value.forEach((overlay) => {
			bounds.extend(overlay.getBounds());
		});

		return bounds;
	});

	const features = computed(() => {
		if (
			state.value &&
			state.value.type === "FeatureCollection" &&
			Array.isArray(state.value.features)
		) {
			return state.value.features;
		}

		return [];
	});

	const hasFeatures = computed(() => {
		return features.value.length > 0;
	});

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
