export const featureTypes = ["marker", "line", "shape"];

export function getFeatureType(feature = {}) {
  // Ensure there is a feature & geometry
  if (!feature || !feature.geometry) {
    return null;
  }

  switch (feature.geometry.type) {
    case "Point":
    case "MultiPoint":
      return "marker";
    case "LineString":
    case "MultiLineString":
      return "line";
    case "Polygon":
    case "MultiPolygon":
      return "shape";
    default:
      return null;
  }
}
