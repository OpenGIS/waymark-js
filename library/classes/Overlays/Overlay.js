import { ulid } from "ulid";
import { getFeatureType, getFeatureImages } from "@/helpers/Overlay.js";
import { flyToOptions } from "@/helpers/MapLibre.js";
import { Popup } from "maplibre-gl";

export default class WaymarkOverlay {
  constructor(feature) {
    if (!feature || feature.type !== "Feature") {
      throw new Error("Valid GeoJSON Feature required");
    }
    this.feature = feature;

    this.id = ulid();
    this.featureType = getFeatureType(this.feature) || null;
    this.feature.properties = this.feature.properties || {};
    this.title = this.feature.properties.title || "";
    this.description = this.feature.properties.description || "";
    this.images = getFeatureImages(this.feature);
    this.waymarkMap = null;
    this.mapLibreMap = null;
    this.active = false;

    // Get Type
    this.popup = this.createPopup();
  }

  toJSON() {
    return feature;
  }

  setMap(waymarkMap) {
    this.waymarkMap = waymarkMap;
  }

  setActive(active = true) {
    this.active = active;

    if (this.active) {
      this.showHighlight();
    } else {
      this.hideHighlight();
    }
  }

  addEvents() {
    // Hover
    this.mapLibreMap.on("mouseenter", this.id, () => {
      // Change cursor to pointer
      this.mapLibreMap.getCanvas().style.cursor = "pointer";

      // Don't modify highlight if active
      if (this.active) {
        return;
      }

      // Show highlight
      this.showHighlight();
    });
    this.mapLibreMap.on("mouseleave", this.id, () => {
      this.mapLibreMap.getCanvas().style.cursor = "";

      if (this.active) {
        return;
      }

      this.hideHighlight();
    });
  }

  addTo(map) {
    // Must be valid MapLibre map
    if (!map || !map.addLayer) {
      return;
    }

    this.mapLibreMap = map;

    // Create Source
    this.mapLibreMap.addSource(this.id, {
      type: "geojson",
      data: this.feature,
    });
    this.source = this.mapLibreMap.getSource(this.id);

    // Create Layer
    this.style = this.toStyle();
    this.mapLibreMap.addLayer(this.style);
    this.layer = this.mapLibreMap.getLayer(this.id);

    // Create Highlight Layer
    this.highlightLayer = this.addHighlightLayer();

    // Add events
    this.addEvents();
  }

  remove() {
    if (!this.mapLibreMap) {
      return;
    }

    // Remove highlight
    if (this.mapLibreMap.getLayer(`${this.id}-highlight`)) {
      this.mapLibreMap.removeLayer(`${this.id}-highlight`);
    }

    if (this.mapLibreMap.getLayer(this.id)) {
      this.mapLibreMap.removeLayer(this.id);
    }

    if (this.mapLibreMap.getSource(this.id)) {
      this.mapLibreMap.removeSource(this.id);
    }

    this.mapLibreMap = null;
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

    // Check all GeoJSON properties VALUES (not keys) for existence of filter text
    matches += Object.values(this.feature.properties).some((p) => {
      return p.toString().toLowerCase().includes(text.toLowerCase());
    });

    return matches > 0;
  }

  zoomIn() {
    if (!this.mapLibreMap) {
      return;
    }

    // Zoom to 18
    const targetZoom = 16;
    const currentZoom = this.mapLibreMap.getZoom();

    if (currentZoom < targetZoom) {
      this.mapLibreMap.flyTo({
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
    if (!this.getTitle() && !this.getDescription()) {
      return null;
    }

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
    return new Popup({}).setDOMContent(popupContent);
  }

  openPopup() {
    if (!this.mapLibreMap || !this.popup) {
      return;
    }

    //Add to center of bounds
    const bounds = this.getBounds();
    const center = bounds.getCenter();

    this.popup.setLngLat([center.lng, center.lat]).addTo(this.mapLibreMap);
  }

  show() {
    if (this.mapLibreMap.getLayer(this.id)) {
      this.mapLibreMap.setLayoutProperty(this.id, "visibility", "visible");
    }
  }

  hide() {
    if (this.mapLibreMap.getLayer(this.id)) {
      this.mapLibreMap.setLayoutProperty(this.id, "visibility", "none");
    }
  }

  addHighlightLayer() {
    const layerStyle = this.getHighlightStyle();
    const highlightLayer = {
      id: `${this.id}-highlight`,
      type: layerStyle.type,
      source: this.id,
      layout: layerStyle.layout || {},
      paint: layerStyle.paint || {},
    };

    // Different for each overlay type
    this.customizeHighlight(highlightLayer);

    this.mapLibreMap.addLayer(
      highlightLayer,
      this.id, // Before this layer
    );

    // Set visibility to none initially
    this.mapLibreMap.setLayoutProperty(highlightLayer.id, "visibility", "none");

    return highlightLayer;
  }

  isHighlighted() {
    if (this.mapLibreMap.getLayer(`${this.id}-highlight`)) {
      return (
        this.mapLibreMap.getLayoutProperty(
          `${this.id}-highlight`,
          "visibility",
        ) === "visible"
      );
    }

    return false;
  }

  showHighlight() {
    if (this.mapLibreMap.getLayer(`${this.id}-highlight`)) {
      this.mapLibreMap.setLayoutProperty(
        `${this.id}-highlight`,
        "visibility",
        "visible",
      );
    }
  }

  hideHighlight() {
    if (this.mapLibreMap.getLayer(`${this.id}-highlight`)) {
      this.mapLibreMap.setLayoutProperty(
        `${this.id}-highlight`,
        "visibility",
        "none",
      );
    }
  }

  getHighlightStyle() {
    return this.toStyle();
  }

  toggleHighlight() {
    if (this.isHighlighted()) {
      this.hideHighlight();
    } else {
      this.showHighlight();
    }
  }
}
