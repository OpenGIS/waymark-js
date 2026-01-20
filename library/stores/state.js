import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { dispatchEvent } from "@/classes/Event.js";

export const useStateStore = defineStore("state", () => {
	// State
	const container = shallowRef(null);
	const map = shallowRef(null);
	const activeOverlay = shallowRef(null);
	const mapReady = shallowRef(false);

	// Actions
	function setContainer(divElement) {
		container.value = divElement;
	}

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

	const eventData = computed(() => {
		return {
			map: map.value,
			mapReady: mapReady.value,
			activeOverlay: activeOverlay.value,
		};
	});

	return {
		// State
		mapReady,
		container,
		map,
		activeOverlay,
		view,

		// Actions
		setContainer,
		setActiveOverlay,

		// Computed
		eventData,
	};
});
