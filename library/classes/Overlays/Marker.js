import WaymarkOverlay from "@/classes/Overlays/Overlay.js";
import { LngLatBounds, Marker } from "maplibre-gl";
import { flyToOptions } from "@/helpers/MapLibre.js";
import { waymarkPrimaryColour, getRandomHexColour } from "@/helpers/Common.js";

export default class WaymarkMarker extends WaymarkOverlay {
  constructor(feature = {}) {
    // Merge defaults ensuring geometry.type is "Point"
    const safeFeature = {
      ...feature,
      geometry: {
        ...(feature.geometry || {}),
        type: "Point",
      },
    };

    super(safeFeature);
  }

  get bbox() {
    return null; // Markers don't have a bounding box
  }

  addTo(map) {
    super.addTo(map);

    const waymarkIcon = this.properties.waymark?.icon;

    if (waymarkIcon) {
      this.addIcon(waymarkIcon);
    }
  }

  remove() {
    if (this.htmlMarker) {
      this.htmlMarker.remove();
      this.htmlMarker = null;
    }

    if (this.mapLibreMap) {
      if (this.mapLibreMap.getLayer(`${this.id}-icon`)) {
        this.mapLibreMap.removeLayer(`${this.id}-icon`);
      }

      if (this.mapLibreMap.hasImage(`${this.id}-icon-img`)) {
        this.mapLibreMap.removeImage(`${this.id}-icon-img`);
      }
    }

    super.remove();
  }

  addIcon(icon) {
    if (!this.mapLibreMap) return;

    if (icon.html) {
      if (this.mapLibreMap.getLayer(`${this.id}-icon`)) {
        this.mapLibreMap.removeLayer(`${this.id}-icon`);
      }

      if (!this.htmlMarker) {
        const el = document.createElement("div");
        el.innerHTML = icon.html;

        el.addEventListener("mouseenter", () => {
          this.mapLibreMap.getCanvas().style.cursor = "pointer";

          if (this.active) {
            return;
          }

          this.showHighlight();
        });

        el.addEventListener("mouseleave", () => {
          this.mapLibreMap.getCanvas().style.cursor = "";

          if (this.active) {
            return;
          }

          this.hideHighlight();
        });

        this.htmlMarker = new Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat(this.geometry.coordinates)
          .addTo(this.mapLibreMap);
      } else {
        const el = this.htmlMarker.getElement();
        if (el.innerHTML !== icon.html) {
          el.innerHTML = icon.html;
        }
        this.htmlMarker.setLngLat(this.geometry.coordinates);
      }

      return;
    } else if (this.htmlMarker) {
      this.htmlMarker.remove();
      this.htmlMarker = null;
    }

    const imageId = `${this.id}-icon-img`;
    const layerId = `${this.id}-icon`;

    // Helper to add layer once image is loaded
    const addLayer = () => {
      if (!this.mapLibreMap) return;

      // If it does not exist
      if (!this.mapLibreMap.getLayer(layerId)) {
        this.mapLibreMap.addLayer({
          id: layerId,
          type: "symbol",
          source: this.id,
          layout: {
            "icon-image": imageId,
            "icon-size": 1, // We assume the image is already sized correctly or user handles scale via width/height logic if we were resizing
            "icon-allow-overlap": true,
            "icon-rotate": icon.rotation || 0,
          },
        });
        // Update
      } else {
        this.mapLibreMap.setLayoutProperty(layerId, "icon-image", imageId);
        this.mapLibreMap.setLayoutProperty(
          layerId,
          "icon-rotate",
          icon.rotation || 0,
        );
      }
    };

    if (icon.url) {
      this.mapLibreMap.loadImage(icon.url, (error, image) => {
        if (error) {
          console.error("Error loading icon:", error);
          return;
        }
        if (!this.mapLibreMap) return;
        if (!this.mapLibreMap.hasImage(imageId)) {
          this.mapLibreMap.addImage(imageId, image);
        }
        addLayer();
      });
    } else if (icon.svg) {
      const img = new Image(icon.width || 32, icon.height || 32);
      img.onload = () => {
        if (!this.mapLibreMap) return;
        if (!this.mapLibreMap.hasImage(imageId)) {
          this.mapLibreMap.addImage(imageId, img);
        }
        addLayer();
      };
      // Encode SVG to handle special characters
      img.src =
        "data:image/svg+xml;charset=utf-8," + encodeURIComponent(icon.svg);
    }
  }

  // GeoJson point
  toStyle() {
    const waymarkPaint = this.properties.waymark?.paint || {};

    return {
      id: this.id,
      type: "circle",
      source: this.id,
      paint: {
        "circle-radius": 3,
        "circle-color": "#ffffff",
        "circle-stroke-color": getRandomHexColour(),
        "circle-stroke-width": 3,
        ...waymarkPaint,
      },
    };
  }

  hasElevationData() {
    // Check if feature coordinates has third dimension (elevation)
    return this.geometry.coordinates.length === 3;
  }

  getElevationString() {
    if (!this.hasElevationData()) {
      return "";
    }

    // Return elevation value from coordinates, rounded to 1 decimal place
    return (
      "Elevation: " + Math.round(this.geometry.coordinates[2] * 10) / 10 + "m"
    );
  }

  getBounds() {
    return new LngLatBounds(
      [this.geometry.coordinates[0], this.geometry.coordinates[1]],
      [this.geometry.coordinates[0], this.geometry.coordinates[1]],
    );
  }

  getCoordsString() {
    // For marker, return the coordinates as a string
    return (
      "Lat,Lng: " +
      this.geometry.coordinates[1].toFixed(6) +
      ", " +
      this.geometry.coordinates[0].toFixed(6)
    );
  }

  flyTo() {
    this.mapLibreMap.flyTo({
      center: [this.geometry.coordinates[0], this.geometry.coordinates[1]],
      ...flyToOptions,
    });
  }

  inBounds(bounds) {
    return bounds.contains({
      lng: this.geometry.coordinates[0],
      lat: this.geometry.coordinates[1],
    });
  }

  customizeHighlight(highlightLayer) {
    highlightLayer.paint["circle-stroke-color"] = waymarkPrimaryColour;
    highlightLayer.paint["circle-stroke-width"] += 2;
  }
}
