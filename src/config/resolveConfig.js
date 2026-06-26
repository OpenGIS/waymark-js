import { defaultConfig, resolveRuntimeBasemapDefaults } from "./defaults.js";
import { deepMerge } from "../utils/deepMerge.js";

/**
 * @typedef {object} WaymarkConfig
 * @property {{ options?: object, basemaps?: { vector?: object[], raster?: object[] } }} [map]
 * @property {{ mode?: unknown }} [ui]
 */

/**
 * @typedef {object} WaymarkResolvedConfig
 * @property {{ options: object, basemaps: { vector: object[], raster: object[] } }} map
 * @property {{ mode: 'view' | 'debug' }} ui
 */

/**
 * @param {unknown} mode
 */
function normaliseUIMode(mode) {
  return mode === "debug" || mode === "view" ? mode : "view";
}

/**
 * @param {WaymarkConfig} [config]
 * @returns {WaymarkResolvedConfig}
 */
export function resolveConfig(config = {}) {
  const resolved = deepMerge(defaultConfig, config ?? {});
  const resolvedMap =
    resolved.map && typeof resolved.map === "object" ? resolved.map : {};
  const resolvedBasemaps =
    resolvedMap.basemaps && typeof resolvedMap.basemaps === "object"
      ? resolvedMap.basemaps
      : { vector: [], raster: [] };
  const resolvedUI =
    resolved.ui && typeof resolved.ui === "object" ? resolved.ui : {};

  return {
    ...resolved,
    map: {
      ...resolvedMap,
      basemaps: resolveRuntimeBasemapDefaults({
        vector: Array.isArray(resolvedBasemaps.vector)
          ? resolvedBasemaps.vector
          : [],
        raster: Array.isArray(resolvedBasemaps.raster)
          ? resolvedBasemaps.raster
          : [],
      }),
    },
    ui: {
      ...resolvedUI,
      mode: normaliseUIMode(resolvedUI.mode),
    },
  };
}
