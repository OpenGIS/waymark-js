import { createInstanceCore } from "./runtime/createInstanceCore.js";
import { normaliseInstanceDocument } from "./document/instanceDocument.js";

const REQUIRED_MAP_METHODS = [
  "getContainer",
  "on",
  "off",
  "addSource",
  "addLayer",
  "getStyle",
  "fitBounds",
];

/**
 * @param {unknown} value
 */
function describeValue(value) {
  if (value === null) {
    return "null";
  }

  return typeof value;
}

/**
 * Validate that an injected value behaves like a MapLibre map.
 *
 * @param {unknown} map
 */
function validateMap(map) {
  if (!map || typeof map !== "object") {
    throw new TypeError(
      `createInstance({ map }) requires a MapLibre-compatible map instance; received ${describeValue(map)}.`,
    );
  }

  const missing = REQUIRED_MAP_METHODS.filter(
    (method) => typeof map[method] !== "function",
  );

  if (missing.length > 0) {
    throw new TypeError(
      `createInstance({ map }) requires a MapLibre-compatible map instance. Missing method(s): ${missing.join(", ")}.`,
    );
  }
}

/**
 * Create a new Waymark instance bound to a consumer-owned MapLibre map.
 *
 * @param {{ map: object, document?: unknown }} options
 * @returns {import('./runtime/createInstanceCore.js').WaymarkInstancePublicApi}
 */
export function createInstance({ map, document: instanceDocument } = {}) {
  validateMap(map);

  const normalisedDocument = normaliseInstanceDocument(instanceDocument);
  // Deep-clone to strip proxy-wrapped values from consumer-owned documents
  // that would cause structuredClone to fail downstream in createInstanceCore.
  const clean = JSON.parse(JSON.stringify(normalisedDocument));
  const { publicApi } = createInstanceCore(map, clean);
  return publicApi;
}
