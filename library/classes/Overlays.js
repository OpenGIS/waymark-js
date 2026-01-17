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
    this.typeKey = this.getTypeKey() || null;
    this.popup = this.createPopup();

    if (!this.type) {
      console.error(
        `Type not found for ${featureType} Type ${typeKey}`,
        feature,
      );
      return;
    }
  }

  addTo(map) {
    // Must be valid MapLibre map
    if (!map || !map.addLayer) {
      return;
    }

    this.map = map;

    // Create Source
    this.map.addSource(this.id, {
      type: "geojson",
      data: this.feature,
    });
    this.source = this.map.getSource(this.id);

    // Create Layer
    if (this instanceof MarkerOverlay) {
      this.marker = this.toMarker();
      this.marker.addTo(this.map);
    } else {
      this.style = this.toStyle();
      this.map.addLayer(this.style);
    }
    this.layer = this.map.getLayer(this.id);

    if (this instanceof ShapeOverlay) {
      this.addStroke();
    }

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

  getTypeKey() {
    if (
      !this.feature.properties.type ||
      typeof this.feature.properties.type !== "string"
    ) {
      return null;
    }

    return this.feature.properties.type;
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

  toMarker() {
    // Create a DOM element for the marker
    const el = document.createElement("div");
    el.className = this.type.iconData.className;
    el.innerHTML = this.type.iconData.html;
    el.style.width = `${this.type.iconData.iconSize[0]}px`;
    el.style.height = `${this.type.iconData.iconSize[1]}px`;

    // Create Marker
    const marker = new Marker({
      element: el,
      offset: this.type.iconData.iconAnchor,
    });

    marker.setLngLat(this.feature.geometry.coordinates);

    return marker;
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
        "line-color": this.type.getPrimaryColour(),
        "line-width": parseFloat(this.type.data.line_weight),
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
          "line-width": parseFloat(this.type.data.line_weight) + 2,
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
        "fill-color": this.type.data.shape_colour || "#000000",
        "fill-opacity": parseFloat(this.type.data.fill_opacity) || 0.5,
        "fill-outline-color": this.type.data.shape_colour || "#000000",
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
        "line-color": this.type.data.shape_colour || "#000000",
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
