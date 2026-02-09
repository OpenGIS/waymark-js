import bbox from "@turf/bbox";

export default class GeoJSONFeatureCollection {
  constructor(featureCollection = {}) {
    this.type = "FeatureCollection";
    this.id = featureCollection.id || null;
    this.properties = featureCollection.properties || {};
    this.features = Array.isArray(featureCollection.features)
      ? featureCollection.features
      : [];
  }

  get bbox() {
    return this.features.length > 0
      ? bbox({
          type: "FeatureCollection",
          features: this.features,
        })
      : null;
  }

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      bbox: this.bbox,
      properties: this.properties,
      features: this.features,
    };
  }
}
