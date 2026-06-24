import defaultConfig from "./defaultConfig.json";
import { deepMerge } from "../utils/deepMerge.js";

/**
 * @typedef {object} WaymarkConfig
 * @property {{ options?: object }} [map]
 * @property {{ mode?: unknown }} [ui]
 */

/**
 * @typedef {object} WaymarkResolvedConfig
 * @property {{ options: object }} map
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
  const resolvedUI =
    resolved.ui && typeof resolved.ui === "object" ? resolved.ui : {};

  return {
    ...resolved,
    ui: {
      ...resolvedUI,
      mode: normaliseUIMode(resolvedUI.mode),
    },
  };
}
