import { length } from "@turf/length";
import { waymarkPrimaryColour } from "@/helpers/Common.js";
import { getFeatureType, getFeatureImages } from "@/helpers/Overlay.js";
import { flyToOptions, fitBoundsOptions } from "@/helpers/MapLibre.js";
import { LngLatBounds, Marker, Popup } from "maplibre-gl";

export class Overlay {
  constructor(feature, id = null) {
    if (!feature || feature.type !== "Feature") {
      throw new Error("Valid GeoJSON Feature required");
    }
    this.feature = feature;

    if (id == null || typeof id !== "string") {
      throw new Error("Valid ID string required");
    }
    this.id = id;

    this.featureType = getFeatureType(this.feature) || null;
    this.feature.properties = this.feature.properties || {};
    this.title = this.feature.properties.title || "";
    this.description = this.feature.properties.description || "";
    this.images = getFeatureImages(this.feature);

    // Get Type
    this.popup = this.createPopup();
  }

  async addTo(map) {
    // Must be valid MapLibre map
    if (!map || !map.addLayer) {
      return;
    }

    this.map = map;

    // Add an image to use as a custom marker
    // const image = await this.map.loadImage(
    //   `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 368 368'%3E%3Cg transform='translate(0,368) scale(0.1,-0.1)'%0Afill='%23b42714'%3E%3Cpath d='M343 3186 c-89 -29 -178 -108 -215 -194 -80 -181 21 -408 208 -468%0Al51 -17 238 -781 c131 -430 241 -787 243 -793 3 -10 -21 -13 -99 -14 -57 0%0A-126 -4 -152 -7 l-48 -7 298 -217 c163 -119 299 -216 300 -214 6 6 252 690%0A249 693 -1 2 -59 -33 -129 -77 -70 -43 -128 -76 -130 -72 -2 4 -111 359 -242%0A790 l-239 782 32 33 c17 17 43 59 59 92 23 50 27 74 28 140 0 71 -4 88 -33%0A147 -37 75 -96 133 -170 169 -58 28 -186 36 -249 15z'/%3E%3Cpath d='M1580 2987 l-294 -212 64 -6 c36 -4 105 -7 153 -8 87 -1 88 -1 81%0A-23 -3 -13 -74 -236 -156 -496 l-150 -473 55 -199 c30 -110 62 -206 70 -215%0A19 -18 41 -19 54 -2 5 6 101 303 214 659 112 356 207 648 210 648 3 0 57 -33%0A120 -73 63 -40 120 -76 126 -81 7 -4 -17 78 -53 181 -36 103 -91 261 -122 351%0A-31 89 -61 162 -67 161 -5 0 -143 -96 -305 -212z'/%3E%3Cpath d='M3040 2987 l-294 -212 64 -6 c36 -4 105 -7 153 -8 87 -1 88 -1 81%0A-23 -3 -13 -74 -236 -156 -496 l-150 -473 55 -199 c30 -110 62 -206 70 -215%0A19 -18 41 -19 54 -2 5 6 101 303 214 659 112 356 207 648 210 648 3 0 57 -33%0A120 -73 63 -40 120 -76 126 -81 7 -4 -17 78 -53 181 -36 103 -91 261 -122 351%0A-31 89 -61 162 -67 161 -5 0 -143 -96 -305 -212z'/%3E%3Cpath d='M2161 2342 c-14 -11 -40 -80 -81 -207 -33 -104 -60 -197 -60 -205 0%0A-8 61 -235 135 -504 74 -270 135 -491 135 -493 0 -1 -68 -4 -152 -5 l-152 -3%0A284 -219 c157 -121 290 -223 295 -227 7 -5 58 113 144 332 73 187 131 342 129%0A344 -2 3 -61 -29 -130 -69 l-126 -73 -47 166 c-25 91 -108 390 -183 664 -94%0A338 -143 502 -154 508 -11 6 -23 3 -37 -9z'/%3E%3C/g%3E%3C/svg%3E%0A`,
    // );
    // this.map.addImage("marker-icon", image.data);

    // Create Source
    this.map.addSource(this.id, {
      type: "geojson",
      data: this.feature,
    });
    this.source = this.map.getSource(this.id);

    // Create Layer
    this.style = this.toStyle();
    this.map.addLayer(this.style);
    this.layer = this.map.getLayer(this.id);

    // Additional
    switch (true) {
      case this instanceof MarkerOverlay:
        break;
      case this instanceof LineOverlay:
        break;
      case this instanceof ShapeOverlay:
        this.addStroke();
        break;
    }

    // Add events
    this.addEvents();
  }

