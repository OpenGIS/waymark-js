import { computed, ref, shallowRef } from "vue";
import { defineStore } from "pinia";
import { dispatchEvent } from "@/classes/Event.js";

export const useStateStore = defineStore("state", () => {
	// State
	const container = shallowRef(null);
	const activeOverlay = shallowRef(null);

	// Actions
	function setContainer(divElement) {
		container.value = divElement;
	}

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
			activeOverlay: activeOverlay.value,
		};
	});

	return {
		// State
		container,
		activeOverlay,

		// Actions
		setContainer,
		setActiveOverlay,

		// Computed
		eventData,
	};
});
