# Waymark JS

> A JavaScript library for embedding interactive maps. No API key required.

> [!WARNING]
> **v2 — work in progress.** This is a complete rewrite. The v1 Leaflet/jQuery API is gone.

## Overview

Waymark JS v2 wraps [MapLibre GL](https://maplibre.org/) into a minimal class-based API. Drop a `<div>` on the page, pass its ID to `Waymark`, and get a fully interactive vector map. The underlying MapLibre instance is always accessible for advanced use.

Built with [Vite](https://vite.dev/) in library mode, shipping a single ESM bundle (`dist/waymark.js`).

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Vite serves `index.html` with the `src/main.js` dev entry — a bare `new Waymark('map')` instance.

## Build

```bash
npm run build
```

Outputs `dist/waymark.js` (ESM) and `dist/waymark.css`. Configured in [`vite.config.js`](vite.config.js).

## Usage

```js
import { Waymark } from './dist/waymark.js'

const waymark = new Waymark('map', {
  map: {
    center: [-0.1276, 51.5074], // [lng, lat]
    zoom: 10,
  },
})

// Access the MapLibre GL Map directly
waymark.map.on('load', () => console.log('ready'))
```

Config is namespaced — all map settings live under `config.map`. See [docs/2.config.md](docs/2.config.md) for the full config reference, including basemap options.

## Key dependencies

| Package                              | Purpose              |
| ------------------------------------ | -------------------- |
| [maplibre-gl](https://maplibre.org/) | Map rendering engine |
| [vite](https://vite.dev/)            | Build tooling        |

## Further reading

- [Start here](docs/1.index.md) — constructor API and options reference
- [Config reference](docs/2.config.md) — full `config.map` and basemap options
