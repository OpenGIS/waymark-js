import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker?url";
import { createInstanceCore } from "./core/createInstanceCore.js";
import { normaliseInstanceDocument } from "./instance/normaliseInstanceDocument.js";

setWorkerUrl(workerUrl);

/**
 * Create a new Waymark instance.
 *
 * @param {unknown} [instanceJSON]
 * @returns {import('./core/createInstanceCore.js').WaymarkInstancePublicApi}
 */
export function createInstance(instanceJSON) {
  const instanceDocument = normaliseInstanceDocument(instanceJSON);
  const { publicApi } = createInstanceCore(instanceDocument);
  return publicApi;
}
