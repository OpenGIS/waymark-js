/**
 * Padded Web-Mercator tile enumeration for the vendored basemap fixture.
 *
 * Pure and dependency-free: a geographic box plus a zoom range maps to tile
 * ranges. Shared by the fixture generator and its unit tests so both agree on
 * exactly which tiles the vendored set covers.
 */

// Web-Mercator clamps latitude to a finite range; beyond it the projection
// diverges. MapLibre uses the same bound.
const MAX_LATITUDE = 85.05112878;

/**
 * Web-Mercator tile x-index (column) for a longitude at a zoom level.
 *
 * The result is clamped to the tile pyramid, so longitudes on or beyond the
 * antimeridian resolve to a valid column.
 *
 * @param {number} lng
 * @param {number} zoom
 * @returns {number}
 */
export function tileXFromLng(lng, zoom) {
  const index = Math.floor(((lng + 180) / 360) * 2 ** zoom);
  return Math.max(0, Math.min(2 ** zoom - 1, index));
}

/**
 * Web-Mercator tile y-index (row) for a latitude at a zoom level.
 *
 * Latitude is clamped to the Web-Mercator bound and the result to the tile
 * pyramid, so results are stable at the poles.
 *
 * @param {number} lat
 * @param {number} zoom
 * @returns {number}
 */
export function tileYFromLat(lat, zoom) {
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const radians = (clamped * Math.PI) / 180;
  const y =
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2;
  const index = Math.floor(y * 2 ** zoom);
  return Math.max(0, Math.min(2 ** zoom - 1, index));
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Inclusive tile ranges covering a geographic box at every zoom in a range.
 *
 * Ranges are clamped to the tile pyramid and optionally padded by `pad` tiles
 * on every side. The north bound maps to the smallest y-index, the south bound
 * to the largest.
 *
 * @param {{ west: number, south: number, east: number, north: number }} bounds
 * @param {{ minZoom?: number, maxZoom?: number, pad?: number }} [options]
 * @returns {Array<{ zoom: number, minX: number, maxX: number, minY: number, maxY: number }>}
 */
export function tileRanges(bounds, options = {}) {
  const { minZoom = 0, maxZoom = 14, pad = 0 } = options;
  const ranges = [];

  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const last = 2 ** zoom - 1;

    ranges.push({
      zoom,
      minX: clamp(tileXFromLng(bounds.west, zoom) - pad, 0, last),
      maxX: clamp(tileXFromLng(bounds.east, zoom) + pad, 0, last),
      minY: clamp(tileYFromLat(bounds.north, zoom) - pad, 0, last),
      maxY: clamp(tileYFromLat(bounds.south, zoom) + pad, 0, last),
    });
  }

  return ranges;
}

/**
 * Flat, deterministically ordered list of tiles covering a geographic box.
 *
 * Ordered by zoom, then column, then row, so repeated runs and stored manifests
 * compare byte-for-byte.
 *
 * @param {{ west: number, south: number, east: number, north: number }} bounds
 * @param {{ minZoom?: number, maxZoom?: number, pad?: number }} [options]
 * @returns {Array<{ z: number, x: number, y: number }>}
 */
export function enumerateTiles(bounds, options = {}) {
  const tiles = [];

  for (const range of tileRanges(bounds, options)) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      for (let y = range.minY; y <= range.maxY; y += 1) {
        tiles.push({ z: range.zoom, x, y });
      }
    }
  }

  return tiles;
}

/**
 * Canonical string key for a tile.
 *
 * @param {{ z: number, x: number, y: number }} tile
 * @returns {string}
 */
export function tileKey(tile) {
  return `${tile.z}/${tile.x}/${tile.y}`;
}
