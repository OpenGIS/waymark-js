import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { LngLatBounds } from "maplibre-gl";

export const useInstanceStore = defineStore("instance", () => {
	// State
	const container = shallowRef(null);
	const map = shallowRef(null);
	const overlays = shallowRef([]);
	const activeOverlay = shallowRef(null);
	const mapReady = shallowRef(false);

	// Actions
	function setContainer(divElement) {
		container.value = divElement;
	}

	const layerFilters = ref({
		text: "",
		inBounds: true,
	});

	const view = ref({
		bearing: null,
		pitch: null,
		bounds: null,
		zoom: null,
		center: null,
	});

	// Computed
	const overlaysByType = computed(() => {
		const byType = {
			marker: {},
			line: {},
			shape: {},
		};

		overlays.value.forEach((overlay) => {
			const typeKey = overlay.typeKey || "undefined";

			if (!byType[overlay.featureType][typeKey]) {
				byType[overlay.featureType][typeKey] = [];
			}

			byType[overlay.featureType][typeKey].push(overlay);
		});

		return byType;
	});

	const filteredOverlays = computed(() => {
		const filtered = [];

		// Iterate over all overlays
		overlays.value.forEach((overlay) => {
			// Is it in the current map bounds
			if (layerFilters.value.inBounds && !overlay.inBounds(view.value.bounds)) {
				return;
			}

			// Text filter
			if (
				layerFilters.value.text !== "" &&
				!overlay.containsText(layerFilters.value.text)
			) {
				return;
			}

			filtered.push(overlay);
		});

		return filtered;
	});

	const overlaysBounds = computed(() => {
		if (overlays.value.length === 0) {
			return null;
		}

		const bounds = new LngLatBounds();

		overlays.value.forEach((overlay) => {
			bounds.extend(overlay.getBounds());
		});

		return bounds;
	});

	const eventData = computed(() => {
		return {
			map: map.value,
			mapReady: mapReady.value,
			overlays: overlays.value,
			overlaysBounds: overlaysBounds.value,
			activeOverlay: activeOverlay.value,
		};
	});

	return {
		// State
		mapReady,
		container,
		overlays,
		overlaysByType,
		map,
		layerFilters,
		activeOverlay,
		view,

		// Actions
		setContainer,

		// Computed
		overlaysByType,
		filteredOverlays,
		overlaysBounds,
		eventData,
	};
});
