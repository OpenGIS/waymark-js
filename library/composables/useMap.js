import { storeToRefs } from "pinia";
import { featureTypes, getFeatureType } from "@/helpers/Overlay.js";
import { dispatchEvent } from "@/classes/Event.js";

import {
	fitBoundsOptions,
	flyToOptions,
	rotateOptions,
	easeToOptions,
} from "@/helpers/MapLibre.js";

// Classes
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";

// Import stores
import { useStateStore } from "@/stores/state.js";
import { useGeoJSONStore } from "@/stores/geojson.js";

export function useMap() {
	// Get the state from the instance store
	const { map, overlaysBounds, view } = storeToRefs(useStateStore());

	const { setActiveOverlay } = useStateStore();

	const resetView = () => {
		map.value.fitBounds(overlaysBounds.value, flyToOptions);
	};

	const rotateMap = (direction = "cw", degrees = 90) => {
		// Ensure not currently roating
		if (map.value.isRotating()) {
			return;
		}

		const currentBearing = map.value.getBearing();
		const newBearing =
			direction === "cw" ? currentBearing + degrees : currentBearing - degrees;

		map.value.rotateTo(newBearing, rotateOptions);
	};

	const pitchMap = (direction = "down", degrees = 15) => {
		const currentPitch = map.value.getPitch();
		let newPitch =
			direction === "down" ? currentPitch + degrees : currentPitch - degrees;

		// Constrain pitch to 0-60
		newPitch = Math.max(0, Math.min(60, newPitch));

		map.value.easeTo(
			{
				pitch: newPitch,
				...easeToOptions,
			},
			{ easing: (t) => t * (2 - t) },
		);
	};

	const pointNorth = () => {
		if (!map.value) return;
		map.value.easeTo({
			bearing: 0,
			...easeToOptions,
		});
	};

	const toggle3D = () => {
		if (view.value.pitch > 0) {
			// Reset to 2D
			map.value.easeTo(
				{
					pitch: 0,
					...easeToOptions,
				},
				{ easing: (t) => t * (2 - t) },
			);
		} else {
			// Set to 3D
			map.value.easeTo(
				{
					pitch: 60,
					...easeToOptions,
				},
				{ easing: (t) => t * (2 - t) },
			);
		}
	};

	return {
		loadGeoJSON,
		resetView,
		rotateMap,
		pointNorth,
		pitchMap,
		toggle3D,
	};
}
