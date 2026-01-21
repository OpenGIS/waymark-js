import { ulid } from "ulid";
import { Overlay } from "@/classes/Overlays";
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
                return new Overlay(feature);
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
