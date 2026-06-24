export const WAYMARK_INSTANCE_CREATED_EVENT = "waymark:instance.created";
export const WAYMARK_INSTANCE_REUSED_EVENT = "waymark:instance.reused";
export const WAYMARK_INSTANCE_DESTROYED_EVENT = "waymark:instance.destroyed";
export const WAYMARK_MAP_LOAD_EVENT = "waymark:map.load";
export const WAYMARK_MAP_MOVEEND_EVENT = "waymark:map.moveend";
export const WAYMARK_MAP_ZOOMEND_EVENT = "waymark:map.zoomend";
export const WAYMARK_MAP_ROTATEEND_EVENT = "waymark:map.rotateend";
export const WAYMARK_MAP_PITCHEND_EVENT = "waymark:map.pitchend";

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
     * @param {WaymarkInstanceLifecycleEventDetail | WaymarkInstanceMapEventDetail} detail
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
