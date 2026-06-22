---
name: waymark-js
description: Waymark JS reference. Use when working on source, docs, tests, or API/config behaviour for the MapLibre-based library.
---

# Waymark JS

Waymark JS is a small JavaScript map library built on [MapLibre GL](https://maplibre.org/). It exposes a simple `createInstance(...)` API, supports vector/raster basemap config, and gives direct access to the underlying MapLibre instance.

**Key facts:**

- Entry point: `import { createInstance } from './dist/waymark.js'`
- Source: `src/` — built with Vite into `dist/`
- Tests: `npm test` and `npm run test:browser` (workflow in `docs/1.development.md`)
- Docs source: `docs/` (also generates this skill file)

---

# Development

> Contributor guide for working on the Waymark JS library itself.

## Local workflow

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build library output: `npm run build`

`npm run build` also runs `node scripts/skill-md.js`, which regenerates `.agents/skills/waymark-js/SKILL.md` from the current `docs/*.md` files.

> [!NOTE]
> If you change docs content, run `npm run build` before shipping so the generated skill file stays in sync.

The dev app is `index.html` and loads `src/dev.js`, which creates a default `createInstance('map')` instance and exposes `window.createWaymarkInstance` and `window.waymarkInstance` for browser tests and debugging.

## Runtime notes

- Waymark now mounts a minimal Vue app shell per instance (`src/instance/ui/instanceApp.js`), so `vue` is a runtime dependency.
- `window.createWaymarkInstance` and `window.waymarkInstance` are development globals from `src/dev.js` only (not part of the library export surface).

## Testing

Tests protect the public docs and API behaviour:

- `tests/docs/` (Vitest + jsdom) verifies documented factory/config behaviour without WebGL.
- `tests/browser/` (Playwright) smoke-tests the real browser setup and checks the dev page behaviour from `src/dev.js`.

Run:

```bash
npm test
npm run test:browser
```

### Docs ↔ tests sync pattern

Treat docs and tests as one contract. When you change one, change the other in the same slice.

| Docs page             | Unit tests                       | Browser tests                       |
| --------------------- | -------------------------------- | ----------------------------------- |
| `docs/2.instances.md` | `tests/docs/2.instances.test.js` | `tests/browser/2.instances.test.js` |
| `docs/3.config.md`    | `tests/docs/3.config.test.js`    | `tests/browser/3.config.test.js`    |

Sync checklist:

1. Update docs section wording/examples.
2. Update matching test `describe` blocks and assertions.
3. Run `npm test` and `npm run test:browser`.
4. Confirm no stale filenames or headings remain.

---

# Instances

> Create Waymark instances and access the underlying MapLibre map.

## Quick Start

Waymark wraps [MapLibre GL](https://maplibre.org/) into a simple instance factory. Point it at a DOM element and it will render an interactive map.

```html
<!-- Map container -->
<div id="map" style="width: 100%; height: 400px;"></div>

<script type="module">
  import { createInstance } from "./dist/waymark.js";

  const instance = createInstance("map");
</script>
```

## Factory defaults

Default map values come from config defaults (`map.options.center: [0, 0]`, `map.options.zoom: 2`, OpenFreeMap Bright basemap).

## Factory signature

`createInstance(id?, config?, geojson?)`

| Parameter | Type     | Required | Description                                                                                                                                 |
| --------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`      | `string` | No       | The `id` of the DOM element to mount into. A random container is created when omitted. Throws if a provided `id` does not exist in the DOM. |
| `config`  | `object` | No       | Config object (see [docs/3.config.md](3.config.md))                                                                                         |
| `geojson` | `object` | No       | Initial GeoJSON overlay rendered on map load.                                                                                               |

## Factory options

### Example with options

```js
const instance = createInstance("map", {
  map: {
    options: {
      center: [-0.1276, 51.5074], // London
      zoom: 10,
      bearing: 15,
    },
    basemaps: [
      {
        type: "vector",
        style: "https://tiles.openfreemap.org/styles/bright",
      },
    ],
  },
});
```

`map.options` is forwarded directly to the MapLibre constructor (`new Map(options)`).

If both `map.options.style` and `map.basemaps` are set, `map.options.style` takes precedence.

## Accessing the MapLibre instance

The `map` property in the returned instance object is the underlying [`maplibre-gl` Map](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) instance.

```js
const instance = createInstance("map");

// Use the full MapLibre GL API
instance.map.on("load", () => {
  console.log("Map loaded");
});
```

## Instance registry behaviour

`createInstance()` is instance-first and ID-scoped. If an instance already exists for the same container ID, Waymark returns the existing `{ id, map }` rather than creating a second map.

## Initial GeoJSON on instance creation

`createInstance(id?, config?, geojson?)` accepts an optional third argument. When `geojson` is provided, Waymark adds a GeoJSON source and line layer for that instance (on load, or immediately if the map is already loaded).

```js
const geojson = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-0.13, 51.5],
          [-0.12, 51.51],
        ],
      },
      properties: {},
    },
  ],
};

