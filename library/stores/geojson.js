import { shallowRef, watch, computed } from "vue";
import { throttle } from "lodash-es";
import { LngLatBounds } from "maplibre-gl";
import { createOverlay, createMap } from "@/helpers/Factory.js";

export function createGeoJSONStore(stateStore) {
	const { dispatchEvent } = stateStore;

	// State
	const maps = shallowRef([]);
	const overlays = shallowRef([]);

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
		maps.value.push(map);

		// Add overlays too
		overlays.value = [...overlays.value, ...map.overlays];

		dispatchEvent("geojson-map-added", { map });
	};

	const addOverlay = (overlay) => {
		overlays.value.push(overlay);

		dispatchEvent("geojson-overlay-added", { overlay });
	};

	// Getters
	const state = computed(() => toJSON());

	const overlaysByType = computed(() => {
		return {
			markers: overlays.value.filter(
				(overlay) => overlay.featureType === "marker",
			),
			lines: overlays.value.filter((overlay) => overlay.featureType === "line"),
			shapes: overlays.value.filter(
				(overlay) => overlay.featureType === "shape",
			),
		};
	});

	const overlaysBounds = computed(() => {
		const bounds = new LngLatBounds();

		if (overlays.value.length === 0) {
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
		() => state.value,
		throttle((newVal) => {
			dispatchEvent("geojson-state-change");
		}, 1000),
		{ deep: true },
	);

	return {
		// State
		state,
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
