import { createApp, h, ref } from "vue";
import {
  FORWARDED_MAP_EVENTS,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
} from "../runtime/createInstanceEvents.js";
import { resolveInternalControls } from "./controls/internalControls.js";
import InstanceShell from "./InstanceShell.vue";

const WAYMARK_DEBUG_EVENT_TYPES = [
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
  ...FORWARDED_MAP_EVENTS.map(([, waymarkEvent]) => waymarkEvent),
];

const WAYMARK_EVENT_HISTORY_LIMIT = 25;

/**
 * @param {unknown} mode
 * @returns {'view' | 'debug'}
 */
function normaliseMode(mode) {
  return mode === "debug" ? "debug" : "view";
}

/**
 * @param {string} containerId
 * @param {{ events: { on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void }, getInstanceDocument: () => object | null, mode: 'view' | 'debug' }} options
 */
export function createAppShell(containerId, options) {
  const container = document.getElementById(containerId);

  if (!container) {
    return null;
  }

  const { events, getInstanceDocument } = options;
  const instanceDocument = ref(null);
  const waymarkEvents = ref([]);
  const mode = ref(normaliseMode(options.mode));
  const isDebugOutputVisible = ref(true);

  const refresh = () => {
    instanceDocument.value = getInstanceDocument() ?? null;
  };

  /**
   * @param {unknown} value
   */
  const summariseValue = (value) => {
    if (
      value === null ||
      typeof value === "boolean" ||
      typeof value === "number"
    ) {
      return value;
    }

    if (typeof value === "string") {
      return value.length > 120 ? `${value.slice(0, 120)}…` : value;
    }

    if (Array.isArray(value)) {
      return `[array:${value.length}]`;
    }

    if (typeof value === "object") {
      return "[object]";
    }

    return String(value);
  };

  /**
   * @param {string} eventType
   * @param {unknown} detail
   */
  const summariseDetail = (eventType, detail) => {
    if (!detail || typeof detail !== "object") {
      return null;
    }

    if (eventType.startsWith("waymark:instance.")) {
      return {
        id: summariseValue(detail.id),
      };
    }

    if (eventType === "waymark:ui.mode.changed") {
      return {
        id: summariseValue(detail.id),
        module: summariseValue(detail.module),
        event: summariseValue(detail.event),
        previous: summariseValue(detail.previous),
        next: summariseValue(detail.next),
        source: summariseValue(detail.source),
      };
    }

    if (eventType.startsWith("waymark:map.")) {
      return {
        id: summariseValue(detail.id),
        mapEvent: summariseValue(detail.mapEvent),
        hasOriginalEvent: detail.originalEvent != null,
        originalEventType: summariseValue(detail.originalEvent?.type ?? null),
      };
    }

    return null;
  };

  /**
   * @param {Event} event
   */
  const onWaymarkEvent = (event) => {
    refresh();

    const summary = {
      type: event.type,
      at: new Date().toISOString(),
      detail: summariseDetail(event.type, event.detail),
    };

    waymarkEvents.value = [...waymarkEvents.value, summary].slice(
      -WAYMARK_EVENT_HISTORY_LIMIT,
    );
  };

  /**
   * @param {'view' | 'debug'} nextMode
   */
  const setMode = (nextMode) => {
    mode.value = normaliseMode(nextMode);
    refresh();
  };

  const toggleDebugOutput = () => {
    isDebugOutputVisible.value = !isDebugOutputVisible.value;
  };

  const mountElement = document.createElement("div");
  mountElement.dataset.waymarkApp = "true";
  container.appendChild(mountElement);

  const app = createApp({
    name: "WaymarkInstanceApp",
    setup() {
      return () =>
        h(InstanceShell, {
          mode: mode.value,
          instanceDocument: instanceDocument.value,
          waymarkEvents: waymarkEvents.value,
          controls: resolveInternalControls({
            mode: mode.value,
            isDebugOutputVisible: isDebugOutputVisible.value,
            toggleDebugOutput,
          }),
          debugOutputVisible: isDebugOutputVisible.value,
        });
    },
  });

  for (const eventName of WAYMARK_DEBUG_EVENT_TYPES) {
    events.on(eventName, onWaymarkEvent);
  }

  refresh();

  app.mount(mountElement);

  return {
    app,
    mountElement,
    refresh,
    setMode,
    destroy() {
      for (const eventName of WAYMARK_DEBUG_EVENT_TYPES) {
        events.off(eventName, onWaymarkEvent);
      }
    },
  };
}
