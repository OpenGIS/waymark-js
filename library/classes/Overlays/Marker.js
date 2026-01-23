import WaymarkOverlay from "@/classes/Overlays/Overlay.js";
import { LngLatBounds } from "maplibre-gl";
import { flyToOptions } from "@/helpers/MapLibre.js";
import { waymarkPrimaryColour, getRandomHexColour } from "@/helpers/Common.js";

export default class WaymarkMarker extends WaymarkOverlay {
  constructor(feature) {
    super(feature);
  }

  // GeoJson point
  toStyle() {
    const waymarkPaint = this.feature.properties.waymark?.paint || {};

    return {
      id: this.id,
      type: "circle",
      source: this.id,
      paint: {
        "circle-radius": 3,
        "circle-color": "#ffffff",
        "circle-stroke-color": getRandomHexColour(),
        "circle-stroke-width": 3,
        ...waymarkPaint,
      },
    };
  }

  hasElevationData() {
    // Check if feature coordinates has third dimension (elevation)
    return this.feature.geometry.coordinates.length === 3;
  }

  getElevationString() {
    if (!this.hasElevationData()) {
      return "";
    }

    // Return elevation value from coordinates, rounded to 1 decimal place
    return (
      "Elevation: " +
      Math.round(this.feature.geometry.coordinates[2] * 10) / 10 +
      "m"
    );
  }

  getBounds() {
    return new LngLatBounds(
      [
        this.feature.geometry.coordinates[0],
        this.feature.geometry.coordinates[1],
      ],
      [
        this.feature.geometry.coordinates[0],
        this.feature.geometry.coordinates[1],
      ],
    );
  }

  getCoordsString() {
    // For marker, return the coordinates as a string
    return (
      "Lat,Lng: " +
      this.feature.geometry.coordinates[1].toFixed(6) +
      ", " +
      this.feature.geometry.coordinates[0].toFixed(6)
    );
  }

  flyTo() {
    this.mapLibreMap.flyTo({
      center: [
        this.feature.geometry.coordinates[0],
        this.feature.geometry.coordinates[1],
      ],
      ...flyToOptions,
    });
  }

  inBounds(bounds) {
    return bounds.contains({
      lng: this.feature.geometry.coordinates[0],
      lat: this.feature.geometry.coordinates[1],
    });
  }

  customizeHighlight(highlightLayer) {
    highlightLayer.paint["circle-stroke-color"] = waymarkPrimaryColour;
    highlightLayer.paint["circle-stroke-width"] += 2;
  }
}
