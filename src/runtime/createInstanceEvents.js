export const WAYMARK_INSTANCE_CREATED_EVENT = "waymark:instance.created";
export const WAYMARK_INSTANCE_DESTROYED_EVENT = "waymark:instance.destroyed";
export const WAYMARK_DATA_LAYER_ADDED_EVENT = "waymark:data.layer.added";
export const WAYMARK_DATA_LAYER_MOUNTED_EVENT = "waymark:data.layer.mounted";
export const WAYMARK_DATA_LAYER_ERROR_EVENT = "waymark:data.layer.error";
export const WAYMARK_STATE_CHANGED_EVENT = "waymark:state.changed";
export const WAYMARK_STATE_DEBUG_CHANGED_EVENT = "waymark:state.debug.changed";
export const WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT =
  "waymark:state.types.visibility.changed";
export const WAYMARK_FEATURE_CLICK_EVENT = "waymark:feature.click";
export const WAYMARK_FEATURE_HOVER_EVENT = "waymark:feature.hover";
export const WAYMARK_FEATURE_LEAVE_EVENT = "waymark:feature.leave";

/**
 * Complete list of all Waymark event types.
 * Used by the debug module to subscribe to every event for console logging.
 */
export const WAYMARK_ALL_EVENTS = [
  WAYMARK_INSTANCE_CREATED_EVENT,
  WAYMARK_INSTANCE_DESTROYED_EVENT,
  WAYMARK_DATA_LAYER_ADDED_EVENT,
  WAYMARK_DATA_LAYER_MOUNTED_EVENT,
  WAYMARK_DATA_LAYER_ERROR_EVENT,
  WAYMARK_STATE_CHANGED_EVENT,
  WAYMARK_STATE_DEBUG_CHANGED_EVENT,
  WAYMARK_STATE_TYPES_VISIBILITY_CHANGED_EVENT,
  WAYMARK_FEATURE_CLICK_EVENT,
  WAYMARK_FEATURE_HOVER_EVENT,
  WAYMARK_FEATURE_LEAVE_EVENT,
];

/**
 * @typedef {{ id: string }} WaymarkInstanceLifecycleEventDetail
 */

/**
 * @typedef {{ id: string, layer: { type: 'geojson', data: object } }} WaymarkDataLayerAddedEventDetail
 */

/**
 * @typedef {{ id: string, layerIndex: number, mountedFamilies: Array<'circle' | 'line' | 'fill' | 'symbol'>, mountedLayerIds: string[], mountedTypes: string[] }} WaymarkDataLayerMountedEventDetail
 */

/**
 * @typedef {{ id: string, stage: 'validation' | 'runtime', message: string }} WaymarkDataLayerErrorEventDetail
 */

/**
 * @typedef {{
 *   id: string,
 *   command: string,
 *   scope: string,
 *   previous: unknown,
 *   next: unknown,
 *   meta?: {
 *     typeKey?: string,
 *   },
 *   source: string,
 *   snapshot: {
 *     debug: boolean,
 *     types: Record<string, { visible: boolean }>,
 *   },
 * }} WaymarkStateChangedEventDetail
 */

/**
 * `feature` is a plain GeoJSON Feature (`{ type, id?, geometry, properties }`)
 * with MapLibre presentation internals (`layer`, `source`, `state`,
 * `_vectorTileFeature`, ...) stripped. `id` is present only when the rendered
 * feature carried one.
 *
 * @typedef {{
 *   id: string,
 *   feature: import('geojson').Feature,
 *   layerId: string,
 *   lngLat: import('maplibre-gl').LngLat | null,
 *   originalEvent: Event | null,
 * }} WaymarkFeatureEventDetail
 */

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
 * Bind the instance event API to a DOM element (typically `map.getContainer()`).
 *
 * @param {HTMLElement} container
 */
export function createInstanceEvents(container) {
  return {
    container,
    /**
     * @param {string} type
     * @param {WaymarkInstanceLifecycleEventDetail | WaymarkStateChangedEventDetail | WaymarkDataLayerAddedEventDetail | WaymarkDataLayerMountedEventDetail | WaymarkDataLayerErrorEventDetail | WaymarkFeatureEventDetail} detail
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
