import { computed, ref, shallowRef } from "vue";
import { dispatchEvent } from "@/classes/Event.js";

export function createStateStore() {
	// State
	const container = shallowRef(null);
	const activeOverlay = shallowRef(null);

	const eventData = computed(() => {
		return {
			activeOverlay: activeOverlay.value,
		};
	});

	const state = {
		// State
		container,
		activeOverlay,
		// Computed
		eventData,
	};

	// Actions
	function setContainer(divElement) {
		container.value = divElement;
	}

	// Actions
	const setActiveOverlay = (overlay = null) => {
		if (!overlay) {
			// Remove highlight
			if (activeOverlay.value) {
				activeOverlay.value.setActive(false);
			}

			activeOverlay.value = null;

			dispatchEvent("state-active-overlay-unset", {}, state);

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
			activeOverlay.value.setActive(false);

			// Make inactive
			activeOverlay.value = null;
		}

		// Make active
		activeOverlay.value = overlay;
		overlay.setActive(true);
		overlay.flyTo();
		overlay.openPopup();

		dispatchEvent("state-active-overlay-set", {}, state);
	};

	state.setContainer = setContainer;
	state.setActiveOverlay = setActiveOverlay;

	return state;
}
