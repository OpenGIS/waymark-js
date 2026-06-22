const instanceRegistry = new Map();

/**
 * @param {string} id
 */
export function getInstance(id) {
  return instanceRegistry.get(id);
}

/**
 * @param {string} id
 * @param {object} instance
 */
export function setInstance(id, instance) {
  instanceRegistry.set(id, instance);
}

export function clearInstanceRegistry() {
  instanceRegistry.clear();
}
