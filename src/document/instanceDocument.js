/**
 * @typedef {object} WaymarkVectorBasemap
 * @property {string | Record<string, unknown>} styleURL
 * @property {string} [title]
 * @property {string} [attributionHTML]
 * @property {number} [maxZoom]
 * @property {number} [opacity]
 */

/**
 * @typedef {object} WaymarkRasterBasemap
 * @property {string[]} tileURLTemplates
 * @property {string} [title]
 * @property {string} [attributionHTML]
 * @property {number} [tileSize]
 * @property {number} [minZoom]
 * @property {number} [maxZoom]
 * @property {number} [opacity]
 */

/**
 * @typedef {object} WaymarkBasemapConfig
 * @property {WaymarkVectorBasemap[]} vector
 * @property {WaymarkRasterBasemap[]} raster
 */

/**
 * @typedef {object} WaymarkInstanceDocumentConfig
 * @property {string} [id]
 * @property {{ options: Record<string, unknown>, basemaps?: Partial<WaymarkBasemapConfig> }} map
 * @property {{ mode: 'view' | 'debug' }} ui
 */

/**
 * @typedef {object} WaymarkInstanceDocumentStateMapOptions
 * @property {[number, number]} [center]
 * @property {number} [zoom]
 * @property {number} [bearing]
 * @property {number} [pitch]
 */

/**
 * @typedef {object} WaymarkInstanceDocumentStateMap
 * @property {WaymarkInstanceDocumentStateMapOptions} [options]
 * @property {Partial<WaymarkBasemapConfig>} [basemaps]
 */

/**
 * @typedef {object} WaymarkInstanceDocumentDataLayer
 * @property {object | null} geoJSON
 */

/**
 * @typedef {object} WaymarkInstanceDocument
 * @property {WaymarkInstanceDocumentConfig} config
 * @property {{ map?: WaymarkInstanceDocumentStateMap, ui?: { mode?: 'view' | 'debug' } }} state
 * @property {{ layers: WaymarkInstanceDocumentDataLayer[] }} data
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

  if (Object.hasOwn(mapOptions, "style")) {
    throw new Error(
      "Invalid config.map.options.style: use config.map.basemaps.vector[] instead.",
    );
  }

  const serialisable = toSerializableValue(mapOptions);
  return isPlainObject(serialisable) ? serialisable : {};
}

/**
 * @param {unknown} value
 * @param {string} path
 */
function expectPlainObject(value, path) {
  if (!isPlainObject(value)) {
    throw new Error(`Invalid ${path}: expected an object.`);
  }
}

/**
 * @param {unknown} value
 * @param {string} path
 */
function normaliseOptionalString(value, path) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${path}: expected a non-empty string.`);
  }

  return value;
}

/**
 * @param {unknown} value
 * @param {string} path
 */
function normaliseOptionalNumber(value, path) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid ${path}: expected a finite number.`);
  }

  return value;
}

/**
 * @param {unknown} value
 * @param {string} path
 */
function normaliseOptionalOpacity(value, path) {
  const opacity = normaliseOptionalNumber(value, path);

  if (opacity === undefined) {
    return undefined;
  }

  if (opacity < 0 || opacity > 1) {
    throw new Error(`Invalid ${path}: expected a number between 0 and 1.`);
  }

  return opacity;
}

/**
 * @param {unknown} value
 * @param {string} path
 */
function normaliseVectorStyleURL(value, path) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (isPlainObject(value)) {
    const serialisable = toSerializableValue(value);

    if (isPlainObject(serialisable)) {
      return serialisable;
    }
  }

  throw new Error(
    `Invalid ${path}: expected a non-empty string or style object.`,
  );
}

/**
 * @param {unknown} entry
 * @param {number} index
 * @returns {WaymarkVectorBasemap}
 */
function normaliseVectorBasemapEntry(entry, index) {
  const path = `config.map.basemaps.vector[${index}]`;
  expectPlainObject(entry, path);

  const allowedKeys = new Set([
    "styleURL",
    "title",
    "attributionHTML",
    "maxZoom",
    "opacity",
  ]);
  for (const key of Object.keys(entry)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `Invalid ${path}.${key}: unexpected key for vector basemap entry.`,
      );
    }
  }

  const styleURL = normaliseVectorStyleURL(entry.styleURL, `${path}.styleURL`);

  return {
    styleURL,
    ...(normaliseOptionalString(entry.title, `${path}.title`) !== undefined
      ? { title: normaliseOptionalString(entry.title, `${path}.title`) }
      : {}),
    ...(normaliseOptionalString(
      entry.attributionHTML,
      `${path}.attributionHTML`,
    ) !== undefined
      ? {
          attributionHTML: normaliseOptionalString(
            entry.attributionHTML,
            `${path}.attributionHTML`,
          ),
        }
      : {}),
    ...(normaliseOptionalNumber(entry.maxZoom, `${path}.maxZoom`) !== undefined
      ? { maxZoom: normaliseOptionalNumber(entry.maxZoom, `${path}.maxZoom`) }
      : {}),
    ...(normaliseOptionalOpacity(entry.opacity, `${path}.opacity`) !== undefined
      ? { opacity: normaliseOptionalOpacity(entry.opacity, `${path}.opacity`) }
      : {}),
  };
}

