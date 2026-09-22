---
last_commit: "882d777cf270e4c6b2ef175bf1d7fdc0ccbd2523"
---

# Waymark JS

> Create, share and edit _meaningful_ Maps.

> [!WARNING]
> **v2 (Alpha)** — This is a ground-up rewrite. APIs are unstable and subject to change.

> [!NOTE]
> No API keys required. OpenStreetMap and Open GIS Outdoors tiles included out of the box.

## Overview

Waymark JS is a browser library for rendering interactive maps with data layers. It stores geographic data as GeoJSON and supports raster and vector tile basemaps.

v2 is a complete rewrite — from jQuery + Leaflet to a modern ES module built with [MapLibre GL](https://maplibre.org/), [Vue 3](https://vuejs.org/) and [Vite](https://vite.dev/).

## Installation

Clone, install, and build from source:

```bash
git clone https://github.com/OpenGIS/Waymark-JS
cd Waymark-JS
npm install
npm run build
```

The library build outputs exactly two files: `dist/waymark.js` and `dist/waymark.css`. The MapLibre GL worker is inlined into `dist/waymark.js` as a base64 data URL, so there is no separate worker asset to serve.

## Quick start

```html
<div id="map" style="height: 400px"></div>

<script type="module">
  import { createInstance } from "./dist/waymark.js";
  import "./dist/waymark.css";

  const instance = createInstance({
    config: {
      id: "map",
      map: {
        options: {
          center: [-0.1276, 51.5074],
          zoom: 10,
        },
      },
    },
  });

  instance.on("waymark:map.load", () => {
    console.log("Map ready", instance.toJSON());
  });
</script>
```

## How it works

Waymark uses a document-based architecture. Pass a serialisable **InstanceDocument** to `createInstance()` — the same shape returned by `instance.toJSON()`:

```js
const instance = createInstance({
  config: {
    id: "map",
    map: {
      options: { center: [-0.1276, 51.5074], zoom: 10 },
      basemaps: {
        raster: [
          {
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            title: "OpenStreetMap",
          },
        ],
        vector: [
          {
            styleURL:
              "https://raw.githubusercontent.com/OpenGIS/outdoors/refs/heads/master/style.json",
            title: "Open GIS Outdoors",
          },
          {
            styleURL: "https://tiles.openfreemap.org/styles/bright",
            title: "OpenFreeMap Bright",
          },
        ],
      },
    },
  },
  data: {
    layers: [
      {
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { title: "Hello" },
              geometry: { type: "Point", coordinates: [-0.1276, 51.5074] },
            },
          ],
        },
      },
    ],
  },
});
```

Serialisable `config.map.options` values are passed through to the MapLibre `Map` constructor, except `container` (always set by Waymark) and `style` (managed via basemaps).

Calling `createInstance()` with the same `id` destroys the previous instance and creates a fresh one.

### Key concepts

- **Instance** — the object returned by `createInstance()`, with lifecycle, event, data, and UI methods.
- **InstanceDocument** — the serialisable payload accepted as input and returned by `toJSON()`. Round-trip safe.
- **Config** — the authored baseline. Remains stable across serialisation.
- **State** — runtime delta only. Persisted when values diverge from config.
- **Data layers** — GeoJSON in `data.layers[]`, added at init or via `instance.data.addLayer()`.

## Events

Events are dispatched as `CustomEvent`s on the instance container. Use the standard `on`/`off`/`once` API:

```js
instance.on("waymark:map.load", handler);
instance.once("waymark:instance.destroyed", handler);
```

Lifecycle: `waymark:instance.created`, `waymark:instance.recreated`, `waymark:instance.destroyed`

Map: `waymark:map.load`, `waymark:map.moveend`, `waymark:map.zoomend`, `waymark:map.rotateend`, `waymark:map.pitchend`, `waymark:map.error`

Data: `waymark:data.layer.added`, `waymark:data.layer.mounted`, `waymark:data.layer.error`

State: `waymark:state.changed`, `waymark:state.*`

See the [API reference](docs/1.api.md#instance-event-api) for payload shapes.

## Runtime requirements

- Browser runtime with DOM access (not SSR-safe)
- The target container element must exist before calling `createInstance()`
- If `config.id` is omitted, Waymark generates one and appends the container to `document.body`
- Map rendering depends on browser canvas/WebGL support via MapLibre GL

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm test             # Unit tests (Vitest)
npm run test:ci      # Full CI gate (format → docs sync → unit tests → browser tests)
npm run test:browser # Browser tests (Playwright; builds dist/ automatically via pretest:browser)
npm run build        # Production bundle to dist/
npm run format       # Format with Prettier
npm run docs:sync    # Sync generated docs and SKILL.md
```

`npm run test:browser` includes a built-bundle test that serves `dist/` via `vite preview` and verifies the map loads from the built bundle with the inlined worker (no dead-worker stall). It skips automatically when `dist/waymark.js` is missing — a fallback for direct `npx playwright test` runs, since `npm run test:browser` builds `dist/` automatically via the `pretest:browser` hook.

## CI/CD

Two GitHub Actions workflows automate the release pipeline:

- **CI** (`.github/workflows/ci.yml`) — validates every PR and push to `master` with the full `test:ci` gate.
- **Release** (`.github/workflows/release.yml`) — when `package.json` version changes on `master`, creates a git tag and a GitHub Release with auto-generated release notes.

![Waymark JS — basemaps panel](tests/browser/screenshots/dev-basemaps-panel.png)

## Further Reading

- [API reference](docs/1.api.md) — Full consumer API contract, config defaults, events, and serialisation
- [Development guide](docs/2.development.md) — Contributor workflow, conventions, and testing
- [Instances](docs/3.instances.md) — Internal lifecycle and serialisation semantics
- [Map module](docs/4.map.md) — MapLibre wiring, basemaps, and state sync
- [UI module](docs/5.ui.md) — Shell components, mode system, and debug panel
- [Data & GeoJSON](docs/6.data.md) — Layer contract, validation, and runtime behaviour
- [Docs index](docs/README.md)