const instance = createInstance("map", undefined, geojson);
```

GeoJSON source and layer IDs are scoped by instance ID to avoid collisions between multiple maps on the same page.

- Sources:
  - [`src/api/createInstance.js`](../src/api/createInstance.js)
  - [`src/instance/instanceGeojson.js`](../src/instance/instanceGeojson.js)
  - [`src/entry.js`](../src/entry.js)

---

# Config

> Configuration reference for `createInstance(id?, config?, geojson?)`.

## createInstance signature

`createInstance(id?, config?, geojson?)`

- `id` (`string`, optional): DOM element ID to mount into.
- `config` (`object`, optional): configuration object.
- `geojson` (`object`, optional): initial GeoJSON data to render after map load.

When `geojson` is provided, Waymark creates an instance-scoped GeoJSON source and line layer during initial load.

```js
createInstance("map", undefined, {
  type: "FeatureCollection",
  features: [],
});
```

All map settings live under `config.map`. Other namespaces may be added as the library grows.

## Default config source and merge behaviour

Default values come from `src/config/defaultConfig.json`:

```js
{
  map: {
    options: {
      center: [0, 0],
      zoom: 2,
    },
    basemaps: [
      {
        name: "OpenFreeMap Bright",
        type: "vector",
        style: "https://tiles.openfreemap.org/styles/bright",
      },
    ],
  },
}
```

Waymark resolves config with a deep merge:

- Base: `defaultConfig.json`
- Override: consumer `config`
- Objects merge recursively by key
- Arrays are replaced entirely (never merged by index)

This means `config.map.basemaps` replaces the default basemap list as a whole.

`config.map.options` is passed through to the MapLibre constructor (`new Map(options)`), with Waymark setting:

- `container` from `createInstance(id)`
- `style` from the precedence rules below

## Style precedence

Waymark resolves the map style in this order:

1. `config.map.options.style` (if provided)
2. Style derived from `config.map.basemaps[0]`

So `map.options.style` always overrides a basemap-derived style.

## Defaults

- `map.options.center`: `[0, 0]`
- `map.options.zoom`: `2`
- `basemaps[0]`: OpenFreeMap Bright vector style URL (`https://tiles.openfreemap.org/styles/bright`)

## config.map

| Option     | Type     | Default                       | Description                                                                                                                            |
| ---------- | -------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `options`  | `object` | `{ center: [0, 0], zoom: 2 }` | MapLibre constructor options. Forwarded to `new Map(options)` (except Waymark-controlled `container` and resolved `style`).            |
| `basemaps` | `array`  | OpenFreeMap Bright            | Array of basemap descriptors. The first entry is used as the active basemap style source. Replaces the default entirely when provided. |

## config.map.options

Use this object for MapLibre map constructor options.

| Property                                                                                               | Type  | Required | Description                          |
| ------------------------------------------------------------------------------------------------------ | ----- | -------- | ------------------------------------ |
| Any valid [MapLibre Map option](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/) | `any` | No       | Passed through to `new Map(options)` |

Common options:

| Property | Type               | Default                        | Description                                   |
| -------- | ------------------ | ------------------------------ | --------------------------------------------- |
| `center` | `[number, number]` | `[0, 0]`                       | Initial map centre as `[lng, lat]`            |
| `zoom`   | `number`           | `2`                            | Initial zoom level                            |
| `style`  | `string \| object` | Derived from `map.basemaps[0]` | Overrides basemap-derived style when provided |

```js
createInstance("map", {
  map: {
    options: {
      center: [-0.1276, 51.5074],
      zoom: 10,
      bearing: 15,
      pitch: 45,
    },
  },
});
```

## config.map.basemaps

Basemaps define the background map tiles. Waymark supports two types — `vector` and `raster`. The first basemap in the array is the active one. Providing your own `basemaps` array replaces the default entirely.

### Vector basemaps

| Property | Type       | Required | Description               |
| -------- | ---------- | -------- | ------------------------- |
| `name`   | `string`   | No       | Display name (for UI use) |
| `type`   | `'vector'` | Yes      | Basemap type              |
| `style`  | `string`   | Yes      | MapLibre style JSON URL   |

```js
createInstance("map", {
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
createInstance("map", {
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

> [!NOTE]
> `maxZoom` in your config is passed to the generated raster source as MapLibre style field `maxzoom`.

---

- Sources:
  - [`src/config/defaultConfig.json`](../src/config/defaultConfig.json)
  - [`src/instance/resolveConfig.js`](../src/instance/resolveConfig.js)
  - [`src/utils/deepMerge.js`](../src/utils/deepMerge.js)
