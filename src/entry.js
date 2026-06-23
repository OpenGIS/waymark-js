import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker?url";
import { createInstanceCore } from "./core/createInstanceCore.js";

setWorkerUrl(workerUrl);

/**
 * Create a new Waymark instance.
 *
 * @param {string} [id]
 * @param {import('./config/resolveConfig.js').WaymarkConfig} [config]
 * @param {object} [geoJSON]
 * @returns {import('./core/createInstanceCore.js').WaymarkInstancePublicApi}
 */
export function createInstance(id, config, geoJSON) {
  const { publicApi } = createInstanceCore(id, config, geoJSON);
  return publicApi;
}
