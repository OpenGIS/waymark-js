import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * @param {string} containerId
 * @param {object} config
 */
export function createInstanceMap(containerId, config) {
  return new Map({
    ...config.map.options,
    container: containerId,
  });
}
