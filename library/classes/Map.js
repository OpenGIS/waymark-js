import { ulid } from "ulid";
import { createOverlay } from "@/helpers/Factory";
import { fitBoundsOptions } from "@/helpers/MapLibre";

export default class WaymarkMap {
    constructor(geoJSON = {}) {
        // Unique ID
        this.id = geoJSON.id ? geoJSON.id : ulid();

        // Must be a valid GeoJSON Feature
        if (
            !geoJSON ||
            geoJSON.type !== "FeatureCollection" ||
            !Array.isArray(geoJSON.features)
        ) {
            throw new Error("Valid GeoJSON FeatureCollection required");
        }
        this.geojson = geoJSON;

        // Get properties
        this.properties = geoJSON.properties || {};
        this.waymark = {
            title: "",
            slug: "",
            description: "",
            center: null,
            zoom: null,
            ...this.properties.waymark,
        };

        // Create overlays
        this.overlays = [];
        geoJSON.features.forEach((feature) => {
            // Create
            const overlay = createOverlay(feature);
            overlay.setMap(this);

            // Extend bounds
            this.bounds =
                typeof this.bounds === "object"
                    ? this.bounds.extend(overlay.getBounds())
                    : overlay.getBounds();

            this.overlays.push(overlay);
        });

        this.mapLibreMap = null;

        return this;
    }

    toJSON() {
        return {
            type: "FeatureCollection",
            id: this.id,
            properties: this.properties,
            features: this.overlays.map((overlay) => overlay.toJSON()),
        };
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

        // Zoom to bounds
        // this.mapLibreMap.fitBounds(this.bounds, fitBoundsOptions);
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