  remove() {
    if (!this.map) {
      return;
    }
    if (this instanceof MarkerOverlay) {
      if (this.marker) {
        this.marker.remove();
        this.marker = null;
      }
    }
    if (this instanceof ShapeOverlay) {
      if (this.map.getLayer(`${this.id}-stroke`)) {
        this.map.removeLayer(`${this.id}-stroke`);
      }
    }
    if (this.map.getLayer(this.id)) {
      this.map.removeLayer(this.id);
    }
    if (this.map.getSource(this.id)) {
      this.map.removeSource(this.id);
    }
    this.map = null;
    this.source = null;
    this.layer = null;
    this.style = null;
  }

  toGeoJSON() {
    return this.feature;
  }

  hasImage() {
    return (
      this.feature.properties.image_thumbnail_url ||
      this.feature.properties.image_medium_url ||
      this.feature.properties.image_large_url
    );
  }

  getImage(size = "thumbnail") {
    return this.images[size];
  }

  getTitle() {
    return this.title;
  }

  getDescription() {
    return this.description;
  }

  containsText(text = "") {
    let matches = 0;

    // Text included in type title
    matches += this.type
      .getTitle()
      .toString()
      .toLowerCase()
      .includes(text.toLowerCase());

    // Check all GeoJSON properties VALUES (not keys) for existence of filter text
    matches += Object.values(this.feature.properties).some((p) => {
      return p.toString().toLowerCase().includes(text.toLowerCase());
    });

    return matches > 0;
  }

  zoomIn() {
    if (!this.map) {
      return;
    }

    // Zoom to 18
    const targetZoom = 16;
    const currentZoom = this.map.getZoom();

    if (currentZoom < targetZoom) {
      this.map.flyTo({
        center: [
          this.feature.geometry.coordinates[0],
          this.feature.geometry.coordinates[1],
        ],
        zoom: targetZoom,
        ...flyToOptions,
      });
    }
  }

  createPopup() {
    // Create popup content
    const popupContent = document.createElement("div");
    popupContent.className = "waymark-popup-content";

    if (this.getTitle()) {
      const titleEl = document.createElement("h3");
      titleEl.textContent = this.getTitle();
      popupContent.appendChild(titleEl);
    }

    if (this.getDescription()) {
      const descEl = document.createElement("p");
      descEl.textContent = this.getDescription();
      popupContent.appendChild(descEl);
    }

    // Create popup
    return new Popup({ offset: 25 }).setDOMContent(popupContent);
  }

  openPopup() {
    if (!this.map) {
      return;
    }

    //Add to center of bounds
    const bounds = this.getBounds();
    const center = bounds.getCenter();

    this.popup.setLngLat([center.lng, center.lat]).addTo(this.map);
  }
}

export class MarkerOverlay extends Overlay {
  constructor(feature, id) {
    super(feature, id);
  }

  // GeoJson point
  toStyle() {
    return {
      id: this.id,
      type: "circle",
      source: this.id,
      paint: {
        "circle-radius": 8,
        "circle-color":
          this.feature.properties.waymark?.marker_colour || "#ffffff",
        "circle-stroke-color": "#000000",
        "circle-stroke-width": 2,
      },
    };
  }

  addEvents() {}

  show() {
    if (this.marker) {
      this.marker.getElement().style.visibility = "visible";
    }
  }

  hide() {
    if (this.marker) {
      this.marker.getElement().style.visibility = "hidden";
    }
  }

  hasElevationData() {
    // Check if feature coordinates has third dimension (elevation)
    return this.feature.geometry.coordinates.length === 3;
  }

