import WaymarkOverlay from "@/classes/Overlays/Overlay.js";
import { length } from "@turf/length";
import { LngLatBounds } from "maplibre-gl";
import { flyToOptions } from "@/helpers/MapLibre.js";
import { waymarkPrimaryColour, getRandomHexColour } from "@/helpers/Common.js";

export default class WaymarkLine extends WaymarkOverlay {
  constructor(feature) {
    super(feature);

    // Default to empty geometry if none provided
    this.feature.geometry = this.feature.geometry || {
      type: "LineString",
      coordinates: [],
    };
  }

  toStyle() {
    const waymarkPaint = this.feature.properties.waymark?.paint || {};

    return {
      id: this.id,
      type: "line",
      source: this.id,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": getRandomHexColour(),
        "line-width": 3,
        ...waymarkPaint,
      },
    };
  }

  getLengthString() {
    let out = "";

    out += "Length: ";

    // Round to 2 DP
    const lengthValue = length(this.feature, {
      units: "kilometers",
    });
    out += Math.round(lengthValue * 100) / 100;
    out += "km";

    return out;
  }

  hasElevationData() {
    return this.getLinePositions().some((coord) => coord.length === 3);
  }

  getElevationString() {
    if (!this.hasElevationData()) {
      return "";
    }

    // For the linestring, calculate elevation gain, loss, max and min
    const coords = this.getLinePositions();
    if (coords.length === 0) {
      return "";
    }
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxElevation = coords[0][2];
    let minElevation = coords[0][2];
    for (let i = 1; i < coords.length; i++) {
      const elevationChange = coords[i][2] - coords[i - 1][2];
      if (elevationChange > 0) {
        elevationGain += elevationChange;
      } else {
        elevationLoss -= elevationChange; // elevationChange is negative here
      }
      maxElevation = Math.max(maxElevation, coords[i][2]);
      minElevation = Math.min(minElevation, coords[i][2]);
    }

    return (
      "Elevation Gain: " +
      Math.round(elevationGain * 10) / 10 +
      "m" +
      ", Loss: " +
      Math.round(elevationLoss * 10) / 10 +
      "m" +
      ", Max: " +
      Math.round(maxElevation * 10) / 10 +
      "m" +
      ", Min: " +
      Math.round(minElevation * 10) / 10 +
      "m"
    );
  }

  getBounds() {
    const coords = this.getLinePositions();
    if (!coords.length) {
      return new LngLatBounds([0, 0], [0, 0]);
    }

    return coords.reduce(
      (b, coord) => b.extend({ lng: coord[0], lat: coord[1] }),
      new LngLatBounds(
        { lng: coords[0][0], lat: coords[0][1] },
        { lng: coords[0][0], lat: coords[0][1] },
      ),
    );
  }

  getCoordsString() {
    // Use layer to get the bounds and return the centre
    const bounds = this.getBounds();
    const center = bounds.getCenter();
    return (
      "Centre Lat,Lng: " + center.lat.toFixed(6) + ", " + center.lng.toFixed(6)
    );
  }

  flyTo() {
    const bounds = this.getBounds();
    this.mapLibreMap.fitBounds(bounds, flyToOptions);
  }

  inBounds(bounds) {
    // Check if any part of the line is within the map bounds
    const coords = this.getLinePositions();
    return coords.some((coord) =>
      bounds.contains({ lng: coord[0], lat: coord[1] }),
    );
  }

  zoomIn() {
    // Zoom to 18
    const targetZoom = 16;
    const currentZoom = this.mapLibreMap.getZoom();

    if (currentZoom < targetZoom) {
      const coords = this.getLinePositions();
      const center = coords.length ? coords[0] : [0, 0];
      this.mapLibreMap.flyTo({
        center: [center[0], center[1]],
        zoom: targetZoom,
        ...flyToOptions,
      });
    }
  }

  getLinePositions() {
    const geom = this.feature.geometry;
    if (geom.type === "MultiLineString") {
      return geom.coordinates.reduce((acc, line) => acc.concat(line), []);
    }
    return geom.coordinates || [];
  }

  customizeHighlight(highlightLayer) {
    highlightLayer.paint["line-color"] = waymarkPrimaryColour;
    highlightLayer.paint["line-width"] += 2;
  }
}
