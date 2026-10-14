/**
 * Waymark JS dev harness — the reference integration example.
 *
 * Demonstrates the consumer-owned pattern end to end:
 *   1. the consumer creates and owns the MapLibre map and container;
 *   2. the consumer registers any icon images (`map.loadImage` + `map.addImage`);
 *   3. the map is injected via `createInstance({ map, document })`.
 *
 * Waymark mounts the GeoJSON overlay and emits DOM events. Presentation —
 * popups, cursors, property filtering — stays in the consumer's hands.
 */
import { Map, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createInstance } from "../src/entry.js";
import {
  absolutizeSpriteURLs,
  BASEMAP_STYLE_URL,
} from "../tests/fixtures/basemap/style.mjs";

const INITIAL_CENTER = [-128.0094, 50.6539];
const INITIAL_ZOOM = 15;

const LAYER_URLS = [
  "/geojson/track-north-island.geojson",
  "/geojson/track-port-hardy-cape-scott.geojson",
  "/geojson/markers.json",
  "/geojson/shapes.json",
];

// Inline, deterministic marker icon (48x48 PNG data URL) — no remote assets.
// The `photo` type references it by name (`config.types[].icon`); the consumer
// registers it before Waymark mounts any symbol layers.
const PHOTO_MARKER_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAr0lEQVR42u2ZSw6AIBBDObI384i6NxEQ5tfaJm6lT4jMdFqTJMlU10BwhssCvRk6ztZ9SoB8NT0LA2M8BcTDeA8EzrwbRKR5F4ho808ISPMmEBlHx/QoZZvf2oUKX39rF6xvWKv3hQCMVBpgVq4A3ubdIVYWWJUABCAAARD+RuEvsl+XEuWKOdhyGr6hoWgp4Zt6iliFItiCjxYpwl2KeJ1iwEEzYqIY8tGMWSUJXDeNRV/EZHoDggAAAABJRU5ErkJggg==";

// The three image URL properties collapse into the single displayed image
// when any is present: thumbnail → medium → large.
const THUMBNAIL_PROPERTY_KEYS = [
  "image_thumbnail_url",
  "image_medium_url",
  "image_large_url",
];

async function loadJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
}

/**
 * Register the marker image once the style is available.
 *
 * MapLibre requires the style to be loaded before `addImage`. Waymark mounts
 * its symbol layers on map `load`, which fires after `style.load`, so
 * registering here guarantees the image exists before `photo` symbols render.
 *
 * @param {import('maplibre-gl').Map} map
 * @param {ImageBitmap | HTMLImageElement} image
 */
