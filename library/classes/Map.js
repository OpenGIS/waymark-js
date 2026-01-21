import { ulid } from "ulid";
import { getFeatureType } from "@/helpers/Overlay.js";
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";
import { dispatchEvent } from "@/classes/Event.js";

export class WaymarkMap {
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

        // Create overlays
        this.overlays = geoJSON.features
            .map((feature) => {
                const featureType = getFeatureType(feature);

                // Create overlay ID
                const overlayId = `overlay-${ulid()}`;

                // Create overlay based on feature type
                let overlay = null;
                switch (featureType) {
                    case "marker":
                        overlay = new MarkerOverlay(feature, overlayId);
                        break;
                    case "line":
                        overlay = new LineOverlay(feature, overlayId);
                        break;
                    case "shape":
                        overlay = new ShapeOverlay(feature, overlayId);
                        break;
                    default:
                        console.warn(
                            "Feature Type not recognised or supported - skipping",
                            feature,
                        );
                        return;
                }

                return overlay;
            })
            .filter((overlay) => overlay !== null);

        return this;
    }

    addTo(map) {
        dispatchEvent("adding-overlays-to-map", { overlays: this.overlays });

        this.overlays.forEach((overlay) => {
            overlay.addTo(map);
        });
    }

    toJSON() {
        return {
            geojson: this.geojson,
        };
    }
}