/**
 * @param {unknown} entry
 * @param {number} index
 * @returns {WaymarkRasterBasemap}
 */
function normaliseRasterBasemapEntry(entry, index) {
  const path = `config.map.basemaps.raster[${index}]`;
  expectPlainObject(entry, path);

  const allowedKeys = new Set([
    "tileURLTemplates",
    "title",
    "attributionHTML",
    "tileSize",
    "minZoom",
    "maxZoom",
    "opacity",
  ]);
  for (const key of Object.keys(entry)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `Invalid ${path}.${key}: unexpected key for raster basemap entry.`,
      );
    }
  }

  if (
    !Array.isArray(entry.tileURLTemplates) ||
    entry.tileURLTemplates.length === 0
  ) {
    throw new Error(
      `Invalid ${path}.tileURLTemplates: expected a non-empty string array.`,
    );
  }

  const tileURLTemplates = entry.tileURLTemplates.map((tile, tileIndex) => {
    if (typeof tile !== "string" || tile.length === 0) {
      throw new Error(
        `Invalid ${path}.tileURLTemplates[${tileIndex}]: expected a non-empty string.`,
      );
    }

    return tile;
  });

  return {
    tileURLTemplates,
    ...(normaliseOptionalString(entry.title, `${path}.title`) !== undefined
      ? { title: normaliseOptionalString(entry.title, `${path}.title`) }
      : {}),
    ...(normaliseOptionalString(
      entry.attributionHTML,
      `${path}.attributionHTML`,
    ) !== undefined
      ? {
          attributionHTML: normaliseOptionalString(
            entry.attributionHTML,
            `${path}.attributionHTML`,
          ),
        }
      : {}),
    ...(normaliseOptionalNumber(entry.tileSize, `${path}.tileSize`) !==
    undefined
      ? {
          tileSize: normaliseOptionalNumber(entry.tileSize, `${path}.tileSize`),
        }
      : {}),
    ...(normaliseOptionalNumber(entry.minZoom, `${path}.minZoom`) !== undefined
      ? { minZoom: normaliseOptionalNumber(entry.minZoom, `${path}.minZoom`) }
      : {}),
    ...(normaliseOptionalNumber(entry.maxZoom, `${path}.maxZoom`) !== undefined
      ? { maxZoom: normaliseOptionalNumber(entry.maxZoom, `${path}.maxZoom`) }
      : {}),
    ...(normaliseOptionalOpacity(entry.opacity, `${path}.opacity`) !== undefined
      ? { opacity: normaliseOptionalOpacity(entry.opacity, `${path}.opacity`) }
      : {}),
  };
}

/**
 * @param {unknown} rawBasemaps
 * @returns {WaymarkBasemapConfig}
 */
function normaliseBasemaps(rawBasemaps) {
  if (rawBasemaps === undefined) {
    return {
      raster: [],
      vector: [],
    };
  }

  expectPlainObject(rawBasemaps, "config.map.basemaps");

  const allowedKeys = new Set(["vector", "raster"]);
  for (const key of Object.keys(rawBasemaps)) {
    if (!allowedKeys.has(key)) {
      throw new Error(
        `Invalid config.map.basemaps.${key}: expected only vector and raster keys.`,
      );
    }
  }

  if (rawBasemaps.vector !== undefined && !Array.isArray(rawBasemaps.vector)) {
    throw new Error("Invalid config.map.basemaps.vector: expected an array.");
  }

  if (rawBasemaps.raster !== undefined && !Array.isArray(rawBasemaps.raster)) {
    throw new Error("Invalid config.map.basemaps.raster: expected an array.");
  }

  return {
    raster: (rawBasemaps.raster ?? []).map((entry, index) =>
      normaliseRasterBasemapEntry(entry, index),
    ),
    vector: (rawBasemaps.vector ?? []).map((entry, index) =>
      normaliseVectorBasemapEntry(entry, index),
    ),
  };
}

