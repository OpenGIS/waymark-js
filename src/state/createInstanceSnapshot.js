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
 * @property {'view' | 'debug'} mode
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
 * @param {'view' | 'debug'} mode
 * @returns {WaymarkUISnapshot}
 */
function snapshotUI(mode) {
  return {
    mode,
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
 *   getMode: () => 'view' | 'debug',
 *   modules: {
 *     geoJSON: { sourceId: string, layerId: string, geoJSON: object | null }
 *   }
 * }} options
 */
export function createInstanceSnapshot(options) {
  const { map, getMode, modules } = options;

  return {
    /**
     * @returns {WaymarkInstanceSnapshot}
     */
    getSnapshot() {
      return cloneSnapshot({
        version: 1,
        map: snapshotMap(map),
        ui: snapshotUI(getMode()),
        data: snapshotData(modules.geoJSON),
      });
    },
  };
}