function registerPhotoMarker(map, image) {
  const addImage = () => {
    if (!map.hasImage("photo-marker")) {
      map.addImage("photo-marker", image);
    }
  };

  // The inline image decodes faster than the style's sources finish loading, so
  // `style.load` can already have fired while `isStyleLoaded()` is still false
  // (it only turns true once every source has loaded). A one-shot `style.load`
  // wait would then never run and the icon would never register. `load` fires
  // after the style and its sources are ready, so add there — or immediately if
  // the style is already fully loaded.
  if (map.isStyleLoaded()) {
    addImage();
    return;
  }

  map.once("load", addImage);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatPropertyValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Build the property-inspector DOM for a clicked feature: title heading,
 * image (when any image URL property is present), and the remaining
 * properties as key/value rows.
 *
 * @param {import('geojson').Feature} feature
 * @returns {HTMLElement}
 */
function buildPopupContent(feature) {
  const properties = feature?.properties ?? {};
  const root = document.createElement("div");
  root.className = "dev-popup";

  if (properties.title) {
    const heading = document.createElement("h3");
    heading.className = "dev-popup__title";
    heading.textContent = formatPropertyValue(properties.title);
    root.appendChild(heading);
  }

  const imageKey = THUMBNAIL_PROPERTY_KEYS.find((key) => properties[key]);
  const hiddenKeys = new Set(["title"]);

  if (imageKey) {
    const image = document.createElement("img");
    image.className = "dev-popup__image";
    image.src = formatPropertyValue(properties[imageKey]);
    image.alt = properties.title
      ? formatPropertyValue(properties.title)
      : "Feature image";
    root.appendChild(image);

    for (const key of THUMBNAIL_PROPERTY_KEYS) {
      hiddenKeys.add(key);
    }
  }

  const rows = Object.entries(properties).filter(
    ([key]) => !hiddenKeys.has(key),
  );

  if (rows.length > 0) {
    const table = document.createElement("table");
    table.className = "dev-popup__table";
    const body = document.createElement("tbody");

    for (const [key, value] of rows) {
      const row = document.createElement("tr");
      const label = document.createElement("th");
      label.scope = "row";
      label.textContent = key;
      const cell = document.createElement("td");
      cell.textContent = formatPropertyValue(value);
      row.append(label, cell);
      body.appendChild(row);
    }

    table.appendChild(body);
    root.appendChild(table);
  }

  return root;
}

/**
 * Anchor Point features on their coordinate; everything else on the click
 * location (`lngLat`).
 *
 * @param {import('geojson').Feature} feature
 * @param {import('maplibre-gl').LngLat | null} lngLat
 * @returns {import('maplibre-gl').LngLatLike | null}
 */
function resolvePopupLngLat(feature, lngLat) {
  const geometry = feature?.geometry;

  if (geometry?.type === "Point" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates;
  }

  return lngLat;
}

async function main() {
  const [routeDocument, samplePoint, ...layers] = await Promise.all([
    loadJSON("/route.json"),
    loadJSON("/geojson/sample-point.geojson"),
    ...LAYER_URLS.map(loadJSON),
  ]);

  // The consumer owns the map: create it with a real style and container,
  // then hand it to Waymark for the GeoJSON overlay.
  const map = new Map({
    container: "map",
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
    // No symbol/icon fade-in: a fade leaves the marker partially painted for a
    // few hundred milliseconds, which is impossible to capture deterministically.
    fadeDuration: 0,
  });

  // MapLibre requires an absolute sprite URL, while the vendored style authors
  // it root-relative to stay origin-independent. Resolve it at load time.
  map.setStyle(BASEMAP_STYLE_URL, { transformStyle: absolutizeSpriteURLs });

  // Register the icon image before Waymark mounts its symbol layers so the
  // `photo` type resolves without an "image not found" error.
  const photoMarker = await map.loadImage(PHOTO_MARKER_IMAGE);
  registerPhotoMarker(map, photoMarker.data);

  const instance = createInstance({
    map,
    document: {
      ...routeDocument,
      data: { layers: layers.map((data) => ({ data })) },
    },
  });

  window.createWaymarkInstance = createInstance;
  window.waymarkInstance = instance;
  window.waymarkInstances = { map: instance };
  window.waymarkMaps = { map };

  // Consumer-owned popup property inspector. Waymark emits the interaction;
  // the consumer decides how (or whether) to present it.
  let activePopup = null;

  instance.on("waymark:feature.click", (event) => {
    const { feature, lngLat } = event.detail;

    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }

    const anchor = resolvePopupLngLat(feature, lngLat);

    if (!anchor) {
      return;
    }

    activePopup = new Popup({ focusAfterOpen: false })
      .setLngLat(anchor)
      .setDOMContent(buildPopupContent(feature))
      .addTo(map);
  });

  instance.on("waymark:feature.hover", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  instance.on("waymark:feature.leave", () => {
    map.getCanvas().style.cursor = "";
  });

  let beerVisible = true;

  document.getElementById("dev-add-layer").addEventListener("click", () => {
    instance.data.addLayer({ data: samplePoint }, { fitBounds: true });
  });

  document.getElementById("dev-fit-bounds").addEventListener("click", () => {
    instance.data.fitBounds();
  });

  document.getElementById("dev-toggle-beer").addEventListener("click", () => {
    beerVisible = !beerVisible;
    instance.types.setVisibility("beer", beerVisible);
  });

  const debugCheckbox = document.getElementById("dev-debug");
  debugCheckbox.checked = routeDocument.config.debug === true;
  debugCheckbox.addEventListener("change", () => {
    instance.debug.setEnabled(debugCheckbox.checked);
  });
}

main().catch((error) => {
  console.error("[waymark:dev] Failed to start development page", error);
});
