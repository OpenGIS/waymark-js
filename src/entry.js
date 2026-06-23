import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker?url";
import { ensureContainer } from "./instance/ensureContainer.js";
import { createInstanceGeojson } from "./instance/instanceGeojson.js";
import { createInstanceMap } from "./instance/instanceMap.js";
import { getInstance, setInstance } from "./instance/instanceRegistry.js";
import { resolveConfig } from "./instance/resolveConfig.js";
import { createInstanceApp } from "./ui/instanceApp.js";

setWorkerUrl(workerUrl);

/**
 * Create a new Waymark instance.
 *
 * @param {string} [id]
 * @param {object} [config]
 * @param {object} [geojson]
 * @returns {{ id: string, map: import('maplibre-gl').Map }}
 */
export function createInstance(id, config, geojson) {
  const containerId = ensureContainer(id);
  const existingInstance = getInstance(containerId);

  if (existingInstance) {
    return { id: containerId, map: existingInstance.map };
  }

  const resolvedConfig = resolveConfig(config);
  const map = createInstanceMap(containerId, resolvedConfig);
  const app = createInstanceApp(containerId);
  const geojsonRuntime = createInstanceGeojson(map, containerId, geojson);

  setInstance(containerId, { id: containerId, map, app, geojsonRuntime });

  return { id: containerId, map };
}
