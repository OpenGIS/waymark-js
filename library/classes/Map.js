import { ulid } from "ulid";
import { createOverlay } from "@/helpers/Factory";
import { fitBoundsOptions } from "@/helpers/MapLibre";

export default class WaymarkMap {
    constructor(geoJSON = {}) {
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
            id: ulid(),
            title: "",
            slug: "",
            description: "",
            center: null,
            zoom: null,
            ...this.properties.waymark,
        };
        this.id = this.waymark.id;

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
            this.geojson.bbox = [
                this.bounds.getWest(),
                this.bounds.getSouth(),
                this.bounds.getEast(),
                this.bounds.getNorth(),
            ];

            this.overlays.push(overlay);
        });

        return this;
    }

    addTo(map) {
        if (!map || !this.overlays.length) {
            return;
        }

        // Rendering order - Shapes, Lines & then Markers
        this.overlays
            .filter((overlay) => overlay.featureType === "shape")
            .forEach((overlay) => {
                overlay.addTo(map);
            });

        this.overlays
            .filter((overlay) => overlay.featureType === "line")
            .forEach((overlay) => {
                overlay.addTo(map);
            });

        this.overlays
            .filter((overlay) => overlay.featureType === "marker")
            .forEach((overlay) => {
                overlay.addTo(map);
            });

        // Zoom to bounds
        map.fitBounds(this.bounds, fitBoundsOptions);
    }

    toJSON() {
        this.geojson;
    }
}
