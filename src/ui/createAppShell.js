import { createApp, h, ref } from "vue";
import InstanceShell from "./InstanceShell.vue";

/**
 * @param {string} containerId
 * @param {{ events: { on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void }, getSnapshot: () => object | null }} options
 */
export function createAppShell(containerId, options) {
  const container = document.getElementById(containerId);

  if (!container) {
    return null;
  }

  const { events, getSnapshot } = options;
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

  const updateEvents = [
    "waymark:map.load",
    "waymark:map.moveend",
    "waymark:map.zoomend",
    "waymark:map.rotateend",
    "waymark:map.pitchend",
  ];

  for (const eventName of updateEvents) {
    events.on(eventName, refresh);
  }

  refresh();

  app.mount(mountElement);

  return {
    app,
    mountElement,
    refresh,
    destroy() {
      for (const eventName of updateEvents) {
        events.off(eventName, refresh);
      }
    },
  };
}
