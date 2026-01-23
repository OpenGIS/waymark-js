import { computed, shallowRef } from "vue";

export function createStateStore(WaymarkInstance) {
	// State
	const container = shallowRef(WaymarkInstance.container);
	const activeOverlay = shallowRef(null);

	// Actions
	const setActiveOverlay = (overlay = null) => {
		if (!overlay) {
			// Remove highlight
			if (activeOverlay.value) {
				activeOverlay.value.setActive(false);
			}

			activeOverlay.value = null;

			WaymarkInstance.dispatchEvent("state-active-overlay-unset");

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

		WaymarkInstance.dispatchEvent("state-active-overlay-set");
	};

	return {
		// State
		container,
		activeOverlay,

		// Actions
		setActiveOverlay,
	};
}
