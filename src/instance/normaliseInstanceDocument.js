/**
 * @typedef {object} WaymarkInstanceDocumentConfig
 * @property {string} [id]
 * @property {{ options?: object }} [map]
 * @property {{ mode?: unknown }} [ui]
 */

/**
 * @typedef {object} WaymarkInstanceDocumentStateMap
 * @property {[number, number]} [center]
 * @property {number} [zoom]
 * @property {number} [bearing]
 * @property {number} [pitch]
 */

/**
 * @typedef {object} WaymarkInstanceDocument
 * @property {WaymarkInstanceDocumentConfig} config
 * @property {{ map: WaymarkInstanceDocumentStateMap, ui: { mode: 'view' | 'debug' } }} state
 * @property {{ geojson: object | null }} data
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * @param {unknown} mode
 * @returns {'view' | 'debug'}
 */
function normaliseMode(mode) {
  return mode === "debug" ? "debug" : "view";
}

/**
 * @param {unknown} stateMap
 * @returns {WaymarkInstanceDocumentStateMap}
 */
function normaliseStateMap(stateMap) {
  if (!isRecord(stateMap)) {
    return {};
  }

  /** @type {WaymarkInstanceDocumentStateMap} */
  const normalised = {};

  for (const key of ["center", "zoom", "bearing", "pitch"]) {
    if (Object.hasOwn(stateMap, key)) {
      normalised[key] = stateMap[key];
    }
  }

  return normalised;
}

/**
 * @param {unknown} instanceJSON
 * @returns {WaymarkInstanceDocument}
 */
export function normaliseInstanceDocument(instanceJSON) {
  const root = isRecord(instanceJSON) ? instanceJSON : {};

  const rawConfig = isRecord(root.config) ? root.config : {};
  const rawConfigMap = isRecord(rawConfig.map) ? rawConfig.map : {};
  const rawConfigUI = isRecord(rawConfig.ui) ? rawConfig.ui : {};
  const rawState = isRecord(root.state) ? root.state : {};
  const rawStateUI = isRecord(rawState.ui) ? rawState.ui : {};
  const rawData = isRecord(root.data) ? root.data : {};

  const config = {
    map: {
      options: isRecord(rawConfigMap.options)
        ? { ...rawConfigMap.options }
        : {},
    },
    ui: {
      mode: normaliseMode(rawConfigUI.mode),
    },
  };

  if (typeof rawConfig.id === "string" && rawConfig.id.length > 0) {
    config.id = rawConfig.id;
  }

  return {
    config,
    state: {
      map: normaliseStateMap(rawState.map),
      ui: {
        mode: normaliseMode(rawStateUI.mode ?? config.ui.mode),
      },
    },
    data: {
      geojson: Object.hasOwn(rawData, "geojson") ? rawData.geojson : null,
    },
  };
}
