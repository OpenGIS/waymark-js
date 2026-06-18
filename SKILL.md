---
name: waymark-js
description: Waymark JS library reference. Use when working on Waymark JS source code, writing features, fixing bugs, or answering questions about the API, options, Viewer, Editor, or Map configuration.
---

# Waymark JS

Waymark JS is a JavaScript library for creating and sharing geographical information, built on [Leaflet JS](https://leafletjs.com/). It supports a read-only Viewer mode and an interactive Editor mode. Data is stored as GeoJSON, with GPX and KML import support. No API key required.

**Key facts:**
- Entry point: `window.Waymark_Map_Factory.viewer()` / `window.Waymark_Map_Factory.editor()`
- Source: `src/` — built with Grunt into `dist/`
- Tests: `npm test` (see `tests/readme.md`)
- Docs site source: `docs/` (Nuxt Content)

---

# Start Here

> Waymark JS v2 — a MapLibre GL map library. Create and embed interactive maps with no API key required.

## What it does

Waymark JS wraps [MapLibre GL](https://maplibre.org/) into a simple, zero-config class. Point it at a DOM element and get a fully interactive map. The underlying MapLibre instance is exposed so you can use the full MapLibre API when needed.

## Quick start

```html
<!-- Map container -->
<div id="map" style="width: 100%; height: 400px;"></div>

<script type="module">
  import { Waymark } from "./dist/waymark.js";

  const waymark = new Waymark("map");
</script>
```

That's it — a world map centred at `[0, 0]` with zoom level `2`.

## Constructor

```js
new Waymark(containerId, options);
```

| Parameter     | Type     | Required | Description                               |
| ------------- | -------- | -------- | ----------------------------------------- |
| `containerId` | `string` | Yes      | The `id` of the DOM element to mount into |
| `options`     | `object` | No       | Configuration object (see below)          |

### Options

| Option   | Type               | Default                                       | Description          |
| -------- | ------------------ | --------------------------------------------- | -------------------- |
| `style`  | `string`           | `'https://demotiles.maplibre.org/style.json'` | MapLibre style URL   |
| `center` | `[number, number]` | `[0, 0]`                                      | Initial `[lng, lat]` |
| `zoom`   | `number`           | `2`                                           | Initial zoom level   |

#### Example with options

```js
const waymark = new Waymark("map", {
  style: "https://demotiles.maplibre.org/style.json",
  center: [-0.1276, 51.5074], // London
  zoom: 10,
});
```

## Accessing the MapLibre instance

The `.map` getter returns the underlying [`maplibre-gl` Map](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) instance directly:

```js
const waymark = new Waymark("map");

// Use the full MapLibre GL API
waymark.map.on("load", () => {
  console.log("Map loaded");
});
```

- Source: [`src/Waymark.js`](../src/Waymark.js)
- Entry point: [`src/entry.js`](../src/entry.js)


---

# Config

> Configuration reference for the Waymark constructor's second argument.

## Config

The second argument to the Waymark constructor is an optional config object. Config is namespaced — all map settings live under `config.map`. Other namespaces will be added as the library grows.

```js
new Waymark(containerId, (config = {}));
```

Full default config:

```js
const DEFAULT_CONFIG = {
  map: {
    center: [0, 0],
    zoom: 2,
    basemaps: [
      {
        name: "OpenFreeMap Bright",
        type: "vector",
        style: "https://tiles.openfreemap.org/styles/bright",
      },
    ],
  },
};
```

## config.map

| Option     | Type               | Default             | Description                                                                                                               |
| ---------- | ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `center`   | `[number, number]` | `[0, 0]`            | Initial map centre as `[lng, lat]`                                                                                        |
| `zoom`     | `number`           | `2`                 | Initial zoom level                                                                                                        |
| `basemaps` | `array`            | OpenFreeMap Liberty | Array of basemap descriptors. The first entry is used as the active basemap. Replaces the default entirely when provided. |

## config.map.basemaps

Basemaps define the background map tiles. Waymark supports two types — `vector` and `raster`. The first basemap in the array is the active one. Providing your own `basemaps` array replaces the default entirely.

### Vector basemaps

| Property | Type       | Required | Description               |
| -------- | ---------- | -------- | ------------------------- |
| `name`   | `string`   | No       | Display name (for UI use) |
| `type`   | `'vector'` | Yes      | Basemap type              |
| `style`  | `string`   | Yes      | MapLibre style JSON URL   |

```js
const waymark = new Waymark("map", {
  map: {
    basemaps: [
      {
        name: "OpenFreeMap Bright",
        type: "vector",
        style: "https://tiles.openfreemap.org/styles/bright",
      },
    ],
  },
});
```

> [!NOTE]
> Vector basemaps require a full MapLibre style JSON URL. Many providers offer these — [OpenFreeMap](https://openfreemap.org/) (free, no key), [MapTiler](https://www.maptiler.com/), and [Mapbox](https://www.mapbox.com/) among others. Some providers require an API key embedded in the style URL.

### Raster basemaps

| Property      | Type       | Required | Default | Description                                                        |
| ------------- | ---------- | -------- | ------- | ------------------------------------------------------------------ |
| `name`        | `string`   | No       | —       | Display name (for UI use)                                          |
| `type`        | `'raster'` | Yes      | —       | Basemap type                                                       |
| `tiles`       | `string[]` | Yes      | —       | Array of XYZ tile URL templates (`{z}`, `{x}`, `{y}` placeholders) |
| `attribution` | `string`   | No       | `''`    | Attribution text shown on the map                                  |
| `tileSize`    | `number`   | No       | `256`   | Tile size in pixels                                                |
| `maxZoom`     | `number`   | No       | —       | Maximum zoom level for the tile source                             |

```js
const waymark = new Waymark("map", {
  map: {
    basemaps: [
      {
        name: "OpenStreetMap",
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ],
  },
});
```

> [!NOTE]
> OpenStreetMap tiles are free but subject to a [usage policy](https://operations.osmfoundation.org/policies/tiles/). For production use, consider a dedicated tile provider or self-hosting.

---

- Source: [`src/Waymark.js`](../src/Waymark.js)

