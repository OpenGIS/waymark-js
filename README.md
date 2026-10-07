# Waymark JS

> A headless GeoJSON runtime for MapLibre GL JS.

> [!WARNING]
> **v2 (Alpha)** — APIs are unstable and subject to change.

## Overview

Waymark JS renders GeoJSON layers on a [MapLibre GL JS](https://maplibre.org/) map. It is **headless**: the consumer creates and owns the map, container, style, camera, popups and cursors; Waymark mounts and manages its GeoJSON overlay on the injected map.

Waymark renders circle, line and fill geometry families with per-layer and typed paint (including icon name hooks), and keeps a serialisable document model that round-trips through `toJSON()`. It emits DOM `CustomEvent`s for layer lifecycle, runtime state and feature interaction — presentation stays in the consumer's hands.

MapLibre GL JS is a **peer dependency**. Waymark ships no MapLibre code, worker or CSS: install MapLibre alongside Waymark and import MapLibre's stylesheet yourself.

## Installation

```bash
npm install waymark-js maplibre-gl
```

## Quick start

```js
import { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createInstance } from "waymark-js";

// The consumer creates and owns the map.
const map = new Map({
  container: "map",
  style: "https://tiles.openfreemap.org/styles/bright",
  center: [-128.0097, 50.6539],
  zoom: 13,
});

// Waymark mounts its GeoJSON overlay onto the injected map.
const instance = createInstance({
  map,
  document: {
    config: { id: "map" },
    data: {
      layers: [
        {
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { title: "The Scarlet Ibis" },
                geometry: { type: "Point", coordinates: [-128.0097, 50.6539] },
              },
            ],
          },
        },
      ],
    },
  },
});

// Presentation is consumer-owned: Waymark emits, you decide what to show.
instance.on("waymark:feature.click", (event) => {
  const { feature, lngLat } = event.detail;
  console.log(feature.properties, lngLat);
});

// Call destroy() to remove Waymark-owned layers and listeners.
// The map itself stays yours to remove with map.remove().
instance.destroy();
```

## Events

Events are dispatched as `CustomEvent`s on the injected map's container (`map.getContainer()`). Use the standard `on`/`off`/`once` API:

```js
instance.on("waymark:feature.click", handler);
instance.once("waymark:instance.destroyed", handler);
```

| Group               | Events                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Lifecycle           | `waymark:instance.created`, `waymark:instance.destroyed`                                         |
| Data layers         | `waymark:data.layer.added`, `waymark:data.layer.mounted`, `waymark:data.layer.error`             |
| State               | `waymark:state.changed`, `waymark:state.debug.changed`, `waymark:state.types.visibility.changed` |
| Feature interaction | `waymark:feature.click`, `waymark:feature.hover`, `waymark:feature.leave`                        |

Popups, tooltips and cursor styling are consumer-owned. See the [API reference](docs/1.api.md#instance-event-api) for payload shapes.

## Serialisation

`instance.toJSON()` returns the canonical **InstanceDocument**: a plain, serialisable object with `config`, `state` and `data` slices.

```js
const document = instance.toJSON();

// The document is safe to persist and round-trip.
const restored = createInstance({ map: anotherMap, document });
```

- `config` — authored/default intent, kept stable across serialisation.
- `state` — runtime delta only; unchanged branches are omitted.
- `data.layers[]` — canonical `{ type: "geojson", data }` layers.

Runtime-enriched metadata (MapLibre source/layer IDs, lifecycle phase) is excluded, and map/camera/basemap state is never serialised — the consumer's map owns those.

## Commands

```bash
npm run dev           # Start the dev playground
npm run build         # Build the library to dist/waymark.js
npm run check:dist    # Assert the dist output shape (single bundle, bare maplibre-gl import, no CSS/worker/Vue)
npm run format        # Format with Prettier
npm run docs:sync     # Regenerate llms-full.txt; check docs contract and API doc sync
npm run check:llms    # Fail if docs/llms-full.txt is stale
npm test              # Unit tests (Vitest)
npm run test:browser  # Browser tests (Playwright)
npm run test:ci       # Full CI gate: format → llms check → docs sync → build → dist check → unit → browser tests
```

## CI/CD

Two GitHub Actions workflows automate the release pipeline:

- **CI** (`.github/workflows/ci.yml`) — validates every PR and push to `master` with the full `test:ci` gate.
- **Release** (`.github/workflows/release.yml`) — when `package.json` version changes on `master`, creates a git tag and a GitHub Release with auto-generated release notes.

![Waymark JS — development page](screenshots/dev-page.png)

## Further Reading

- [API reference](docs/1.api.md) — Consumer API contract, map injection, config defaults, events, and serialisation
- [Development guide](docs/2.development.md) — Contributor workflow, conventions, and testing
- [Instances](docs/3.instances.md) — Internal lifecycle and serialisation semantics
- [Map injection](docs/4.map.md) — Ownership boundaries, mounting, and cleanup
- [Data & GeoJSON](docs/6.data.md) — Layer contract, validation, and runtime behaviour
- [Docs index](docs/README.md)