  getElevationString() {
    if (!this.hasElevationData()) {
      return "";
    }

    // Return elevation value from coordinates, rounded to 1 decimal place
    return (
      "Elevation: " +
      Math.round(this.feature.geometry.coordinates[2] * 10) / 10 +
      "m"
    );
  }

  getBounds() {
    return new LngLatBounds(
      [
        this.feature.geometry.coordinates[0],
        this.feature.geometry.coordinates[1],
      ],
      [
        this.feature.geometry.coordinates[0],
        this.feature.geometry.coordinates[1],
      ],
    );
  }

  getCoordsString() {
    // For marker, return the coordinates as a string
    return (
      "Lat,Lng: " +
      this.feature.geometry.coordinates[1].toFixed(6) +
      ", " +
      this.feature.geometry.coordinates[0].toFixed(6)
    );
  }

  addHighlight() {
    // Get marker
    const element = this.marker.getElement();
    const background = element.querySelector(".waymark-marker-background");
    if (background) {
      // Change background border colour
      background.style.borderColor = waymarkPrimaryColour;
    }

    // Add active class
    element.classList.add("waymark-active");
  }

  removeHighlight() {
    // Get marker
    const element = this.marker.getElement();

    // Remove active class
    element.classList.remove("waymark-active");
  }

  flyTo() {
    this.map.flyTo({
      center: [
        this.feature.geometry.coordinates[0],
        this.feature.geometry.coordinates[1],
      ],
      ...flyToOptions,
    });
  }

  inBounds(bounds) {
    return bounds.contains({
      lng: this.feature.geometry.coordinates[0],
      lat: this.feature.geometry.coordinates[1],
    });
  }
}

export class LineOverlay extends Overlay {
  constructor(feature, id) {
    super(feature, id);
  }

  toStyle() {
    return {
      id: this.id,
      type: "line",
      source: this.id,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color":
          this.feature.properties.waymark?.lline_colour || "#000000",
        "line-width":
          parseFloat(this.feature.properties.waymark?.line_weight) || 2,
      },
    };
  }

  addEvents() {
    // Cursor pointer on hover
    this.map.on("mouseenter", this.id, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });
    this.map.on("mouseleave", this.id, () => {
      this.map.getCanvas().style.cursor = "";
    });
  }

  show() {
    if (this.map.getLayer(this.id)) {
      this.map.setLayoutProperty(this.id, "visibility", "visible");
    }
  }

  hide() {
    if (this.map.getLayer(this.id)) {
      this.map.setLayoutProperty(this.id, "visibility", "none");
    }
  }

  getLengthString() {
    let out = "";

    out += "Length: ";

    // Round to 2 DP
    const lengthValue = length(this.feature, {
      units: "kilometers",
    });
    out += Math.round(lengthValue * 100) / 100;
    out += "km";

    return out;
  }

  hasElevationData() {
    return this.getLinePositions().some((coord) => coord.length === 3);
  }

  getElevationString() {
    if (!this.hasElevationData()) {
      return "";
    }

    // For the linestring, calculate elevation gain, loss, max and min
    const coords = this.getLinePositions();
    if (coords.length === 0) {
      return "";
    }
    let elevationGain = 0;
    let elevationLoss = 0;
    let maxElevation = coords[0][2];
    let minElevation = coords[0][2];
    for (let i = 1; i < coords.length; i++) {
      const elevationChange = coords[i][2] - coords[i - 1][2];
      if (elevationChange > 0) {
        elevationGain += elevationChange;
      } else {
        elevationLoss -= elevationChange; // elevationChange is negative here
      }
      maxElevation = Math.max(maxElevation, coords[i][2]);
      minElevation = Math.min(minElevation, coords[i][2]);
    }

    return (
      "Elevation Gain: " +
      Math.round(elevationGain * 10) / 10 +
      "m" +
      ", Loss: " +
      Math.round(elevationLoss * 10) / 10 +
      "m" +
      ", Max: " +
      Math.round(maxElevation * 10) / 10 +
      "m" +
      ", Min: " +
      Math.round(minElevation * 10) / 10 +
      "m"
    );
  }

  getBounds() {
    const coords = this.getLinePositions();
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

  addHighlight() {
    // Add a new highlight layer below this layer that has the highlight style
    this.map.addLayer(
      {
        id: `${this.id}-highlight`,
        type: "line",
        source: this.id,
        layout: {},
        paint: {
          "line-color": waymarkPrimaryColour,
          "line-width":
            parseFloat(this.feature.properties.waymark?.line_weight) + 2,
        },
      },
      this.id,
    );
  }

  removeHighlight() {
    // Remove highlight layer
    if (this.map.getLayer(`${this.id}-highlight`)) {
      this.map.removeLayer(`${this.id}-highlight`);
    }
  }

  flyTo() {
    const bounds = this.getBounds();
    this.map.fitBounds(bounds, flyToOptions);
  }

  inBounds(bounds) {
    // Check if any part of the line is within the map bounds
    const coords = this.getLinePositions();
    return coords.some((coord) =>
      bounds.contains({ lng: coord[0], lat: coord[1] }),
    );
  }

  zoomIn() {
    // Zoom to 18
    const targetZoom = 16;
    const currentZoom = this.map.getZoom();

    if (currentZoom < targetZoom) {
      const coords = this.getLinePositions();
      const center = coords.length ? coords[0] : [0, 0];
      this.map.flyTo({
        center: [center[0], center[1]],
        zoom: targetZoom,
        ...flyToOptions,
      });
    }
  }

  getLinePositions() {
    const geom = this.feature.geometry;
    if (geom.type === "MultiLineString") {
      return geom.coordinates.reduce((acc, line) => acc.concat(line), []);
    }
    return geom.coordinates || [];
  }
}

