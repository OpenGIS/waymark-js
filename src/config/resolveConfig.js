import { defaultConfig } from "./defaults.js";

/**
 * @typedef {object} WaymarkConfig
 * @property {unknown} [debug]
 */

/**
 * @typedef {object} WaymarkResolvedConfig
 * @property {boolean} debug
 */

/**
 * @param {unknown} debug
 * @returns {boolean}
 */
function normaliseDebug(debug) {
  return debug === true;
}

/**
 * Resolve the authored config into runtime defaults.
 *
 * Map creation, basemap handling and camera state are owned by the consumer,
 * so only the remaining runtime-relevant config (debug) is resolved here.
 *
 * @param {WaymarkConfig} [config]
 * @returns {WaymarkResolvedConfig}
 */
export function resolveConfig(config = {}) {
  const resolved = {
    ...defaultConfig,
    ...(config ?? {}),
  };

  return {
    debug: normaliseDebug(resolved.debug),
  };
}
