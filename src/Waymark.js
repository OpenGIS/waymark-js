import { Map, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-csp-worker?url'
import 'maplibre-gl/dist/maplibre-gl.css'

setWorkerUrl(workerUrl)

export class Waymark {
  /**
   * Create a new Waymark instance.
   *
   * @param {string} containerId - The DOM element ID to mount the map into.
   * @param {object} [options={}]
   * @param {string} [options.style] - MapLibre style URL.
   * @param {[number, number]} [options.center] - Initial [lng, lat].
   * @param {number} [options.zoom] - Initial zoom level.
   */
  constructor(containerId, options = {}) {
    this._containerId = containerId

    this._map = new Map({
      container: containerId,
      style: options.style ?? 'https://demotiles.maplibre.org/style.json',
      center: options.center ?? [0, 0],
      zoom: options.zoom ?? 2,
    })
  }

  /** The underlying MapLibre GL Map instance. */
  get map() {
    return this._map
  }
}
