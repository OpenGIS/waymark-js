import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-csp-worker?url";
import { createInstanceCore } from "./runtime/createInstanceCore.js";
import { normaliseInstanceDocument } from "./document/instanceDocument.js";

setWorkerUrl(workerUrl);

/**
 * Create a new Waymark instance.
 *
 * @param {unknown} [instanceJSON]
 * @returns {import('./runtime/createInstanceCore.js').WaymarkInstancePublicApi}
 */
export function createInstance(instanceJSON) {
  const instanceDocument = normaliseInstanceDocument(instanceJSON);
  const { publicApi } = createInstanceCore(instanceDocument);
  return publicApi;
}
