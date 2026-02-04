import { ulid } from "ulid";
import { LngLatBounds } from "maplibre-gl";
import { createOverlay } from "@/helpers/Factory";
import GeoJSONFeatureCollection from "@/classes/GeoJSON/FeatureCollection.js";
import { fitBoundsOptions } from "@/helpers/MapLibre.js";
import WaymarkOverlay from "@/classes/Overlays/Overlay.js";

export default class WaymarkMap extends GeoJSONFeatureCollection {
    constructor(featureCollection = {}) {
        super(featureCollection);

        this.id = this.id || ulid();

        // Create overlays
        this.overlays = new Map();
        this.features.forEach((feature) => {
            // Create
            const overlay = createOverlay(feature);
            this.overlays.set(overlay.id, overlay);
        });

        this.mapLibreMap = null;

        return this;
    }

    get overlaysArray() {
        return Array.from(this.overlays.values());
    }

    toJSON() {
        const json = super.toJSON();

        // Override features with overlays
        json.features = this.overlaysArray.map((overlay) => overlay.toJSON());

        return json;
    }

    hasOverlay(overlayID) {
        return this.overlays.has(overlayID);
    }

    getOverlay(overlayID) {
        return this.overlays.get(overlayID) || null;
    }

    addOverlay(overlay) {
        if (!(overlay instanceof WaymarkOverlay)) {
            throw new Error("WaymarkOverlay instance required");
        }

        if (this.overlays.has(overlay.id)) {
            return;
        }

        // Add to features array
        this.features.push(overlay.toJSON());

        // Add to overlays map
        this.overlays.set(overlay.id, overlay);
    }

    removeOverlay(overlayID) {
        if (!this.overlays.has(overlayID)) {
            throw new Error("Overlay not found in this map");
        }

        this.overlays.delete(overlayID);
    }

    getBounds() {
        if (!this.bbox) {
            return null;
        }

        // Ensure bbox values are finite numbers
        if (
            !isFinite(this.bbox[0]) ||
            !isFinite(this.bbox[1]) ||
            !isFinite(this.bbox[2]) ||
            !isFinite(this.bbox[3])
        ) {
            return null;
        }

        // Use this.bbox value and convert to LngLatBounds
        const bounds = new LngLatBounds(
            [this.bbox[0], this.bbox[1]],
            [this.bbox[2], this.bbox[3]],
        );

        if (bounds.isEmpty()) {
            return null;
        }

        return bounds;
    }

    addTo(map) {
        if (!map) {
            return;
        }

        this.mapLibreMap = map;

        if (!this.overlaysArray.length) {
            return;
        }

        // Rendering order - Shapes, Lines & then Markers
        this.overlaysArray
            .filter((overlay) => overlay.featureType === "shape")
            .forEach((overlay) => {
                overlay.addTo(this.mapLibreMap);
            });

        this.overlaysArray
            .filter((overlay) => overlay.featureType === "line")
            .forEach((overlay) => {
                overlay.addTo(this.mapLibreMap);
            });

        this.overlaysArray
            .filter((overlay) => overlay.featureType === "marker")
            .forEach((overlay) => {
                overlay.addTo(this.mapLibreMap);
            });

        // Zoom to geojson this.bbox
        if (this.getBounds()) {
            this.mapLibreMap.fitBounds(this.getBounds(), fitBoundsOptions);
        }
    }

    hasMap() {
        return this.mapLibreMap !== null;
    }

    remove() {
        this.overlaysArray.forEach((overlay) => {
            overlay.remove();
        });

        this.mapLibreMap = null;
    }
}
