/**
 * @typedef {import('maplibre-gl').Map} WaymarkMap
 */

/**
 * @typedef {object} WaymarkMapSnapshot
 * @property {[number, number]} center
 * @property {number} zoom
 * @property {number} bearing
 * @property {number} pitch
 */

/**
 * @typedef {object} WaymarkUISnapshot
 * @property {boolean} hasAppShell
 */

/**
 * @typedef {object} WaymarkDataSnapshot
 * @property {{ sourceId: string, layerId: string, geojson: object | null }} geojson
 */

/**
 * @typedef {object} WaymarkInstanceSnapshot
 * @property {1} version
 * @property {WaymarkMapSnapshot} map
 * @property {WaymarkUISnapshot} ui
 * @property {WaymarkDataSnapshot} data
 */

/**
 * @param {WaymarkMap} map
 * @returns {WaymarkMapSnapshot}
 */
function snapshotMap(map) {
  const center = map.getCenter();

  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

/**
 * @param {{ app: import('vue').App, mountElement: HTMLElement } | null} appShell
 * @returns {WaymarkUISnapshot}
 */
function snapshotUI(appShell) {
  return {
    hasAppShell: Boolean(appShell),
  };
}

/**
 * @param {{ sourceId: string, layerId: string, geoJSON: object | null }} geoJSONModule
 * @returns {WaymarkDataSnapshot}
 */
function snapshotData(geoJSONModule) {
  return {
    geojson: {
      sourceId: geoJSONModule.sourceId,
      layerId: geoJSONModule.layerId,
      geojson: geoJSONModule.geoJSON,
    },
  };
}

/**
 * @param {object} value
 */
function cloneSnapshot(value) {
  return structuredClone(value);
}

/**
 * @param {{
 *   map: WaymarkMap,
 *   modules: {
 *     appShell: { app: import('vue').App, mountElement: HTMLElement } | null,
 *     geoJSON: { sourceId: string, layerId: string, geoJSON: object | null }
 *   }
 * }} options
 */
export function createInstanceSnapshot(options) {
  const { map, modules } = options;

  return {
    /**
     * @returns {WaymarkInstanceSnapshot}
     */
    getSnapshot() {
      return cloneSnapshot({
        version: 1,
        map: snapshotMap(map),
        ui: snapshotUI(modules.appShell),
        data: snapshotData(modules.geoJSON),
      });
    },
  };
}
