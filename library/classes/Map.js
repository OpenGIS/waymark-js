import { ulid } from "ulid";
import { createOverlay } from "@/helpers/Factory";
import GeoJSONFeatureCollection from "@/classes/GeoJSON/FeatureCollection.js";
import { fitBoundsOptions } from "@/helpers/MapLibre.js";

export default class WaymarkMap extends GeoJSONFeatureCollection {
    constructor(featureCollection = {}) {
        super(featureCollection);

        this.id = this.id || ulid();

        // Get properties
        this.properties = featureCollection.properties || {};

        // Waymark defaults
        this.waymark = {
            title: "",
            description: "",
            center: null,
            zoom: null,
            ...this.properties.waymark,
        };

        // Create overlays
        this.overlays = [];
        featureCollection.features.forEach((feature) => {
            // Create
            this.overlays.push(createOverlay(feature, this));
        });

        this.mapLibreMap = null;

        return this;
    }

    getBounds() {
        // Convert from geojson bbox value to maplibre LngLatBounds array
        const bbox = this.bbox;

        if (
            Array.isArray(bbox) &&
            bbox.length === 4 &&
            bbox.every((coord) => typeof coord === "number")
        ) {
            return [
                [bbox[0], bbox[1]], // Southwest [lng, lat]
                [bbox[2], bbox[3]], // Northeast [lng, lat]
            ];
        }
        return null;
    }

    addTo(map) {
        if (!map || !this.overlays.length || this.hasMap()) {
            return;
        }

        this.mapLibreMap = map;

        // Rendering order - Shapes, Lines & then Markers
        this.overlays
            .filter((overlay) => overlay.featureType === "shape")
            .forEach((overlay) => {
                overlay.addTo(this.mapLibreMap);
            });

        this.overlays
            .filter((overlay) => overlay.featureType === "line")
            .forEach((overlay) => {
                overlay.addTo(this.mapLibreMap);
            });

        this.overlays
            .filter((overlay) => overlay.featureType === "marker")
            .forEach((overlay) => {
                overlay.addTo(this.mapLibreMap);
            });

        // Zoom to geojson this.bbox
        this.mapLibreMap.fitBounds(this.getBounds(), fitBoundsOptions);
    }

    hasMap() {
        return this.mapLibreMap !== null;
    }

    remove() {
        this.overlays.forEach((overlay) => {
            overlay.remove();
        });
    }
}
