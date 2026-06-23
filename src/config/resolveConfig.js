import defaultConfig from "./defaultConfig.json";
import { deepMerge } from "../utils/deepMerge.js";

/**
 * @typedef {object} WaymarkConfig
 * @property {{ options?: object }} [map]
 */

/**
 * @typedef {object} WaymarkResolvedConfig
 * @property {{ options: object }} map
 */

/**
 * @param {WaymarkConfig} [config]
 * @returns {WaymarkResolvedConfig}
 */
export function resolveConfig(config = {}) {
  return deepMerge(defaultConfig, config ?? {});
}
