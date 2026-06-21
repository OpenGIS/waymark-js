---
name: waymark-js
description: Waymark JS reference. Use when working on source, docs, tests, or API/config behaviour for the MapLibre-based library.
---

# Waymark JS

Waymark JS is a small JavaScript map library built on [MapLibre GL](https://maplibre.org/). It exposes a simple `Waymark` class, supports vector/raster basemap config, and gives direct access to the underlying MapLibre instance.

**Key facts:**
- Entry point: `import { Waymark } from './dist/waymark.js'`
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

The dev app is `index.html` and loads `src/dev.js`, which creates a default `new Waymark('map')` instance and exposes `window.Waymark` and `window.waymark` for browser tests and debugging.

## Testing

Tests protect the public docs and API behaviour:

- `tests/docs/` (Vitest + jsdom) verifies documented constructor/config behaviour without WebGL.
- `tests/browser/` (Playwright) smoke-tests the real browser setup and checks the dev page behaviour from `src/dev.js`.

Run:

```bash
npm test
npm run test:browser
```

### Docs ↔ tests sync pattern

Treat docs and tests as one contract. When you change one, change the other in the same slice.

| Docs page | Unit tests | Browser tests |
| --- | --- | --- |
| `docs/2.instances.md` | `tests/docs/2.instances.test.js` | `tests/browser/2.instances.test.js` |
| `docs/3.config.md` | `tests/docs/3.config.test.js` | `tests/browser/3.config.test.js` |

Sync checklist:

1. Update docs section wording/examples.
2. Update matching test `describe` blocks and assertions.
3. Run `npm test` and `npm run test:browser`.
4. Confirm no stale filenames or headings remain.


---

# Instances

> Create Waymark instances and access the underlying MapLibre map.

## Quick start

Waymark wraps [MapLibre GL](https://maplibre.org/) into a simple class. Point it at a DOM element and it will render an interactive map.

```html
<!-- Map container -->
<div id="map" style="width: 100%; height: 400px;"></div>

<script type="module">
  import { Waymark } from './dist/waymark.js'

  const waymark = new Waymark('map')
</script>
```

Default map values come from config defaults (`center: [0, 0]`, `zoom: 2`, OpenFreeMap Bright basemap).

## Constructor

`new Waymark(containerId, options)`

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `containerId` | `string` | Yes | The `id` of the DOM element to mount into |
| `options` | `object` | No | Config object (see [docs/3.config.md](3.config.md)) |

### Example with options

```js
const waymark = new Waymark('map', {
  map: {
    center: [-0.1276, 51.5074], // London
    zoom: 10,
    basemaps: [
      {
        type: 'vector',
        style: 'https://tiles.openfreemap.org/styles/bright',
      },
    ],
  },
})
```

## Accessing the MapLibre instance

The `.map` getter returns the underlying [`maplibre-gl` Map](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) instance directly.

```js
const waymark = new Waymark('map')

// Use the full MapLibre GL API
waymark.map.on('load', () => {
  console.log('Map loaded')
})
```

- Source: [`src/Waymark.js`](../src/Waymark.js)
- Entry point: [`src/entry.js`](../src/entry.js)


---

# Config

> Configuration reference for the Waymark constructor's second argument.

## Config

The second argument to the Waymark constructor is an optional config object. Config is namespaced — all map settings live under `config.map`. Other namespaces will be added as the library grows.

```js
new Waymark(containerId, config)
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
| `basemaps` | `array`            | OpenFreeMap Bright | Array of basemap descriptors. The first entry is used as the active basemap. Replaces the default entirely when provided. |

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

