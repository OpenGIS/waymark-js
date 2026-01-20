import { getFeatureType, getFeatureImages } from "@/helpers/Overlay.js";
import { flyToOptions } from "@/helpers/MapLibre.js";
import { Popup } from "maplibre-gl";

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

  addEvents() {
    // Hover
    this.map.on("mouseenter", this.id, () => {
      // Change cursor to pointer
      this.map.getCanvas().style.cursor = "pointer";

      // Show highlight
      this.showHighlight();
    });
    this.map.on("mouseleave", this.id, () => {
      this.map.getCanvas().style.cursor = "";
      this.hideHighlight();
    });
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
    this.style = this.toStyle();
    this.map.addLayer(this.style);
    this.layer = this.map.getLayer(this.id);

    // Create Highlight Layer
    this.highlightLayer = this.addHighlightLayer();

    // Add events
    this.addEvents();
  }

  remove() {
    if (!this.map) {
      return;
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
    if (this.type && this.type.getTitle) {
      matches += this.type
        .getTitle()
        .toString()
        .toLowerCase()
        .includes(text.toLowerCase());
    }

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
    if (!this.map || !this.popup) {
      return;
    }

    //Add to center of bounds
    const bounds = this.getBounds();
    const center = bounds.getCenter();

    this.popup.setLngLat([center.lng, center.lat]).addTo(this.map);
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

    this.map.addLayer(
      highlightLayer,
      this.id, // Before this layer
    );

    // Set visibility to none initially
    this.map.setLayoutProperty(highlightLayer.id, "visibility", "none");

    return highlightLayer;
  }

  isHighlighted() {
    if (this.map.getLayer(`${this.id}-highlight`)) {
      return (
        this.map.getLayoutProperty(`${this.id}-highlight`, "visibility") ===
        "visible"
      );
    }

    return false;
  }

  showHighlight() {
    if (this.map.getLayer(`${this.id}-highlight`)) {
      this.map.setLayoutProperty(
        `${this.id}-highlight`,
        "visibility",
        "visible",
      );
    }
  }

  hideHighlight() {
    if (this.map.getLayer(`${this.id}-highlight`)) {
      this.map.setLayoutProperty(`${this.id}-highlight`, "visibility", "none");
    }
  }

  getHighlightStyle() {
    return this.toStyle();
  }
}
