import { ulid } from "ulid";
import { createOverlay } from "@/helpers/Factory";
import GeoJSONFeatureCollection from "@/classes/GeoJSON/FeatureCollection.js";

export default class WaymarkMap extends GeoJSONFeatureCollection {
    constructor(featureCollection = {}) {
        super(featureCollection);

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
            const overlay = createOverlay(feature, this);

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
