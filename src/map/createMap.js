import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * @param {string} containerId
 * @param {{ map: { options: object } }} config
 * @returns {import('maplibre-gl').Map}
 */
export function createMap(containerId, config) {
  return new Map({
    ...config.map.options,
    container: containerId,
  });
}
