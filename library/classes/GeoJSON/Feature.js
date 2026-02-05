import bbox from "@turf/bbox";

export default class GeoJSONFeature {
  constructor(feature = {}) {
    this.type = feature.type || "Feature";
    this.id = feature.id || null;
    this.properties = feature.properties || {};
    this.geometry = feature.geometry || {};
    this.geometry.type = this.geometry.type || null;
    this.geometry.coordinates = this.geometry.coordinates || [];

    return this;
  }

  get bbox() {
    if (
      !this.geometry ||
      !this.geometry.type ||
      !this.geometry.coordinates.length
    ) {
      return null;
    }

    return bbox({
      type: "Feature",
      geometry: this.geometry,
    });
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
