export default class GeoJSONFeature {
  constructor(feature = {}) {
    this.type = feature.type || "Feature";
    this.id = feature.id || null;
    this.properties = feature.properties || {};
    this.geometry = feature.geometry || {
      type: null,
      coordinates: [],
    };

    return this;
  }

  toJSON() {
    return this;
  }
}
