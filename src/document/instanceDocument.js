/**
 * @typedef {object} WaymarkInstanceDocumentConfig
 * @property {string} [id]
 * @property {{ options: Record<string, unknown> }} map
 * @property {{ mode: 'view' | 'debug' }} ui
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
function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * @param {unknown} mode
 * @returns {'view' | 'debug'}
 */
export function normaliseMode(mode) {
  return mode === "debug" ? "debug" : "view";
}

/**
 * Deterministically keeps JSON-serialisable values only.
 *
 * - object properties with non-serialisable values are dropped
 * - array elements with non-serialisable values become null
 * - non-finite numbers become null
 *
 * @param {unknown} value
 * @returns {unknown}
 */
export function toSerializableValue(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      const normalisedItem = toSerializableValue(item);
      return normalisedItem === undefined ? null : normalisedItem;
    });
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  /** @type {Record<string, unknown>} */
  const normalisedObject = {};

  for (const [key, childValue] of Object.entries(value)) {
    const normalisedChild = toSerializableValue(childValue);
    if (normalisedChild !== undefined) {
      normalisedObject[key] = normalisedChild;
    }
  }

  return normalisedObject;
}

/**
 * @param {unknown} mapOptions
 * @returns {Record<string, unknown>}
 */
function normaliseMapOptions(mapOptions) {
  if (!isPlainObject(mapOptions)) {
    return {};
  }

  const serialisable = toSerializableValue(mapOptions);
  return isPlainObject(serialisable) ? serialisable : {};
}

/**
 * @param {unknown} stateMap
 * @returns {WaymarkInstanceDocumentStateMap}
 */
function normaliseStateMap(stateMap) {
  if (!isPlainObject(stateMap)) {
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
 * @param {unknown} instanceDocument
 * @returns {WaymarkInstanceDocument}
 */
export function normaliseInstanceDocument(instanceDocument) {
  const root = isPlainObject(instanceDocument) ? instanceDocument : {};

  const rawConfig = isPlainObject(root.config) ? root.config : {};
  const rawConfigMap = isPlainObject(rawConfig.map) ? rawConfig.map : {};
  const rawConfigUI = isPlainObject(rawConfig.ui) ? rawConfig.ui : {};
  const rawState = isPlainObject(root.state) ? root.state : {};
  const rawStateUI = isPlainObject(rawState.ui) ? rawState.ui : {};
  const rawData = isPlainObject(root.data) ? root.data : {};

  const normalised = {
    config: {
      map: {
        options: normaliseMapOptions(rawConfigMap.options),
      },
      ui: {
        mode: normaliseMode(rawConfigUI.mode),
      },
    },
    state: {
      map: normaliseStateMap(rawState.map),
      ui: {
        mode: normaliseMode(rawStateUI.mode ?? rawConfigUI.mode),
      },
    },
    data: {
      geojson: null,
    },
  };

  if (typeof rawConfig.id === "string" && rawConfig.id.length > 0) {
    normalised.config.id = rawConfig.id;
  }

  if (Object.hasOwn(rawData, "geojson")) {
    const serialisableGeoJSON = toSerializableValue(rawData.geojson);
    normalised.data.geojson = serialisableGeoJSON ?? null;
  }

  return normalised;
}

/**
 * @param {WaymarkInstanceDocument} instanceDocument
 */
export function validateInstanceDocument(instanceDocument) {
  if (!isPlainObject(instanceDocument)) {
    return false;
  }

  const { config, state, data } = instanceDocument;
  if (!isPlainObject(config) || !isPlainObject(state) || !isPlainObject(data)) {
    return false;
  }

  return (
    typeof config.ui?.mode === "string" &&
    isPlainObject(config.map?.options) &&
    isPlainObject(state.map) &&
    typeof state.ui?.mode === "string" &&
    Object.hasOwn(data, "geojson")
  );
}

/**
 * @param {WaymarkInstanceDocument} instanceDocument
 * @returns {WaymarkInstanceDocument}
 */
export function serialiseInstanceDocument(instanceDocument) {
  const cloned = /** @type {WaymarkInstanceDocument | undefined} */ (
    toSerializableValue(instanceDocument)
  );

  if (!cloned || !validateInstanceDocument(cloned)) {
    throw new Error("Failed to serialise instance document.");
  }

  return cloned;
}
