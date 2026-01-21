import { ulid } from "ulid";
import { Overlay } from "@/classes/Overlays";
import { dispatchEvent } from "@/classes/Event.js";
import { LngLatBounds } from "maplibre-gl";
import { fitBoundsOptions } from "@/helpers/MapLibre.js";

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
                // Create
                const overlay = new Overlay(feature);

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

                return overlay;
            })
            .filter((overlay) => overlay !== null);

        return this;
    }

    addTo(map) {
        this.overlays.forEach((overlay) => {
            overlay.addTo(map);
            dispatchEvent("adding-waymark-map-to-maplibre-map", {
                waymarkMap: this,
            });
        });

        // Zoom to bounds
        map.fitBounds(this.bounds, fitBoundsOptions);
    }

    toJSON() {
        this.geojson;
    }
}
