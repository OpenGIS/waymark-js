import bbox from "@turf/bbox";

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

  get bbox() {
    return this.geometry && this.geometry.type
      ? bbox({
          type: "Feature",
          geometry: this.geometry,
        })
      : null;
  }

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      bbox: this.bbox,
      properties: this.properties,
      geometry: this.geometry,
    };
  }
}
