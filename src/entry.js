import { setWorkerUrl } from "maplibre-gl";
import workerURL from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { createInstanceCore } from "./runtime/createInstanceCore.js";
import { normaliseInstanceDocument } from "./document/instanceDocument.js";
import "./icons/waymark-icons.css";

setWorkerUrl(new URL(workerURL, import.meta.url).href);

/**
 * Create a new Waymark instance.
 *
 * @param {unknown} [instanceDocument]
 * @returns {import('./runtime/createInstanceCore.js').WaymarkInstancePublicApi}
 */
export function createInstance(instanceDocument) {
  const normalisedDocument = normaliseInstanceDocument(instanceDocument);
  // Deep-clone to strip any proxy wrappers (e.g. Vue reactivity) that
  // would cause structuredClone to fail downstream in createInstanceCore.
  const clean = JSON.parse(JSON.stringify(normalisedDocument));
  const { publicApi } = createInstanceCore(clean);
  return publicApi;
}
