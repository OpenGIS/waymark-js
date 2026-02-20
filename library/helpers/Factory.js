import { getFeatureType } from "@/helpers/Overlay.js";
import WaymarkMarker from "@/classes/Overlays/Marker.js";
import WaymarkLine from "@/classes/Overlays/Line.js";
import WaymarkShape from "@/classes/Overlays/Shape.js";
import WaymarkMap from "@/classes/Map.js";
import WaymarkInstance from "@/classes/Instance.js";

export function createInstance(config = {}) {
  try {
    return new WaymarkInstance(config);
  } catch (error) {
    console.error("[Waymark]", error);
  }
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
      return new WaymarkMarker(feature);
    case "line":
      return new WaymarkLine(feature);
    case "shape":
      return new WaymarkShape(feature);
    default:
      console.warn("[Waymark] Unsupported geometry type:", feature.geometry.type);
      return null;
  }
}

export function createMarker(feature) {
  return new WaymarkMarker(feature);
}

export function createLine(feature) {
  return new WaymarkLine(feature);
}

export function createShape(feature) {
  return new WaymarkShape(feature);
}