/**
 * @param {unknown} stateMap
 * @returns {WaymarkInstanceDocumentStateMap}
 */
function normaliseStateMapOptions(stateMapOptions) {
  if (!isPlainObject(stateMapOptions)) {
    return {};
  }

  /** @type {WaymarkInstanceDocumentStateMapOptions} */
  const normalised = {};

  for (const key of ["center", "zoom", "bearing", "pitch"]) {
    if (Object.hasOwn(stateMapOptions, key)) {
      normalised[key] = stateMapOptions[key];
    }
  }

  return normalised;
}

/**
 * @param {unknown} stateMap
 * @returns {WaymarkInstanceDocumentStateMap}
 */
function normaliseStateMap(stateMap) {
  if (!isPlainObject(stateMap)) {
    return {};
  }

  const normalisedOptions = normaliseStateMapOptions(stateMap.options);

  return {
    ...(Object.keys(normalisedOptions).length > 0
      ? { options: normalisedOptions }
      : {}),
    ...(Object.hasOwn(stateMap, "basemaps")
      ? { basemaps: normaliseBasemaps(stateMap.basemaps) }
      : {}),
  };
}

/**
 * @param {unknown} layer
 * @param {number} index
 * @returns {WaymarkInstanceDocumentDataLayer}
 */
function normaliseDataLayer(layer, index) {
  const path = `data.layers[${index}]`;
  expectPlainObject(layer, path);

  const allowedKeys = new Set(["geoJSON"]);
  for (const key of Object.keys(layer)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Invalid ${path}.${key}: unexpected key for data layer.`);
    }
  }

  const serialisableGeoJSON = toSerializableValue(layer.geoJSON);

  return {
    geoJSON: isPlainObject(serialisableGeoJSON) ? serialisableGeoJSON : null,
  };
}

/**
 * @param {unknown} layers
 * @returns {WaymarkInstanceDocumentDataLayer[]}
 */
function normaliseDataLayers(layers) {
  if (layers === undefined) {
    return [];
  }

  if (!Array.isArray(layers)) {
    throw new Error("Invalid data.layers: expected an array.");
  }

  return layers.map((layer, index) => normaliseDataLayer(layer, index));
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
        basemaps: normaliseBasemaps(rawConfigMap.basemaps),
      },
      ui: {
        mode: normaliseMode(rawConfigUI.mode),
      },
    },
    state: {
      ...(() => {
        const normalisedStateMap = normaliseStateMap(rawState.map);

        return Object.keys(normalisedStateMap).length > 0
          ? { map: normalisedStateMap }
          : {};
      })(),
      ...(rawStateUI.mode !== undefined
        ? {
            ui: {
              mode: normaliseMode(rawStateUI.mode),
            },
          }
        : {}),
    },
    data: {
      layers: [],
    },
  };

  if (typeof rawConfig.id === "string" && rawConfig.id.length > 0) {
    normalised.config.id = rawConfig.id;
  }

  if (Object.hasOwn(rawData, "layers")) {
    normalised.data.layers = normaliseDataLayers(rawData.layers);
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

  const basemaps = config.map?.basemaps;
  const hasValidBasemaps =
    basemaps === undefined ||
    (isPlainObject(basemaps) &&
      (basemaps.vector === undefined || Array.isArray(basemaps.vector)) &&
      (basemaps.raster === undefined || Array.isArray(basemaps.raster)));

  const hasValidStateMap =
    state.map === undefined ||
    (isPlainObject(state.map) &&
      (state.map.options === undefined || isPlainObject(state.map.options)) &&
      (state.map.basemaps === undefined ||
        (isPlainObject(state.map.basemaps) &&
          (state.map.basemaps.vector === undefined ||
            Array.isArray(state.map.basemaps.vector)) &&
          (state.map.basemaps.raster === undefined ||
            Array.isArray(state.map.basemaps.raster)))));

  const hasValidStateUI =
    state.ui === undefined ||
    (isPlainObject(state.ui) &&
      (state.ui.mode === undefined || typeof state.ui.mode === "string"));

  const hasValidDataLayers =
    Array.isArray(data.layers) &&
    data.layers.every(
      (layer) =>
        isPlainObject(layer) &&
        Object.hasOwn(layer, "geoJSON") &&
        Object.keys(layer).length === 1 &&
        (layer.geoJSON === null || isPlainObject(layer.geoJSON)),
    );

  return (
    typeof config.ui?.mode === "string" &&
    isPlainObject(config.map?.options) &&
    hasValidBasemaps &&
    hasValidStateMap &&
    hasValidStateUI &&
    hasValidDataLayers
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
