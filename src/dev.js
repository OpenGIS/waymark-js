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
import { getCoreById } from "./core/runtimeRegistry.js";

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

function wireDevModeDropdown(select, instanceId) {
  select.addEventListener("change", () => {
    const core = getCoreById(instanceId);

    if (!core) {
      return;
    }

    const nextMode = select.value === "debug" ? "debug" : "view";
    core.lifecycle.setMode(nextMode);
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
  id: "map",
  ui: {
    mode: "view",
  },
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

const waymarkInstanceTwo = createInstance({
  id: "map-two",
  ui: {
    mode: "debug",
  },
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

const { mapModeSelect, mapTwoModeSelect } = createDevModeDropdowns();

mapModeSelect.value = waymarkInstance.getSnapshot().ui.mode;
mapTwoModeSelect.value = waymarkInstanceTwo.getSnapshot().ui.mode;

wireDevModeDropdown(mapModeSelect, waymarkInstance.id);
wireDevModeDropdown(mapTwoModeSelect, waymarkInstanceTwo.id);

attachDevContainerEventLogging(waymarkInstance, "map");
attachDevContainerEventLogging(waymarkInstanceTwo, "map-two");

// Expose for browser tests and debugging
window.createWaymarkInstance = createInstance;
window.waymarkInstance = waymarkInstance;
window.waymarkInstanceTwo = waymarkInstanceTwo;
