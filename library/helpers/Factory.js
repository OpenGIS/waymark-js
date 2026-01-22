import { getFeatureType } from "@/helpers/Overlay.js";
import { MarkerOverlay } from "@/classes/Overlays/Marker.js";
import { LineOverlay } from "@/classes/Overlays/Line.js";
import { ShapeOverlay } from "@/classes/Overlays/Shape.js";
import WaymarkMap from "@/classes/Map.js";
import WaymarkInstance from "@/classes/Instance.js";

export function createInstance(config = {}) {
  return new WaymarkInstance(config);
}

export function createMap(geoJSON) {
  return new WaymarkMap(geoJSON);
}

export function createOverlay(feature) {
  if (!feature.type) {
    return;
  }

  switch (getFeatureType(feature)) {
    case "marker":
      return new MarkerOverlay(feature);
    case "line":
      return new LineOverlay(feature);
    case "shape":
      return new ShapeOverlay(feature);
    default:
      throw new Error("Unsupported feature type for overlay creation");
  }
}
