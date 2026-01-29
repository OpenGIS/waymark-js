import { ulid } from "ulid";
import { createOverlay } from "@/helpers/Factory";
import GeoJSONFeatureCollection from "@/classes/GeoJSON/FeatureCollection.js";
import { fitBoundsOptions } from "@/helpers/MapLibre.js";
import WaymarkOverlay from "@/classes/Overlays/Overlay.js";

export default class WaymarkMap extends GeoJSONFeatureCollection {
    constructor(featureCollection = {}) {
        super(featureCollection);

        this.id = this.id || ulid();

        // Waymark defaults
        this.properties.waymark = {
            title: "",
            description: "",
            center: null,
            zoom: null,
            ...this.properties.waymark,
        };

        // Create overlays
        this.overlays = new Map();
        this.features.forEach((feature) => {
            // Create
            const overlay = createOverlay(feature, this);
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

        this.overlays.set(overlay.id, overlay);
    }

    removeOverlay(overlay) {
        if (!(overlay instanceof WaymarkOverlay)) {
            throw new Error("WaymarkOverlay instance required");
        }

        if (!this.overlays.has(overlay.id)) {
            return;
        }

        this.overlays.delete(overlay.id);
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
        if (!map || !this.overlaysArray.length || this.hasMap()) {
            return;
        }

        this.mapLibreMap = map;

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

        // console.log("fitting bounds", this.getBounds());
        // debugger;

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
    }
}
