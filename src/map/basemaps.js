/**
 * @param {{ vector: object[] }} basemaps
 */
export function getActiveVectorBasemap(basemaps) {
  return basemaps.vector[0] ?? null;
}
