import defaultBasemaps from "./defaultBasemaps.json";

/**
 * @param {{ vector?: unknown[], raster?: unknown[] } | undefined} basemaps
 */
export function hasAnyBasemapEntries(basemaps) {
  const vectorCount = Array.isArray(basemaps?.vector)
    ? basemaps.vector.length
    : 0;
  const rasterCount = Array.isArray(basemaps?.raster)
    ? basemaps.raster.length
    : 0;
  return vectorCount + rasterCount > 0;
}

/**
 * @param {{ vector: object[], raster: object[] }} basemaps
 */
export function resolveRuntimeBasemaps(basemaps) {
  if (!hasAnyBasemapEntries(basemaps)) {
    return {
      vector: [...defaultBasemaps.vector],
      raster: [...defaultBasemaps.raster],
    };
  }

  return basemaps;
}

/**
 * @param {{ vector: object[] }} basemaps
 */
export function getActiveVectorBasemap(basemaps) {
  return basemaps.vector[0] ?? null;
}

export { defaultBasemaps };
