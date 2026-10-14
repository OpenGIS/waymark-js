/**
 * Single source of truth for the vendored basemap fixture.
 *
 * Captures the seven screenshot viewports (centre, zoom, viewport size), the
 * outer geographic envelope they cover, the zooms the fixture vendors, the
 * hosts whose assets may be committed, and the licences that must travel with
 * them. Consumed by the generator (`refresh.mjs`), the serving middleware
 * (`vitePlugin.mjs`) and their unit tests.
 *
 * The dynamic viewports (quick-start, dev layer-added) derive their final
 * camera from the GeoJSON fixtures using MapLibre's own `fitBounds` maths, so
 * the envelope stays correct if the fixture data changes and the generator is
 * re-run.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURE_ROOT = path.resolve(import.meta.dirname, "..");
const GEOJSON_DIR = path.join(FIXTURE_ROOT, "geojson");

/** Root-relative mount path for vendored, non-style assets. */
export const SITE_PREFIX = "/__basemap__";

/** Root-relative URL of the vendored, canonical style. */
export { BASEMAP_STYLE_URL } from "./style.mjs";

/** Upstream canonical host: the only host with the open CORS policy. */
export const CANONICAL_STYLE_URL = "https://www.ogis.org/basemap/style.json";

/**
 * Hosts whose assets may be committed. Everything the generator fetches must
 * resolve to one of these (or a subdomain); anything else aborts the run.
 */
export const COMMITTABLE_HOSTS = ["www.ogis.org", "tiles.openfreemap.org"];

/**
 * Hosts the upstream basemap documents as permanently excluded.
 *
 * The legacy `*.github.io` host 301-redirects and drops the CORS headers, so
 * it must never be used. The `icons/` SVGs are never requested at runtime (the
 * sprite is the only icon path MapLibre takes), so they are not vendored.
 */
export const EXCLUDED_HOSTS = ["github.io"];

/** Licences to preserve for vendored assets. */
export const LICENCES = {
  osmData: "ODbL-1.0",
  openFreeMap: "MIT",
  openMapTilesStyle: "BSD-3-Clause",
  cartography: "CC-BY-4.0",
  openSans: "Apache-2.0",
  notoSans: "OFL-1.1",
};

/** Composite licence note recorded against each vendored asset kind. */
export const ASSET_LICENCES = {
  tile: "ODbL-1.0 (OpenStreetMap data) · MIT (OpenFreeMap) · BSD-3-Clause (OpenMapTiles schema) · CC-BY-4.0 (cartography)",
  glyph: "Apache-2.0 (Open Sans) · OFL-1.1 (Noto Sans)",
  sprite: "BSD-3-Clause (OpenMapTiles sprite code) · CC-BY-4.0 (cartography)",
};

/** Zoom levels vendored across the whole envelope, low to high. */
export const COVERAGE_ZOOMS = Object.freeze(
  Array.from({ length: 15 }, (_, zoom) => zoom),
);

/** Extra tiles vendored on every side, so partial edge tiles are covered. */
export const TILE_PAD = 1;

// ---------------------------------------------------------------------------
// MapLibre camera maths
// ---------------------------------------------------------------------------

const MAX_LATITUDE = 85.05112878;
const MAX_ZOOM = 22;
const TILE_SIZE = 512;

const LN2 = Math.log(2);

/**
 * @param {number} lng
 * @returns {number}
 */
function mercatorXFromLng(lng) {
  return (180 + lng) / 360;
}

/**
 * @param {number} lat
 * @returns {number}
 */
function mercatorYFromLat(lat) {
  const clamped = Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat));
  const radians = (clamped * Math.PI) / 180;
  return (
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2
  );
}

/**
 * @param {number} y
 * @returns {number}
 */
function latFromMercatorY(y) {
  const radians = Math.PI * (1 - 2 * y);
  return (180 / Math.PI) * Math.atan(Math.sinh(radians));
}

/**
 * @param {number} lng
 * @param {number} lat
 * @returns {[number, number]}
 */
function toMercator(lng, lat) {
  return [mercatorXFromLng(lng), mercatorYFromLat(lat)];
}

/**
 * Reproduce MapLibre's `cameraForBounds` for a north-up (bearing 0), unpitched
 * map with a symmetric pixel padding and no offset.
 *
 * @param {{ west: number, south: number, east: number, north: number }} bounds
 * @param {number} padding - pixel padding on every side
 * @param {{ width: number, height: number }} viewport
 * @returns {{ centre: [number, number], zoom: number }}
 */
export function fitBounds(bounds, padding, viewport) {
  const northWest = toMercator(bounds.west, bounds.north);
  const southEast = toMercator(bounds.east, bounds.south);
  const xs = [
    northWest[0],
    southEast[0],
    toMercator(bounds.east, bounds.north)[0],
    toMercator(bounds.west, bounds.south)[0],
  ];
  const ys = [
    northWest[1],
    southEast[1],
    toMercator(bounds.east, bounds.north)[1],
    toMercator(bounds.west, bounds.south)[1],
  ];

  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2;
  const scaleX = availableWidth / (spanX * TILE_SIZE);
  const scaleY = availableHeight / (spanY * TILE_SIZE);
  const zoom = Math.min(Math.log(Math.min(scaleX, scaleY)) / LN2, MAX_ZOOM);

  return {
    centre: [
      ((northWest[0] + southEast[0]) / 2) * 360 - 180,
      latFromMercatorY((northWest[1] + southEast[1]) / 2),
    ],
    zoom,
  };
}

