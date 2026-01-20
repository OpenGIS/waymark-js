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
	const { map, mapReady, overlays, overlaysBounds, view } =
		storeToRefs(useStateStore());

	const { setActiveOverlay } = useStateStore();

	// Add Event Listeners
	const addListeners = () => {
		// When MapLibre has loaded
		map.value.on("load", () => {
			mapReady.value = true;

			// Load GeoJSON if provided
			if (useGeoJSONStore().toJSON()) {
				loadGeoJSON();
			}

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

			// Get features around click
			const features = map.value.queryRenderedFeatures(bbox, {
				layers: overlays.value
					// .filter((o) => o.featureType !== "marker")
					.map((o) => o.id),
			});

			// Features found
			if (features.length) {
				// Get the closest overlay
				const overlay = overlays.value.find(
					(o) => o.id === features[0].layer.id,
				);

				if (overlay) {
					console.log("Feature clicked:", overlay);

					setActiveOverlay(overlay);
				}
				// No features found
			} else {
				// Remove active overlay
				setActiveOverlay();
			}
		});
	};

	const loadGeoJSON = () => {
		if (
			useGeoJSONStore().toJSON() &&
			Array.isArray(useGeoJSONStore().toJSON().features)
		) {
			// Group features by type
			const groupedFeatures = {
				shape: [],
				line: [],
				marker: [],
			};

			useGeoJSONStore()
				.toJSON()
				.features.forEach((feature) => {
					const featureType = getFeatureType(feature);

					if (!featureType || !featureTypes.includes(featureType)) {
						console.warn(
							"Feature Type not recognised or supported - skipping",
							feature,
						);
						return;
					}

					groupedFeatures[featureType].push(feature);
				});

			// Add features to the map in the desired order
			["shape", "line", "marker"].forEach((type) => {
				groupedFeatures[type].forEach((feature) => {
					const overlayId = `overlay-${overlays.value.length}`;
					const overlay = (() => {
						switch (type) {
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
				});
			});

			// Fit to bounds
			map.value.fitBounds(overlaysBounds.value, fitBoundsOptions);

			return overlays.value;
		}

		return [];
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
		resetView,
		rotateMap,
		pointNorth,
		pitchMap,
		toggle3D,
	};
}
