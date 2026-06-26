import { createApp, h, ref } from "vue";
import {
  FORWARDED_MAP_EVENTS,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_STATE_CHANGED_EVENT,
  WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
  WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT,
  WAYMARK_STATE_UI_MODE_CHANGED_EVENT,
  WAYMARK_STATE_UI_PANEL_CHANGED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
} from "../runtime/createInstanceEvents.js";
import { resolveInternalControls } from "./controls/internalControls.js";
import InstanceShell from "./InstanceShell.vue";

const WAYMARK_DEBUG_EVENT_TYPES = [
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
  WAYMARK_STATE_CHANGED_EVENT,
  WAYMARK_STATE_UI_MODE_CHANGED_EVENT,
  WAYMARK_STATE_UI_PANEL_CHANGED_EVENT,
  WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT,
  WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT,
  ...FORWARDED_MAP_EVENTS.map(([, waymarkEvent]) => waymarkEvent),
];

const WAYMARK_EVENT_HISTORY_LIMIT = 25;

/**
 * @returns {{ vector: object[], raster: Array<{ basemapId: string, tileURLTemplates: string[], title?: string, attributionHTML?: string, tileSize?: number, minZoom?: number, maxZoom?: number, opacity?: number }> }}
 */
function createEmptyBasemapSnapshot() {
  return {
    vector: [],
    raster: [],
  };
}

/**
 * @param {unknown} snapshot
 * @returns {{ vector: object[], raster: Array<{ basemapId: string, tileURLTemplates: string[], title?: string, attributionHTML?: string, tileSize?: number, minZoom?: number, maxZoom?: number, opacity?: number }> }}
 */
function normaliseBasemapSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return createEmptyBasemapSnapshot();
  }

  const vector = Array.isArray(snapshot.vector)
    ? snapshot.vector.map((vectorBasemap) => ({ ...vectorBasemap }))
    : [];
  const raster = Array.isArray(snapshot.raster)
    ? snapshot.raster.map((rasterBasemap) => ({
        ...rasterBasemap,
        tileURLTemplates: Array.isArray(rasterBasemap.tileURLTemplates)
          ? [...rasterBasemap.tileURLTemplates]
          : [],
      }))
    : [];

  return {
    vector,
    raster,
  };
}

/**
 * @param {unknown} snapshot
 */
function normaliseRuntimeSnapshot(snapshot) {
  const mode = snapshot?.ui?.mode === "debug" ? "debug" : "view";
  const activePanel =
    typeof snapshot?.ui?.activePanel === "string"
      ? snapshot.ui.activePanel
      : null;
  const panelContext =
    snapshot?.ui?.panelContext && typeof snapshot.ui.panelContext === "object"
      ? { ...snapshot.ui.panelContext }
      : {};

  return {
    mode,
    activePanel,
    panelContext,
    basemaps: normaliseBasemapSnapshot(snapshot?.map?.basemaps),
  };
}

/**
 * @param {string} containerId
 * @param {{ events: { on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void }, getInstanceDocument: () => object | null, getRuntimeStateSnapshot: () => { ui?: { mode?: 'view' | 'debug', activePanel?: string | null, panelContext?: unknown }, map?: { basemaps?: unknown } } | null, subscribeRuntimeState: (listener: (detail: { snapshot: unknown }) => void) => () => void, onSetRasterOpacity?: (basemapId: string, opacity: number) => void, onReorderRasterBasemaps?: (orderedBasemapIds: string[]) => void, onSetActiveVectorBasemap?: (basemapId: string) => void, onToggleDebugOutputPanel?: () => void, onToggleBasemapsPanel?: () => void }} options
 */
export function createAppShell(containerId, options) {
  const container = document.getElementById(containerId);

  if (!container) {
    return null;
  }

  const { events, getInstanceDocument } = options;
  const initialRuntimeSnapshot = normaliseRuntimeSnapshot(
    options.getRuntimeStateSnapshot(),
  );
  const instanceDocument = ref(null);
  const basemapSnapshot = ref(createEmptyBasemapSnapshot());
  const waymarkEvents = ref([]);
  const mode = ref(initialRuntimeSnapshot.mode);
  const activePanel = ref(initialRuntimeSnapshot.activePanel);
  const panelContext = ref(initialRuntimeSnapshot.panelContext);
  basemapSnapshot.value = initialRuntimeSnapshot.basemaps;

  const refreshInstanceDocument = () => {
    instanceDocument.value = getInstanceDocument() ?? null;
  };

  const refresh = () => {
    const runtimeSnapshot = normaliseRuntimeSnapshot(
      options.getRuntimeStateSnapshot(),
    );
    mode.value = runtimeSnapshot.mode;
    activePanel.value = runtimeSnapshot.activePanel;
    panelContext.value = runtimeSnapshot.panelContext;
    refreshInstanceDocument();
    basemapSnapshot.value = runtimeSnapshot.basemaps;
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

    if (eventType.startsWith("waymark:state.")) {
      return {
        id: summariseValue(detail.id),
        command: summariseValue(detail.command),
        scope: summariseValue(detail.scope),
        previous: summariseValue(detail.previous),
        next: summariseValue(detail.next),
        source: summariseValue(detail.source),
      };
    }

    return null;
  };

  /**
   * @param {Event} event
   */
  const onWaymarkEvent = (event) => {
    const summary = {
      type: event.type,
      at: new Date().toISOString(),
      detail: summariseDetail(event.type, event.detail),
    };

    waymarkEvents.value = [...waymarkEvents.value, summary].slice(
      -WAYMARK_EVENT_HISTORY_LIMIT,
    );
  };

  const toggleDebugOutputPanel = () => {
    options.onToggleDebugOutputPanel?.();
  };

  const toggleBasemapsPanel = () => {
    options.onToggleBasemapsPanel?.();
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
            activePanel: activePanel.value,
            toggleDebugOutputPanel,
            toggleBasemapsPanel,
          }),
          activePanel: activePanel.value,
          panelContext: panelContext.value,
          basemapSnapshot: basemapSnapshot.value,
          onSetRasterOpacity: options.onSetRasterOpacity,
          onReorderRasterBasemaps: options.onReorderRasterBasemaps,
          onSetActiveVectorBasemap: options.onSetActiveVectorBasemap,
        });
    },
  });

  for (const eventName of WAYMARK_DEBUG_EVENT_TYPES) {
    events.on(eventName, onWaymarkEvent);
  }
  const unsubscribeRuntimeState = options.subscribeRuntimeState((detail) => {
    const runtimeSnapshot = normaliseRuntimeSnapshot(detail?.snapshot);
    mode.value = runtimeSnapshot.mode;
    activePanel.value = runtimeSnapshot.activePanel;
    panelContext.value = runtimeSnapshot.panelContext;
    basemapSnapshot.value = runtimeSnapshot.basemaps;
    refreshInstanceDocument();
  });

  refresh();

  app.mount(mountElement);

  return {
    app,
    mountElement,
    refresh,
    destroy() {
      for (const eventName of WAYMARK_DEBUG_EVENT_TYPES) {
        events.off(eventName, onWaymarkEvent);
      }
      unsubscribeRuntimeState();
    },
  };
}
