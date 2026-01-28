// import bbox from "@turf/bbox";

export default class GeoJSONFeatureCollection {
  constructor(featureCollection = {}) {
    this.type = "FeatureCollection";
    this.id = featureCollection.id || null;
    this.properties = featureCollection.properties || {};
    this.features = Array.isArray(featureCollection.features)
      ? featureCollection.features
      : [];

    return this;
  }

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      // bbox: bbox(this),
      properties: this.properties,
      features: this.features,
    };
  }
}
