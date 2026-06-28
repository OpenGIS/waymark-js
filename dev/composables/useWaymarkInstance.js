import { ref, onMounted, onUnmounted } from "vue";
import { createInstance } from "../../src/entry.js";
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
} from "../../src/runtime/createInstanceEvents.js";

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

let routeGeoJSONPromise = null;

function fetchRouteGeoJSON() {
  if (!routeGeoJSONPromise) {
    routeGeoJSONPromise = fetch("/route.json").then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch /route.json (${response.status})`);
      }

      return response.json();
    });
  }

  return routeGeoJSONPromise;
}

export function useWaymarkInstance({ instanceDocument }) {
  const instance = ref(null);
  const uiMode = ref(instanceDocument.config?.ui?.mode ?? "view");

  const mapId = instanceDocument.config.id;

  function attachEventLogging() {
    for (const eventType of DEV_INSTANCE_CONTAINER_EVENTS) {
      instance.value.on(eventType, (event) => {
        console.info(`[waymark:dev:event] ${mapId} ${event.type}`);
      });
    }
  }

  function getCurrentMode() {
    const doc = instance.value.toJSON();

    return doc.state.ui?.mode ?? doc.config.ui.mode;
  }

  onMounted(async () => {
    instance.value = createInstance(instanceDocument);
    uiMode.value = getCurrentMode();

    attachEventLogging();

    // try {
    //   const geojson = await fetchRouteGeoJSON();

    //   instance.value.data.addLayer({ data: geojson });
    // } catch (error) {
    //   console.error("[waymark:dev] Failed to load route GeoJSON", error);
    // }
  });

  onUnmounted(() => {
    if (instance.value) {
      instance.value.destroy();
    }
  });

  function setMode(mode) {
    instance.value.ui.setMode(mode);
    uiMode.value = getCurrentMode();
  }

  return {
    instance,
    uiMode,
    setMode,
  };
}
