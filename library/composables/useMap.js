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
import {
	MarkerOverlay,
	LineOverlay,
	ShapeOverlay,
} from "@/classes/Overlays.js";

// Import instanceStore
import { useInstanceStore } from "@/stores/instanceStore.js";

export function useMap() {
	// Get the state from the instance store
	const { map, mapReady, overlays, overlaysBounds, activeOverlay, view } =
		storeToRefs(useInstanceStore());

	// Add Event Listeners
	const addListeners = () => {
		// When MapLibre has loaded
		map.value.on("load", () => {
			mapReady.value = true;

			// Load GeoJSON if provided

			// Set Initial View
			view.value.bounds = map.value.getBounds();
			view.value.bearing = map.value.getBearing();
			view.value.pitch = map.value.getPitch();
			view.value.zoom = map.value.getZoom();
			view.value.center = map.value.getCenter();

			dispatchEvent("instance-ready");
		});

		// Track Bearing
		map.value.on("rotateend", () => {
			view.value.bearing = map.value.getBearing();
		});

		// Track Pitch
		map.value.on("pitchend", () => {
			view.value.pitch = map.value.getPitch();
		});

		//Track map bounds
		map.value.on("moveend", () => {
			//Set Max bounds
			view.value.bounds = map.value.getBounds();
			view.value.center = map.value.getCenter();
			view.value.zoom = map.value.getZoom();
		});

		// Lines & Shape click handling
		map.value.on("click", (e) => {
			// Create a bounding box to find features within a certain distance of the click
			const bbox = [
				[e.point.x - 10, e.point.y - 10],
				[e.point.x + 10, e.point.y + 10],
			];
			const features = map.value.queryRenderedFeatures(bbox, {
				layers: overlays.value
					.filter((o) => o.featureType !== "marker")
					.map((o) => o.id),
			});

			if (features.length) {
				const overlay = overlays.value.find(
					(o) => o.id === features[0].layer.id,
				);
				if (overlay) {
					setActiveOverlay(overlay);
				}
				// No features found
			} else {
				// If Active overlay
				if (activeOverlay.value) {
					// Remove active overlay
					setActiveOverlay();
				}
			}
		});
	};

	const loadGeoJSON = (geoJSON) => {
		// For each feature in the GeoJSON
		if (geoJSON && Array.isArray(geoJSON.features)) {
			// Overlays
			geoJSON.features.forEach((feature) => {
				// Determine Feature Type
				const featureType = getFeatureType(feature);

				if (!featureType || !featureTypes.includes(featureType)) {
					console.warn(
						"Feature Type not recognised or supported - skipping",
						feature,
					);
					return [];
				}

				// Create Overlay instance
				const overlayId = `overlay-${overlays.value.length}`;

				const overlay = (() => {
					switch (featureType) {
						case "marker":
							return new MarkerOverlay(feature, overlayId);
						case "line":
							return new LineOverlay(feature, overlayId);
						case "shape":
							return new ShapeOverlay(feature, overlayId);
					}
				})();

				// Add to store (reassign to trigger shallowRef updates)
				overlays.value = [...overlays.value, overlay];

				// Add to Map
				overlay.addTo(map.value);

				// Handle Markers
				// if (overlay instanceof MarkerOverlay) {
				// 	overlay.marker.getElement().addEventListener("click", (e) => {
				// 		e.stopPropagation();
				// 		setActiveOverlay(overlay);
				// 	});
				// }
			});

			// Fit to bounds
			map.value.fitBounds(overlaysBounds.value, fitBoundsOptions);

			return overlays.value;
		}

		return [];
	};

	const setActiveOverlay = (overlay = null) => {
		if (!overlay) {
			// Remove highlight
			if (activeOverlay.value) {
				activeOverlay.value.removeHighlight();
			}

			setActiveOverlay();
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
			activeOverlay.value.removeHighlight();

			// Make inactive
			setActiveOverlay();
		}

		// Make active
		activeOverlay.value = overlay;
		overlay.flyTo();
		overlay.addHighlight();
		overlay.openPopup();

		dispatchEvent("active-overlay-updated");
	};

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
		addListeners,
		loadGeoJSON,
		setActiveOverlay,
		resetView,
		rotateMap,
		pointNorth,
		pitchMap,
		toggle3D,
	};
}
