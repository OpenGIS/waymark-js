import { storeToRefs } from "pinia";
// import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
// import mlcontour from "maplibre-contour";
import { featureTypes, getFeatureType } from "@/helpers/Overlay.js";

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
import { useConfig } from "@/composables/useConfig.js";

export function useMap() {
	// Get the state from the instance store
	const { config } = useConfig();
	const { map, mapReady, overlays, overlaysBounds, activeOverlay, view } =
		storeToRefs(useInstanceStore());

	// Create & Store Map
	const init = () => {
		const mapOptions = {
			...config.value.getMapLibreOptions(),
			container: `${config.value.getMapOption("div_id")}-map`,
		};

		// Create MapLibre instance
		map.value = new maplibregl.Map(mapOptions);

		// Triggers the UI to populate
		map.value.on("load", () => {
			mapReady.value = true;

			// Dispatch an event
			const container = document.getElementById(
				config.value.getMapOption("div_id"),
			);

			container.dispatchEvent(
				new CustomEvent("waymark-map-loaded", {
					bubbles: true,
					detail: { map: map.value },
				}),
			);

			console.log("Map Loaded:", mapReady.value);

			// Add Tile Layers
			config.value.getTileLayers().forEach((tileLayer) => {
				tileLayer.addTo(map.value);
			});

			// Set Initial View
			view.value.bounds = map.value.getBounds();
			view.value.bearing = map.value.getBearing();
			view.value.pitch = map.value.getPitch();
			view.value.zoom = map.value.getZoom();
			view.value.center = map.value.getCenter();
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

		// Terrain and Contours
		/*
		map.value.on("style.load", () => {
			map.value.addSource("terrainSource", {
				type: "raster-dem",
				tiles: [
					"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
				],
				encoding: "terrarium",
				tileSize: 256,
				maxzoom: 14,
			});

			map.value.setTerrain({
				source: "terrainSource",
				exaggeration: 1,
			});

			map.value.addSource("hillshadeSource", {
				type: "raster-dem",
				tiles: [
					"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
				],
				encoding: "terrarium",
				tileSize: 256,
				maxzoom: 14,
			});

			map.value.addLayer({
				id: "hillshade-layer",
				type: "hillshade",
				source: "hillshadeSource",
				paint: {
					"hillshade-shadow-color": "#333333",
				},
			});

			var demSource = new mlcontour.DemSource({
				url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
				encoding: "terrarium", // "mapbox" or "terrarium" default="terrarium"
				maxzoom: 13,
				worker: true, // offload isoline computation to a web worker to reduce jank
				cacheSize: 100, // number of most-recent tiles to cache
				timeoutMs: 10_000, // timeout on fetch requests
			});
			demSource.setupMaplibre(maplibregl);

			map.value.addSource("contour-source", {
				type: "vector",
				minzoom: 12,
				// maxzoom: 14,
				tiles: [
					demSource.contourProtocolUrl({
						// convert meters to feet, default=1 for meters
						// multiplier: 3.28084,
						thresholds: {
							// zoom: [minor, major]
							// We want a very subtle contour effect
							0: [100, 500],
							5: [50, 250],
							10: [25, 100],
							15: [10, 50],
						},
						// optional, override vector tile parameters:
						contourLayer: "contours",
						elevationKey: "ele",
						levelKey: "level",
						extent: 4096,
						buffer: 1,
					}),
				],
				maxzoom: 15,
			});

			map.value.addLayer({
				id: "contour-lines",
				type: "line",
				source: "contour-source",
				"source-layer": "contours",
				paint: {
					"line-color": "rgba(0,0,0, 30%)",
					// level = highest index in thresholds array the elevation is a multiple of
					"line-width": ["match", ["get", "level"], 1, 1, 0.5],
				},
			});
			map.value.addLayer({
				id: "contour-labels",
				type: "symbol",
				source: "contour-source",
				"source-layer": "contours",
				filter: [">", ["get", "level"], 0],
				layout: {
					"symbol-placement": "line",
					"text-size": 10,
					"text-field": ["concat", ["number-format", ["get", "ele"], {}], "m"],
					"text-font": ["Noto Sans Bold"],
				},
				paint: {
					"text-halo-color": "white",
					"text-halo-width": 1,
				},
			});
		});
*/
	};

	const loadGeoJSON = (geoJSON) => {
		// Data Layer - GeoJSON Present?
		if (geoJSON && Array.isArray(geoJSON.features)) {
			// If ! mapReady then wait till it is
			if (!mapReady.value) {
				map.value.on("load", () => {
					loadGeoJSON(geoJSON);
				});
				return;
			}

			// Overlays
			geoJSON.features.forEach((feature) => {
				// Determine Feature Type
				const featureType = getFeatureType(feature);

				if (!featureType || !featureTypes.includes(featureType)) {
					console.warn(
						"Feature Type not recognised or supported - skipping",
						feature,
					);
					return;
				}

				// Create Overlay instance
				const overlayId = `overlay-${overlays.value.length}`;

				const overlay = (() => {
					switch (featureType) {
						case "marker":
							return new MarkerOverlay(feature, config.value, overlayId);
						case "line":
							return new LineOverlay(feature, config.value, overlayId);
						case "shape":
							return new ShapeOverlay(feature, config.value, overlayId);
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

			// If there is not an initial view
			if (!config.value.getInitialView()) {
				// Update bounds to encompass new Overlays
				map.value.fitBounds(overlaysBounds.value, fitBoundsOptions);
			}

			return overlays.value;
		}

		return [];
	};

	const clearGeoJSON = () => {
		// Remove all overlays from map & store
		overlays.value.forEach((overlay) => {
			overlay.remove();
		});
		overlays.value = [];

		// Clear active overlay
		activeOverlay.value = null;
	};

	const toGeoJSON = () => {
		const featureCollection = {
			type: "FeatureCollection",
			features: [],
		};

		overlays.value.forEach((overlay) => {
			featureCollection.features.push(overlay.toGeoJSON());
		});

		return featureCollection;
	};

	const setActiveOverlay = (overlay = null) => {
		if (!overlay) {
			// Remove highlight
			if (activeOverlay.value) {
				activeOverlay.value.removeHighlight();
			}
			activeOverlay.value = null;
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
			activeOverlay.value = null;
		}

		// Make active
		activeOverlay.value = overlay;
		overlay.flyTo();
		overlay.addHighlight();

		setTimeout(() => {
			// Scroll to in UI
			if (overlay.rowElement) {
				// Sticky panel at top of content
				const panelTop = document.querySelector(".panel.overlay .panel-top");
				const panelHeight = panelTop.clientHeight;

				// Set scroll margin
				overlay.rowElement.value.style.scrollMarginTop = `${panelHeight}px`;

				// Scroll to view
				overlay.rowElement.value.scrollIntoView({
					behavior: "smooth",
					block: "nearest",
				});
			}
		}, 750);
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
		init,
		loadGeoJSON,
		clearGeoJSON,
		toGeoJSON,
		setActiveOverlay,
		resetView,
		rotateMap,
		pointNorth,
		pitchMap,
		toggle3D,
	};
}
