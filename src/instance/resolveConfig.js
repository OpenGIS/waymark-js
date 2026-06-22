import defaultConfig from "../config/defaultConfig.json";
import { deepMerge } from "../utils/deepMerge.js";

/**
 * @param {object} [config]
 */
export function resolveConfig(config = {}) {
    return deepMerge(defaultConfig, config ?? {});
}
