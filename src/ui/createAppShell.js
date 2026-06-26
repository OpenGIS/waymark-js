import { createApp, h, ref } from "vue";
import {
  FORWARDED_MAP_EVENTS,
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_INSTANCE_RECREATED_EVENT,
  WAYMARK_MAP_BASEMAPS_CHANGED_EVENT,
  WAYMARK_UI_MODE_CHANGED_EVENT,
} from "../runtime/createInstanceEvents.js";
import {
  PANEL_IDS,
  resolveInternalControls,
} from "./controls/internalControls.js";
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
 * @param {string} containerId
 * @param {{ events: { on: (type: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean) => void, off: (type: string, handler: EventListenerOrEventListenerObject, options?: EventListenerOptions | boolean) => void }, getInstanceDocument: () => object | null, getBasemapSnapshot?: () => { vector: object[], raster: Array<{ basemapId: string, tileURLTemplates: string[], title?: string, attributionHTML?: string, tileSize?: number, minZoom?: number, maxZoom?: number, opacity?: number }> } | null, onSetRasterOpacity?: (basemapId: string, opacity: number) => void, onReorderRasterBasemaps?: (orderedBasemapIds: string[]) => void, mode: 'view' | 'debug', onBasemapsPanelOpen?: () => void, onBasemapsPanelClose?: () => void }} options
 */
export function createAppShell(containerId, options) {
  const container = document.getElementById(containerId);

  if (!container) {
    return null;
  }

  const { events, getInstanceDocument } = options;
  const instanceDocument = ref(null);
  const basemapSnapshot = ref(createEmptyBasemapSnapshot());
  const waymarkEvents = ref([]);
  const mode = ref(normaliseMode(options.mode));
  const activePanel = ref(
    mode.value === "debug" ? PANEL_IDS.debugOutput : null,
  );
  const panelContext = ref({});

  const refresh = () => {
    instanceDocument.value = getInstanceDocument() ?? null;
    basemapSnapshot.value = normaliseBasemapSnapshot(
      options.getBasemapSnapshot?.(),
    );
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
   * @param {CustomEvent} event
   */
  const onBasemapsChanged = (event) => {
    basemapSnapshot.value = normaliseBasemapSnapshot(event.detail?.basemaps);
    refresh();
  };

  /**
   * @param {'view' | 'debug'} nextMode
   */
  const setMode = (nextMode) => {
    const previousMode = mode.value;
    mode.value = normaliseMode(nextMode);

    if (mode.value !== "debug" && activePanel.value === PANEL_IDS.debugOutput) {
      closePanel(PANEL_IDS.debugOutput);
    }

    if (
      previousMode !== "debug" &&
      mode.value === "debug" &&
      activePanel.value === null
    ) {
      openPanel(PANEL_IDS.debugOutput, { source: "internal:mode-default" });
    }

    refresh();
  };

  /**
   * @param {string} panelId
   * @param {Record<string, unknown>} [nextPanelContext={}]
   */
  const openPanel = (panelId, nextPanelContext = {}) => {
    activePanel.value = panelId;
    panelContext.value = {
      ...nextPanelContext,
    };
  };

  /**
   * @param {string} [panelId]
   */
  const closePanel = (panelId) => {
    if (panelId && activePanel.value !== panelId) {
      return;
    }

    activePanel.value = null;
    panelContext.value = {};
  };

  const toggleDebugOutputPanel = () => {
    if (activePanel.value === PANEL_IDS.debugOutput) {
      closePanel(PANEL_IDS.debugOutput);
      return;
    }

    openPanel(PANEL_IDS.debugOutput, { source: "internal:debug-control" });
  };

  const openBasemapsPanel = () => {
    if (activePanel.value !== PANEL_IDS.basemaps) {
      openPanel(PANEL_IDS.basemaps, { source: "internal:basemaps-control" });
    }

    options.onBasemapsPanelOpen?.();
  };

  const closeBasemapsPanel = () => {
    closePanel(PANEL_IDS.basemaps);
    options.onBasemapsPanelClose?.();
  };

  const toggleBasemapsPanel = () => {
    if (activePanel.value === PANEL_IDS.basemaps) {
      closeBasemapsPanel();
      return;
    }

    openBasemapsPanel();
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
        });
    },
  });

  for (const eventName of WAYMARK_DEBUG_EVENT_TYPES) {
    events.on(eventName, onWaymarkEvent);
  }
  events.on(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, onBasemapsChanged);

  refresh();

  app.mount(mountElement);

  return {
    app,
    mountElement,
    refresh,
    setMode,
    openBasemapsPanel,
    closeBasemapsPanel,
    destroy() {
      for (const eventName of WAYMARK_DEBUG_EVENT_TYPES) {
        events.off(eventName, onWaymarkEvent);
      }
      events.off(WAYMARK_MAP_BASEMAPS_CHANGED_EVENT, onBasemapsChanged);
    },
  };
}
