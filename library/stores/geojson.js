import { shallowRef, watch, computed, triggerRef } from "vue";
import { throttle } from "lodash-es";
import { LngLatBounds } from "maplibre-gl";
import { createOverlay, createMap } from "@/helpers/Factory.js";

export function createGeoJSONStore(WaymarkInstance) {
	// State
	const maps = shallowRef(new Map());
	const overlays = shallowRef(new Map());

	// Actions

	const addJSON = (json) => {
		if (!json || !json.type) {
			throw new Error("Valid GeoJSON required");
		}

		switch (json.type) {
			case "FeatureCollection":
				//Create & Add Map
				addMap(createMap(json));

				break;
			case "Feature":
				//Create & Add Overlay
				addOverlay(createOverlay(json));

				break;
			default:
				throw new Error("Valid GeoJSON Feature or FeatureCollection required");
		}
	};

	const addMap = (map) => {
		// Ensure not already added
		if (maps.value.has(map.id)) {
			return;
		}

		maps.value.set(map.id, map);
		triggerRef(maps);

		// Add overlays too
		map.overlays.forEach((overlay) => {
			addOverlay(overlay);
		});
		triggerRef(overlays);

		WaymarkInstance.dispatchEvent("geojson-map-added", { map });
	};

	const addOverlay = (overlay) => {
		// Ensure not already added
		if (overlays.value.has(overlay.id)) {
			return;
		}

		overlays.value.set(overlay.id, overlay);
		triggerRef(overlays);

		WaymarkInstance.dispatchEvent("geojson-overlay-added", { overlay });
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

	// Persistence

	const toJSON = () => {
		const geoJSON = {
			type: "FeatureCollection",
			features: [],
		};

		["markers", "lines", "shapes"].forEach((type) => {
			overlaysByType.value[type].forEach((overlay) => {
				geoJSON.features.push(overlay.feature);
			});
		});

		return geoJSON;
	};

	watch(
		computed(() => toJSON()),
		throttle((newVal) => {
			WaymarkInstance.dispatchEvent("geojson-state-change");
		}, 1000),
		{ deep: true },
	);

	return {
		// State
		features,
		hasFeatures,
		maps,
		overlays,
		overlaysByType,
		overlaysBounds,

		// Actions
		addJSON,

		// Persistence
		toJSON,
	};
}
