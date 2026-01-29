import WaymarkOverlay from "@/classes/Overlays/Overlay.js";
import { LngLatBounds } from "maplibre-gl";
import { flyToOptions } from "@/helpers/MapLibre.js";
import { waymarkPrimaryColour } from "@/helpers/Common.js";

export default class WaymarkShape extends WaymarkOverlay {
  constructor(feature = {}) {
    // Default to empty geometry if none provided
    feature.geometry = feature.geometry || {
      type: "Polygon",
      coordinates: [],
    };

    super(feature);

    this.strokeLayer = null;
  }

  addTo(map) {
    super.addTo(map);

    if (!this.strokeLayer) {
      this.mapLibreMap.addLayer(this.strokeStyle());
      this.strokeLayer = this.mapLibreMap.getLayer(`${this.id}-stroke`);
    }
  }

  remove() {
    if (this.mapLibreMap) {
      if (this.strokeLayer) {
        this.mapLibreMap.removeLayer(`${this.id}-stroke`);
      }
    }
    super.remove();
  }

  toStyle() {
    const waymarkPaint = this.properties.waymark?.paint || {};

    return {
      id: this.id,
      type: "fill",
      source: this.id,
      layout: {},
      paint: {
        "fill-color": "#000000",
        "fill-opacity": 0.2,
        "fill-outline-color": "#000000",
        ...waymarkPaint,
      },
    };
  }

  show() {
    if (this.mapLibreMap.getLayer(this.id)) {
      this.mapLibreMap.setLayoutProperty(this.id, "visibility", "visible");
    }
    if (this.strokeLayer) {
      this.mapLibreMap.setLayoutProperty(
        `${this.id}-stroke`,
        "visibility",
        "visible",
      );
    }
  }

  hide() {
    if (this.mapLibreMap.getLayer(this.id)) {
      this.mapLibreMap.setLayoutProperty(this.id, "visibility", "none");
    }
    if (this.strokeLayer) {
      this.mapLibreMap.setLayoutProperty(
        `${this.id}-stroke`,
        "visibility",
        "none",
      );
    }
  }

  strokeStyle() {
    return {
      id: `${this.id}-stroke`,
      type: "line",
      source: this.id,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": this.properties.waymark?.shape_colour || "#000000",
        "line-width": 1,
        "line-opacity": 1,
      },
    };
  }

  hasElevationData() {
    return this.getPolygonPositions().some((coord) => coord.length === 3);
  }

  getElevationString() {
    if (!this.hasElevationData()) {
      return "";
    }

    return "Elevation data available";
  }

  getBounds() {
    const coords = this.getPolygonPositions();
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

  zoomIn() {
    const bounds = this.getBounds();
    const center = bounds.getCenter();
    this.mapLibreMap.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(this.mapLibreMap.getZoom(), 16),
      ...flyToOptions,
    });
  }

  getPolygonPositions() {
    const geom = this.geometry;
    if (geom.type === "MultiPolygon") {
      return geom.coordinates.reduce((acc, polygon) => {
        polygon.forEach((ring) => acc.push(...ring));
        return acc;
      }, []);
    }

    return geom.coordinates
      ? geom.coordinates.reduce((acc, ring) => acc.concat(ring), [])
      : [];
  }

  flyTo() {
    const bounds = this.getBounds();
    this.mapLibreMap.fitBounds(bounds, flyToOptions);
  }

  inBounds(bounds) {
    // Check if shape bounds and provided bounds overlap
    const shapeBounds = this.getBounds();

    // Manually check for overlap
    return !(
      shapeBounds.getNorth() < bounds.getSouth() ||
      shapeBounds.getSouth() > bounds.getNorth() ||
      shapeBounds.getEast() < bounds.getWest() ||
      shapeBounds.getWest() > bounds.getEast()
    );
  }

  getHighlightStyle() {
    return this.strokeStyle();
  }

  customizeHighlight(highlightLayer) {
    highlightLayer.paint["line-color"] = waymarkPrimaryColour;
    highlightLayer.paint["line-width"] += 2;
  }
}
