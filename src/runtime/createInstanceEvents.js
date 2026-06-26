export const WAYMARK_INSTANCE_CREATED_EVENT = "waymark:instance.created";
export const WAYMARK_INSTANCE_RECREATED_EVENT = "waymark:instance.recreated";
export const WAYMARK_INSTANCE_DESTROYED_EVENT = "waymark:instance.destroyed";
export const WAYMARK_MAP_LOAD_EVENT = "waymark:map.load";
export const WAYMARK_MAP_MOVEEND_EVENT = "waymark:map.moveend";
export const WAYMARK_MAP_ZOOMEND_EVENT = "waymark:map.zoomend";
export const WAYMARK_MAP_ROTATEEND_EVENT = "waymark:map.rotateend";
export const WAYMARK_MAP_PITCHEND_EVENT = "waymark:map.pitchend";
export const WAYMARK_UI_MODE_CHANGED_EVENT = "waymark:ui.mode.changed";
export const WAYMARK_MAP_BASEMAPS_CHANGED_EVENT =
  "waymark:map.basemaps.changed";
export const WAYMARK_STATE_CHANGED_EVENT = "waymark:state.changed";
export const WAYMARK_STATE_UI_MODE_CHANGED_EVENT =
  "waymark:state.ui.mode.changed";
export const WAYMARK_STATE_UI_PANEL_CHANGED_EVENT =
  "waymark:state.ui.panel.changed";
export const WAYMARK_STATE_MAP_CAMERA_CHANGED_EVENT =
  "waymark:state.map.camera.changed";
export const WAYMARK_STATE_MAP_BASEMAPS_CHANGED_EVENT =
  "waymark:state.map.basemaps.changed";

export const FORWARDED_MAP_EVENTS = [
  ["load", WAYMARK_MAP_LOAD_EVENT],
  ["moveend", WAYMARK_MAP_MOVEEND_EVENT],
  ["zoomend", WAYMARK_MAP_ZOOMEND_EVENT],
  ["rotateend", WAYMARK_MAP_ROTATEEND_EVENT],
  ["pitchend", WAYMARK_MAP_PITCHEND_EVENT],
];

/**
 * @typedef {{ id: string }} WaymarkInstanceLifecycleEventDetail
 */

/**
 * @typedef {{ id: string, mapEvent: string, originalEvent: unknown }} WaymarkInstanceMapEventDetail
 */

/**
 * @typedef {'opacity_changed' | 'reordered' | 'vector_changed'} WaymarkBasemapsMutationType
 */

/**
 * @typedef {{
 *   id: string,
 *   mutation: WaymarkBasemapsMutationType,
 *   changed: {
 *     basemapIds: string[],
 *     opacity?: Record<string, number>,
 *     orderedBasemapIds?: string[],
 *   },
 *   basemaps: {
 *     vector: Array<{
 *       basemapId: string,
 *       styleURL: string | object,
 *       title?: string,
 *       attributionHTML?: string,
 *       maxZoom?: number,
 *       opacity?: number,
 *     }>,
 *     raster: Array<{
 *       basemapId: string,
 *       tileURLTemplates: string[],
 *       title?: string,
 *       attributionHTML?: string,
 *       tileSize?: number,
 *       minZoom?: number,
 *       maxZoom?: number,
 *       opacity?: number,
 *     }>,
 *   },
 * }} WaymarkBasemapsChangedEventDetail
 */

/**
 * @typedef {{
 *   id: string,
 *   module: string,
 *   event: string,
 *   previous: unknown,
 *   next: unknown,
 *   source: string,
 * }} WaymarkInstanceModuleEventDetail
 */

/**
 * @typedef {{
 *   id: string,
 *   command: string,
 *   scope: string,
 *   previous: unknown,
 *   next: unknown,
 *   meta?: {
 *     mutation?: string,
 *     changed?: {
 *       basemapIds?: string[],
 *       opacity?: Record<string, number>,
 *       orderedBasemapIds?: string[],
 *     },
 *   },
 *   source: string,
 *   snapshot: {
 *     map: {
 *       camera: {
 *         center: [number, number],
 *         zoom: number,
 *         bearing: number,
 *         pitch: number,
 *       },
 *       basemaps: {
 *         vector: unknown[],
 *         raster: unknown[],
 *       },
 *     },
 *     ui: {
 *       mode: 'view' | 'debug',
 *       activePanel: string | null,
 *       panelContext: unknown,
 *     },
 *   },
 * }} WaymarkStateChangedEventDetail
 */

/**
 * @param {string} containerId
 */
function resolveContainer(containerId) {
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error(`Waymark container "${containerId}" was not found.`);
  }

  return container;
}

/**
 * @param {AddEventListenerOptions | boolean | undefined} options
 */
function buildOnceOptions(options) {
  if (typeof options === "boolean") {
    return {
      capture: options,
      once: true,
    };
  }

  return {
    ...options,
    once: true,
  };
}

/**
 * @param {string} containerId
 */
export function createInstanceEvents(containerId) {
  const container = resolveContainer(containerId);

  return {
    container,
    /**
     * @param {string} type
     * @param {WaymarkInstanceLifecycleEventDetail | WaymarkInstanceMapEventDetail | WaymarkInstanceModuleEventDetail | WaymarkBasemapsChangedEventDetail | WaymarkStateChangedEventDetail} detail
     */
    emit(type, detail) {
      container.dispatchEvent(
        new CustomEvent(type, {
          detail,
        }),
      );
    },
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} handler
     * @param {AddEventListenerOptions | boolean} [options]
     */
    on(type, handler, options) {
      container.addEventListener(type, handler, options);
    },
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} handler
     * @param {EventListenerOptions | boolean} [options]
     */
    off(type, handler, options) {
      container.removeEventListener(type, handler, options);
    },
    /**
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} handler
     * @param {AddEventListenerOptions | boolean} [options]
     */
    once(type, handler, options) {
      container.addEventListener(type, handler, buildOnceOptions(options));
    },
  };
}

/**
 * @param {{
 *   id: string,
 *   map: import('maplibre-gl').Map,
 *   events: ReturnType<typeof createInstanceEvents>,
 * }} options
 */
export function forwardMapEventsToInstanceContainer(options) {
  const { id, map, events } = options;
  const listeners = [];

  for (const [mapEvent, waymarkEvent] of FORWARDED_MAP_EVENTS) {
    const handler = (originalEvent) => {
      events.emit(waymarkEvent, {
        id,
        mapEvent,
        originalEvent,
      });
    };

    map.on(mapEvent, handler);
    listeners.push([mapEvent, handler]);
  }

  return {
    destroy() {
      for (const [mapEvent, handler] of listeners) {
        map.off(mapEvent, handler);
      }
    },
  };
}
