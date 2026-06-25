const runtimeCoreRegistry = new Map();

/**
 * @typedef {import('./createInstanceCore.js').WaymarkInstanceCore} WaymarkInstanceCore
 */

/**
 * @param {string} instanceId
 * @returns {WaymarkInstanceCore | undefined}
 */
export function getCoreById(instanceId) {
  return runtimeCoreRegistry.get(instanceId);
}

/**
 * @param {string} instanceId
 * @param {WaymarkInstanceCore} core
 */
export function setCoreById(instanceId, core) {
  runtimeCoreRegistry.set(instanceId, core);
}

/**
 * @param {string} instanceId
 */
export function deleteCoreById(instanceId) {
  runtimeCoreRegistry.delete(instanceId);
}

export function clearRuntimeRegistry() {
  runtimeCoreRegistry.clear();
}
