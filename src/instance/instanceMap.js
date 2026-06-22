import { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * @param {object} basemap
 */
function resolveBasemap(basemap) {
  if (basemap.type === 'vector') {
    return basemap.style
  }

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

/**
 * @param {string} containerId
 * @param {object} config
 */
export function createInstanceMap(containerId, config) {
  const style = resolveBasemap(config.map.basemaps[0])

  return new Map({
    container: containerId,
    style,
    center: config.map.center,
    zoom: config.map.zoom,
  })
}