export class ShapeOverlay extends Overlay {
  constructor(feature, id) {
    super(feature, id);
  }

  toStyle() {
    return {
      id: this.id,
      type: "fill",
      source: this.id,
      layout: {},
      paint: {
        "fill-color":
          this.feature.properties.waymark?.shape_colour || "#000000",
        "fill-opacity":
          parseFloat(this.feature.properties.waymark?.fill_opacity) || 0.5,
        "fill-outline-color":
          this.feature.properties.waymark?.shape_colour || "#000000",
      },
    };
  }

  show() {
    if (this.map.getLayer(this.id)) {
      this.map.setLayoutProperty(this.id, "visibility", "visible");
    }
    if (this.map.getLayer(`${this.id}-stroke`)) {
      this.map.setLayoutProperty(`${this.id}-stroke`, "visibility", "visible");
    }
  }

  hide() {
    if (this.map.getLayer(this.id)) {
      this.map.setLayoutProperty(this.id, "visibility", "none");
    }
    if (this.map.getLayer(`${this.id}-stroke`)) {
      this.map.setLayoutProperty(`${this.id}-stroke`, "visibility", "none");
    }
  }

  addStroke() {
    this.map.addLayer({
      id: `${this.id}-stroke`,
      type: "line",
      source: this.id,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color":
          this.feature.properties.waymark?.shape_colour || "#000000",
        "line-width": 1,
        "line-opacity": 1,
      },
    });
  }

  addEvents() {
    // Cursor pointer on hover
    this.map.on("mouseenter", this.id, () => {
      this.map.getCanvas().style.cursor = "pointer";
    });
    this.map.on("mouseleave", this.id, () => {
      this.map.getCanvas().style.cursor = "";
    });
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

  addHighlight() {
    // Add highlight layer above the stroke layer
    this.map.addLayer({
      id: `${this.id}-highlight`,
      type: "line",
      source: this.id,
      layout: {},
      paint: {
        "line-color": waymarkPrimaryColour,
        "line-width": 2,
      },
    });
  }

  removeHighlight() {
    // Remove highlight layer
    if (this.map.getLayer(`${this.id}-highlight`)) {
      this.map.removeLayer(`${this.id}-highlight`);
    }
  }

  zoomIn() {
    const bounds = this.getBounds();
    const center = bounds.getCenter();
    this.map.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(this.map.getZoom(), 16),
      ...flyToOptions,
    });
  }

  getPolygonPositions() {
    const geom = this.feature.geometry;
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
    this.map.fitBounds(bounds, flyToOptions);
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
}
