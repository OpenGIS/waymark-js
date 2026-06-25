import { setWorkerUrl } from "maplibre-gl";
import workerURL from "maplibre-gl/dist/maplibre-gl-csp-worker?url";
import { createInstanceCore } from "./runtime/createInstanceCore.js";
import { normaliseInstanceDocument } from "./document/instanceDocument.js";

setWorkerUrl(workerURL);

/**
 * Create a new Waymark instance.
 *
 * @param {unknown} [instanceDocument]
 * @returns {import('./runtime/createInstanceCore.js').WaymarkInstancePublicApi}
 */
export function createInstance(instanceDocument) {
  const normalisedDocument = normaliseInstanceDocument(instanceDocument);
  const { publicApi } = createInstanceCore(normalisedDocument);
  return publicApi;
}