/**
 * Geographic bounds of a north-up viewport centred on a camera state.
 *
 * @param {[number, number]} centre
 * @param {number} zoom
 * @param {{ width: number, height: number }} viewport
 * @returns {{ west: number, south: number, east: number, north: number }}
 */
export function viewportBounds(centre, zoom, viewport) {
  const scale = TILE_SIZE * 2 ** zoom;
  const [centreX, centreY] = toMercator(centre[0], centre[1]);
  const halfWidth = viewport.width / 2 / scale;
  const halfHeight = viewport.height / 2 / scale;

  return {
    west: (centreX - halfWidth) * 360 - 180,
    east: (centreX + halfWidth) * 360 - 180,
    south: latFromMercatorY(centreY + halfHeight),
    north: latFromMercatorY(centreY - halfHeight),
  };
}

// ---------------------------------------------------------------------------
// Fixture-derived camera states
// ---------------------------------------------------------------------------

/**
 * @param {string} name - file name under tests/fixtures/geojson
 * @returns {object}
 */
function readGeoJSON(name) {
  return JSON.parse(readFileSync(path.join(GEOJSON_DIR, name), "utf8"));
}

/**
 * @param {object} geoJSON
 * @returns {{ west: number, south: number, east: number, north: number }}
 */
function geojsonBounds(geoJSON) {
  const points = [];
  const visit = (coordinates) => {
    if (typeof coordinates?.[0] === "number") {
      points.push(coordinates);
      return;
    }
    for (const child of coordinates) {
      visit(child);
    }
  };
  visit(geoJSON.features.map((feature) => feature.geometry.coordinates));

  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);

  return {
    west: Math.min(...lngs),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    north: Math.max(...lats),
  };
}

// The API fixtures render into a 640×360 canvas; the dev harness renders into a
// full 1280×720 viewport. `fitBounds` uses a 20 px padding (see
// src/geojson/createGeoJSONModule.js).
const API_VIEWPORT = Object.freeze({ width: 640, height: 360 });
const DEV_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
const FIT_BOUNDS_PADDING = 20;

const markersBounds = geojsonBounds(readGeoJSON("markers.json"));
const quickStartCamera = fitBounds(
  markersBounds,
  FIT_BOUNDS_PADDING,
  API_VIEWPORT,
);

// Single-point data is expanded by a ~0.01° buffer before fitting (see
// computeGeoJSONBounds in src/geojson/createGeoJSONModule.js).
const samplePoint = readGeoJSON("sample-point.geojson").features[0].geometry
  .coordinates;
const samplePointBounds = {
  west: samplePoint[0] - 0.01,
  south: samplePoint[1] - 0.01,
  east: samplePoint[0] + 0.01,
  north: samplePoint[1] + 0.01,
};
const devLayerAddedCamera = fitBounds(
  samplePointBounds,
  FIT_BOUNDS_PADDING,
  DEV_VIEWPORT,
);

/**
 * The seven committed capture viewports, each with its final camera state.
 *
 * @type {ReadonlyArray<{ id: string, centre: readonly [number, number], zoom: number, viewport: { width: number, height: number }, derivation: string }>}
 */
export const CAPTURE_VIEWPORTS = Object.freeze([
  {
    id: "api-quick-start",
    centre: Object.freeze(quickStartCamera.centre),
    zoom: quickStartCamera.zoom,
    viewport: API_VIEWPORT,
    derivation: "fitBounds over tests/fixtures/geojson/markers.json",
  },
  {
    id: "api-geojson-families",
    centre: Object.freeze([-128.0145, 50.6525]),
    zoom: 14,
    viewport: API_VIEWPORT,
    derivation: "HOLBERG_CLOSEUP constant",
  },
  {
    id: "api-geojson-mixed",
    centre: Object.freeze([-128.0145, 50.6525]),
    zoom: 14,
    viewport: API_VIEWPORT,
    derivation: "HOLBERG_CLOSEUP constant",
  },
  {
    id: "dev-page",
    centre: Object.freeze([-128.0094, 50.6539]),
    zoom: 15,
    viewport: DEV_VIEWPORT,
    derivation: "dev/dev.js INITIAL_CENTER / INITIAL_ZOOM",
  },
  {
    id: "dev-layer-added",
    centre: Object.freeze(devLayerAddedCamera.centre),
    zoom: devLayerAddedCamera.zoom,
    viewport: DEV_VIEWPORT,
    derivation: "fitBounds over tests/fixtures/geojson/sample-point.geojson",
  },
  {
    id: "dev-popup",
    centre: Object.freeze([-128.0094, 50.6539]),
    zoom: 15,
    viewport: DEV_VIEWPORT,
    derivation: "dev/dev.js INITIAL_CENTER / INITIAL_ZOOM",
  },
  {
    id: "dev-popup-line",
    centre: Object.freeze([-128.0094, 50.6539]),
    zoom: 15,
    viewport: DEV_VIEWPORT,
    derivation: "dev/dev.js INITIAL_CENTER / INITIAL_ZOOM",
  },
]);

/**
 * Outer geographic box enclosing every capture viewport.
 *
 * @type {{ west: number, south: number, east: number, north: number }}
 */
export const DEMO_ENVELOPE = Object.freeze(
  CAPTURE_VIEWPORTS.reduce(
    (envelope, viewport) => {
      const bounds = viewportBounds(
        viewport.centre,
        viewport.zoom,
        viewport.viewport,
      );
      return {
        west: Math.min(envelope.west, bounds.west),
        south: Math.min(envelope.south, bounds.south),
        east: Math.max(envelope.east, bounds.east),
        north: Math.max(envelope.north, bounds.north),
      };
    },
    { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
  ),
);
