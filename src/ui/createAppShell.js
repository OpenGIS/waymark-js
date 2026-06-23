import { createApp, h, ref } from "vue";
import InstanceShell from "./InstanceShell.vue";

/**
 * @param {string} containerId
 * @param {{ map: import('maplibre-gl').Map, getSnapshot: () => object | null }} options
 */
export function createAppShell(containerId, options) {
  const container = document.getElementById(containerId);

  if (!container) {
    return null;
  }

  const { map, getSnapshot } = options;
  const snapshot = ref(null);

  const refresh = () => {
    snapshot.value = getSnapshot() ?? null;
  };

  const mountElement = document.createElement("div");
  mountElement.dataset.waymarkApp = "true";
  container.appendChild(mountElement);

  const app = createApp({
    name: "WaymarkInstanceApp",
    setup() {
      return () => h(InstanceShell, { snapshot: snapshot.value });
    },
  });

  const updateEvents = ["load", "move", "zoom", "rotate", "pitch"];

  for (const eventName of updateEvents) {
    map.on(eventName, refresh);
  }

  refresh();

  app.mount(mountElement);

  return {
    app,
    mountElement,
    refresh,
    destroy() {
      for (const eventName of updateEvents) {
        map.off(eventName, refresh);
      }
    },
  };
}
