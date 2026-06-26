/**
 * Canonical authored defaults for consumer config resolution.
 *
 * @type {{
 *   map: {
 *     options: {
 *       center: [number, number],
 *       zoom: number,
 *       attributionControl: boolean,
 *     },
 *     basemaps: {
 *       vector: Array<{ title: string, styleURL: string }>,
 *       raster: Array<object>,
 *     },
 *   },
 *   ui: { mode: 'view' },
 * }}
 */
export const defaultConfig = {
  map: {
    options: {
      center: [0, 0],
      zoom: 2,
      attributionControl: false,
    },
    basemaps: {
      vector: [],
      raster: [],
    },
  },
  ui: {
    mode: "view",
  },
};

/**
 * Runtime-injected default basemap entry used only when no basemap entries exist.
 *
 * @type {{ title: string, styleURL: string }}
 */
export const defaultBasemapVector = {
  title: "OpenFreeMap Bright",
  styleURL: "https://tiles.openfreemap.org/styles/bright",
};

/**
 * @type {{
 *   center: [number, number],
 *   zoom: number,
 *   bearing: number,
 *   pitch: number,
 * }}
 */
export const defaultCameraOptions = {
  center: [
    defaultConfig.map.options.center[0],
    defaultConfig.map.options.center[1],
  ],
  zoom: defaultConfig.map.options.zoom,
  bearing: 0,
  pitch: 0,
};

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
 * @param {{ vector?: object[], raster?: object[] }} basemaps
 */
export function resolveRuntimeBasemapDefaults(basemaps) {
  const vector = Array.isArray(basemaps?.vector) ? basemaps.vector : [];
  const raster = Array.isArray(basemaps?.raster) ? basemaps.raster : [];

  if (!hasAnyBasemapEntries({ vector, raster })) {
    return {
      vector: [{ ...defaultBasemapVector }],
      raster: [],
    };
  }

  return { vector, raster };
}
