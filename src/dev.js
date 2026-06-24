import { createInstance } from "./entry.js";
import {
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_REUSED_EVENT,
  WAYMARK_MAP_LOAD_EVENT,
  WAYMARK_MAP_MOVEEND_EVENT,
  WAYMARK_MAP_PITCHEND_EVENT,
  WAYMARK_MAP_ROTATEEND_EVENT,
  WAYMARK_MAP_ZOOMEND_EVENT,
} from "./core/createInstanceEvents.js";

const DEV_INSTANCE_CONTAINER_EVENTS = [
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_REUSED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_MAP_LOAD_EVENT,
  WAYMARK_MAP_MOVEEND_EVENT,
  WAYMARK_MAP_ZOOMEND_EVENT,
  WAYMARK_MAP_ROTATEEND_EVENT,
  WAYMARK_MAP_PITCHEND_EVENT,
];

function attachDevContainerEventLogging(instance, label) {
  for (const eventType of DEV_INSTANCE_CONTAINER_EVENTS) {
    instance.on(eventType, (event) => {
      console.info(`[waymark:dev:event] ${label} ${event.type}`);
    });
  }
}

const mapContainer = document.getElementById("map");

if (!mapContainer) {
  throw new Error("Dev map container #map was not found");
}

const secondMapContainer = document.createElement("div");
secondMapContainer.id = "map-two";
document.body.appendChild(secondMapContainer);

document.body.style.display = "flex";
document.body.style.flexDirection = "column";

mapContainer.style.height = "50vh";
secondMapContainer.style.height = "50vh";

const waymarkInstance = createInstance("map", {
  map: {
    options: {
      center: [-128.0094, 50.6539],
      zoom: 15,
      style: {
        version: 8,
        sources: {
          raster: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-raster",
            type: "raster",
            source: "raster",
          },
        ],
      },
    },
  },
});

const waymarkInstanceTwo = createInstance("map-two", {
  map: {
    options: {
      center: [-0.1276, 51.5074],
      zoom: 11,
      style: {
        version: 8,
        sources: {
          raster: {
            type: "raster",
            tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              "Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap",
          },
        },
        layers: [
          {
            id: "opentopo-raster",
            type: "raster",
            source: "raster",
          },
        ],
      },
    },
  },
});

attachDevContainerEventLogging(waymarkInstance, "map");
attachDevContainerEventLogging(waymarkInstanceTwo, "map-two");

// Expose for browser tests and debugging
window.createWaymarkInstance = createInstance;
window.waymarkInstance = waymarkInstance;
window.waymarkInstanceTwo = waymarkInstanceTwo;
