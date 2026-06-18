import { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const DEFAULT_CONFIG = {
  map: {
    center: [0, 0],
    zoom: 2,
    basemaps: [
      {
        name: 'OpenFreeMap Bright',
        type: 'vector',
        style: 'https://tiles.openfreemap.org/styles/bright',
      },
    ],
  },
}

/**
 * Resolve a basemap descriptor into a MapLibre style value.
 *
 * @param {object} basemap
 * @returns {string|object} A MapLibre style URL (vector) or inline style object (raster).
 */
function resolveBasemap(basemap) {
  if (basemap.type === 'vector') {
    return basemap.style
  }

  // raster
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: basemap.tiles,
        tileSize: basemap.tileSize ?? 256,
        attribution: basemap.attribution ?? '',
        ...(basemap.maxZoom !== undefined && { maxzoom: basemap.maxZoom }),
      },
    },
    layers: [
      {
        id: 'basemap',
        type: 'raster',
        source: 'basemap',
      },
    ],
  }
}

export class Waymark {
  /**
   * Create a new Waymark instance.
   *
   * @param {string} containerId - The DOM element ID to mount the map into.
   * @param {object} [config={}]
   * @param {object} [config.map] - Map configuration.
   * @param {[number, number]} [config.map.center] - Initial [lng, lat]. Defaults to [0, 0].
   * @param {number} [config.map.zoom] - Initial zoom level. Defaults to 2.
   * @param {object[]} [config.map.basemaps] - Ordered list of basemap descriptors. The first entry is used.
   * @param {'vector'|'raster'} config.map.basemaps[].type - Basemap type.
   * @param {string} [config.map.basemaps[].style] - Style URL (vector basemaps).
   * @param {string[]} [config.map.basemaps[].tiles] - Tile URL templates (raster basemaps).
   * @param {number} [config.map.basemaps[].tileSize] - Tile size in pixels (raster basemaps). Defaults to 256.
   * @param {string} [config.map.basemaps[].attribution] - Attribution text (raster basemaps).
   * @param {number} [config.map.basemaps[].maxZoom] - Maximum zoom level (raster basemaps).
   */
  constructor(containerId, config = {}) {
    this._containerId = containerId

    const map = { ...DEFAULT_CONFIG.map, ...config.map }
    const style = resolveBasemap(map.basemaps[0])

    this._map = new Map({
      container: containerId,
      style,
      center: map.center,
      zoom: map.zoom,
    })
  }

  /** The underlying MapLibre GL Map instance. */
  get map() {
    return this._map
  }
}
