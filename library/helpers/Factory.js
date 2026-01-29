import { reactive } from "vue";
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
  return reactive(new WaymarkMap(geoJSON));
}

export function createOverlay(feature) {
  if (!feature.type) {
    return;
  }

  switch (getFeatureType(feature)) {
    case "marker":
      return reactive(new WaymarkMarker(feature));
    case "line":
      return reactive(new WaymarkLine(feature));
    case "shape":
      return reactive(new WaymarkShape(feature));
    default:
      throw new Error("Unsupported feature type for overlay creation");
  }
}

export function createMarker(feature) {
  return reactive(new WaymarkMarker(feature));
}

export function createLine(feature) {
  return reactive(new WaymarkLine(feature));
}

export function createShape(feature) {
  return reactive(new WaymarkShape(feature));
}
