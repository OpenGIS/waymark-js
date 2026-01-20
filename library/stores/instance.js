import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { LngLatBounds } from "maplibre-gl";
import { dispatchEvent } from "@/classes/Event.js";

export const useStateStore = defineStore("state", () => {
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

	// Actions
	const setActiveOverlay = (overlay = null) => {
		if (!overlay) {
			// Remove highlight
			if (activeOverlay.value) {
				activeOverlay.value.hideHighlight();
			}

			activeOverlay.value = null;

			dispatchEvent("active-overlay-unset");

			return;
		}

		// If active layer is set
		if (activeOverlay.value) {
			//If already active layer - focus on it
			if (activeOverlay.value === overlay) {
				overlay.zoomIn();

				// Stop here
				return;
			}

			// Remove highlight
			activeOverlay.value.hideHighlight();

			// Make inactive
			setActiveOverlay();
		}

		// Make active
		activeOverlay.value = overlay;
		overlay.flyTo();
		overlay.showHighlight();
		overlay.openPopup();

		dispatchEvent("active-overlay-set");
	};

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
		setActiveOverlay,

		// Computed
		overlaysByType,
		filteredOverlays,
		overlaysBounds,
		eventData,
	};
});
