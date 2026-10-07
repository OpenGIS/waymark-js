let runtimeCoreRegistry = new WeakMap();

/**
 * @typedef {import('./createInstanceCore.js').WaymarkInstanceCore} WaymarkInstanceCore
 */

/**
 * @param {object} map
 * @returns {WaymarkInstanceCore | undefined}
 */
export function getCoreByMap(map) {
  return runtimeCoreRegistry.get(map);
}

/**
 * @param {object} map
 * @param {WaymarkInstanceCore} core
 */
export function setCoreByMap(map, core) {
  runtimeCoreRegistry.set(map, core);
}

/**
 * @param {object} map
 */
export function deleteCoreByMap(map) {
  runtimeCoreRegistry.delete(map);
}

/**
 * Drop all runtime registrations. Intended for tests only.
 */
export function clearRuntimeRegistry() {
  runtimeCoreRegistry = new WeakMap();
}
