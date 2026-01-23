import { computed, shallowRef } from "vue";
import { WaymarkEvent, waymarkEventName } from "@/classes/Event.js";

export function createStateStore() {
	// State
	const container = shallowRef(null);
	const activeOverlay = shallowRef(null);

	const eventData = computed(() => {
		return {
			activeOverlay: activeOverlay.value,
		};
	});

	// Event Handling
	function dispatchEvent(eventName, params = {}) {
		// Create event
		const event = new WaymarkEvent(eventName, params, eventData.value);

		// Fire
		if (container.value) {
			container.value.dispatchEvent(event);
		}
	}

	function onEvent(eventName, callback) {
		if (container.value) {
			container.value.addEventListener(waymarkEventName, (event) => {
				if (event.detail && event.detail.eventName === eventName) {
					callback(event);
				}
			});
		}
	}

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

			dispatchEvent("state-active-overlay-unset");

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

		dispatchEvent("state-active-overlay-set");
	};

	return {
		// State
		container,
		activeOverlay,
		eventData,

		// Actions
		setContainer,
		setActiveOverlay,

		// Events
		dispatchEvent,
		onEvent,
	};
}
