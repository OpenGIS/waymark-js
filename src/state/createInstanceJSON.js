/**
 * @typedef {import('maplibre-gl').Map} WaymarkMap
 */

/**
 * @typedef {object} WaymarkMapState
 * @property {[number, number]} center
 * @property {number} zoom
 * @property {number} bearing
 * @property {number} pitch
 */

/**
 * @typedef {object} WaymarkUIState
 * @property {'view' | 'debug'} mode
 */

/**
 * @typedef {object} WaymarkDataState
 * @property {{ sourceId: string, layerId: string, geojson: object | null }} geojson
 */

/**
 * @typedef {object} WaymarkInstanceDocumentConfig
 * @property {string} id
 * @property {{ options: object }} map
 * @property {WaymarkUIState} ui
 */

/**
 * @typedef {object} WaymarkInstanceDocument
 * @property {WaymarkInstanceDocumentConfig} config
 * @property {{ map: WaymarkMapState, ui: WaymarkUIState }} state
 * @property {WaymarkDataState} data
 */

/**
 * @param {WaymarkMap} map
 * @returns {WaymarkMapState}
 */
function readMapState(map) {
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
 * @returns {WaymarkUIState}
 */
function readUIState(mode) {
  return {
    mode,
  };
}

/**
 * @param {{ sourceId: string, layerId: string, geoJSON: object | null }} geoJSONModule
 * @returns {WaymarkDataState}
 */
function readDataState(geoJSONModule) {
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
function cloneInstanceJSON(value) {
  return structuredClone(value);
}

/**
 * @param {WaymarkMap} map
 * @returns {WaymarkMapState}
 */
export function getMapCameraState(map) {
  return readMapState(map);
}

/**
 * @param {{
 *   getMapState: () => WaymarkMapState,
 *   getMode: () => 'view' | 'debug',
 *   getConfig: () => WaymarkInstanceDocumentConfig,
 *   modules: {
 *     geoJSON: { sourceId: string, layerId: string, geoJSON: object | null }
 *   }
 * }} options
 */
export function createInstanceJSON(options) {
  const { getMapState, getMode, modules, getConfig } = options;

  return {
    /**
     * @returns {WaymarkInstanceDocument}
     */
    toJSON() {
      return cloneInstanceJSON({
        config: getConfig(),
        state: {
          map: getMapState(),
          ui: readUIState(getMode()),
        },
        data: readDataState(modules.geoJSON),
      });
    },
  };
}
