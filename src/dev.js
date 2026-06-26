import { createInstance } from "./entry.js";
import {
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_MAP_LOAD_EVENT,
  WAYMARK_MAP_MOVEEND_EVENT,
  WAYMARK_MAP_PITCHEND_EVENT,
  WAYMARK_MAP_ROTATEEND_EVENT,
  WAYMARK_MAP_ZOOMEND_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
} from "./runtime/createInstanceEvents.js";

const DEV_INSTANCE_CONTAINER_EVENTS = [
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_MAP_LOAD_EVENT,
  WAYMARK_MAP_MOVEEND_EVENT,
  WAYMARK_MAP_ZOOMEND_EVENT,
  WAYMARK_MAP_ROTATEEND_EVENT,
  WAYMARK_MAP_PITCHEND_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
];

function attachDevContainerEventLogging(instance, label) {
  for (const eventType of DEV_INSTANCE_CONTAINER_EVENTS) {
    instance.on(eventType, (event) => {
      console.info(`[waymark:dev:event] ${label} ${event.type}`);
    });
  }
}

function createDevModeSelect({ id, labelText }) {
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = `${labelText}: `;

  const select = document.createElement("select");
  select.id = id;

  for (const mode of ["view", "debug"]) {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode;
    select.append(option);
  }

  label.append(select);

  return { label, select };
}

function createDevModeDropdowns() {
  const controls = document.createElement("div");
  controls.id = "dev-controls";
  controls.style.padding = "0.5rem";
  controls.style.background = "#f8f9fb";

  const mapMode = createDevModeSelect({
    id: "dev-instance-mode",
    labelText: "#map ui.mode",
  });
  const mapTwoMode = createDevModeSelect({
    id: "dev-instance-mode-two",
    labelText: "#map-two ui.mode",
  });

  controls.append(mapMode.label, mapTwoMode.label);
  document.body.prepend(controls);

  return {
    mapModeSelect: mapMode.select,
    mapTwoModeSelect: mapTwoMode.select,
  };
}

function wireDevModeDropdown(select, instance) {
  select.addEventListener("change", () => {
    const nextMode = select.value === "debug" ? "debug" : "view";
    instance.ui.setMode(nextMode);
  });
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

const waymarkInstance = createInstance({
  config: {
    id: "map",
    ui: {
      mode: "view",
    },
    map: {
      basemaps: {
        raster: [
          {
            title: "OpenCycleMap",
            tileURLTemplates: [
              " https://api.thunderforest.com/cycle/{z}/{x}/{y}@2x.png?apikey=4550655437ba47fda736e7898339c95f ",
            ],
            attributionHTML:
              "Map data: <a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>, <a href='https://www.opentopomap.org'>SRTM</a> | Map style: <a href='https://www.opentopomap.org'>© OpenTopoMap</a>",
            opacity: 0.7,
          },
          {
            title: "OpenTopoMap raster overlay",
            tileURLTemplates: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            attributionHTML:
              "Map data: <a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>, <a href='https://www.opentopomap.org'>SRTM</a> | Map style: <a href='https://www.opentopomap.org'>© OpenTopoMap</a>",
            opacity: 0.5,
          },
          {
            title: "ESRI Satellite",
            tileURLTemplates: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            attributionHTML:
              "Imagery: <a href='https://www.esri.com'>© Esri</a>",
            opacity: 0.5,
          },
        ],
        vector: [
          {
            title: "OpenFreeMap Bright",
            styleURL: "https://tiles.openfreemap.org/styles/bright",
            attributionHTML:
              "<a href='https://openfreemap.org'>© OpenFreeMap</a>",
          },
          {
            title: "OpenFreeMap Liberty",
            styleURL: "https://tiles.openfreemap.org/styles/liberty",
            attributionHTML:
              "<a href='https://openfreemap.org'>© OpenFreeMap</a>",
          },
        ],
      },
      options: {
        center: [-128.0094, 50.6539],
        zoom: 15,
      },
    },
  },
});

const waymarkInstanceTwo = createInstance({
  config: {
    id: "map-two",
    ui: {
      mode: "debug",
    },
    map: {
      basemaps: {
        raster: [
          {
            title: "OpenStreetMap raster",
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            attributionHTML:
              "<a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>",
            opacity: 1,
          },
          {
            title: "OpenTopoMap raster overlay",
            tileURLTemplates: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            attributionHTML:
              "Map data: <a href='https://www.openstreetmap.org/copyright'>© OpenStreetMap contributors</a>, <a href='https://www.opentopomap.org'>SRTM</a> | Map style: <a href='https://www.opentopomap.org'>© OpenTopoMap</a>",
            opacity: 0.4,
          },
        ],
      },
      options: {
        center: [-0.1276, 51.5074],
        zoom: 11,
      },
    },
  },
});

const { mapModeSelect, mapTwoModeSelect } = createDevModeDropdowns();

function getInstanceMode(instance) {
  const instanceDocument = instance.toJSON();
  return instanceDocument.state.ui?.mode ?? instanceDocument.config.ui.mode;
}

mapModeSelect.value = getInstanceMode(waymarkInstance);
mapTwoModeSelect.value = getInstanceMode(waymarkInstanceTwo);

wireDevModeDropdown(mapModeSelect, waymarkInstance);
wireDevModeDropdown(mapTwoModeSelect, waymarkInstanceTwo);

attachDevContainerEventLogging(waymarkInstance, "map");
attachDevContainerEventLogging(waymarkInstanceTwo, "map-two");

// Expose for browser tests and debugging
window.createWaymarkInstance = createInstance;
window.waymarkInstance = waymarkInstance;
window.waymarkInstanceTwo = waymarkInstanceTwo;
