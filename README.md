# Waymark JS

Waymark JS is a small JavaScript library for rendering interactive maps with [MapLibre GL](https://maplibre.org/).

## Commands

```bash
npm install
npm run dev
npm run build # also refreshes .agents/skills/waymark-js/SKILL.md from docs/
npm run format
npm run format:check
npm run docs:contract
npm run docs:api-sync
npm run docs:sync
npm test
npm run test:browser
```

## Minimal usage

```html
<div id="map" style="height: 400px"></div>
<script type="module">
  import { createInstance } from "./dist/waymark.js";

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
    console.log("Map ready");
    console.log(instance.toJSON());
  });

  // Tear down when no longer needed
  // instance.destroy();
</script>
```

Serialisable `config.map.options` values are passed through to the MapLibre `new Map(options)` constructor, except `container` (always set by Waymark from `createInstance({ config: { id } })`) and `style` (managed via `config.map.basemaps`).

Non-serialisable option values are dropped during normalisation to keep round-trip serialisation deterministic.

`createInstance(instanceDocument?)` is JSON-first. `instance.toJSON()` is the only public serialisation API and returns the canonical serialisable InstanceDocument.

## Runtime requirements

Waymark JS instances are browser-focused and DOM-dependent.

- Call `createInstance(...)` in a browser runtime where `document` exists.
- The target container must exist in the DOM (or Waymark appends a generated container to `document.body` when no `config.id` is provided).
- Instance events (`on`, `off`, `once`) use browser `CustomEvent`/`EventTarget` behaviour on the instance container.
- Map rendering depends on browser canvas/WebGL support via MapLibre.

For SSR frameworks, create instances client-side only (after the container exists).

## Instance container events

Each instance exposes a small container-centred event API:

- `instance.on(type, handler, options?)`
- `instance.off(type, handler, options?)`
- `instance.once(type, handler, options?)`

Handlers receive `CustomEvent`s dispatched from the instance container (`waymark:*`). Event families are:

- Lifecycle: `waymark:instance.created`, `waymark:instance.recreated`, `waymark:instance.destroyed`
- Forwarded map events: `waymark:map.load`, `waymark:map.moveend`, `waymark:map.zoomend`, `waymark:map.rotateend`, `waymark:map.pitchend`

See [`docs/1.api.md`](docs/1.api.md#instance-event-api) for payload shapes and usage notes.

`instance.toJSON()` returns a canonical serialisable per-instance document from `src/document/instanceDocument.js`.

- `config` is the stable resolved authored/default baseline.
- `state` is runtime-state persistence delta only (omits unchanged branches).

Runtime metadata is intentionally separate from `toJSON()` and not part of the public debug output.

Waymark always mounts a Vue app shell (`src/ui/InstanceShell.vue`) in the map container. The shell content is mode-driven:

- `view` (default): shell present, no mode content
- `debug`: shell renders a debug control button that toggles a debug panel with **Instance document** and **Waymark events (last 25)** sections

`config.ui.mode` is normalised to `view` when invalid.

Shell event history includes lifecycle, module, forwarded map events, and canonical runtime state events (`waymark:state.changed`, `waymark:state.*`) with bounded sanitised summaries. Runtime instance tracking is handled separately by the internal runtime registry in `src/runtime/runtimeRegistry.js`.

## Naming glossary

- **Instance**: the public object returned by `createInstance(...)` (`id`, `toJSON()`, `ui.setMode()`, `destroy()`, `on()`, `off()`, `once()`).
- **Runtime core**: internal lifecycle object assembled by `src/runtime/createInstanceCore.js` and tracked in `src/runtime/runtimeRegistry.js`.
- **InstanceDocument**: canonical serialisable plain object returned by `instance.toJSON()`.
- **GeoJSON**: the map data format; canonical InstanceDocument data shape is `data.layers[]`, where each layer is `{ geoJSON: object | null }`.

Data-layer semantics:

- Multiple GeoJSON layers are supported via `data.layers`.
- Stack order is top-first: `layers[0]` is visually on top (within the data-layer stack).
- Data layers are inserted after raster basemaps and before symbol layers.
- Geometry families map to MapLibre layer types:
  - `Point` / `MultiPoint` → `circle`
  - `LineString` / `MultiLineString` → `line`
  - `Polygon` / `MultiPolygon` → `fill`

Set basemaps with `map.basemaps.raster[]` and `map.basemaps.vector[]` (canonical readable order):

```js
createInstance({
  config: {
    id: "map",
    map: {
      basemaps: {
        raster: [
          {
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            title: "OpenStreetMap raster",
            attributionHTML:
              '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
            opacity: 0.75,
          },
        ],
        vector: [
          {
            styleURL: "https://example.com/style.json",
            title: "Example vector style",
            attributionHTML:
              '<a href="https://example.com/tiles">© Example Maps</a>',
          },
        ],
      },
    },
  },
});
```

## Documentation

### Feature slices

Basemaps is the canonical cross-module slice for this codebase:

- Public contract (config, events, serialisation): [`docs/1.api.md`](docs/1.api.md#map-options-pass-through)
- Runtime mechanics (MapLibre wiring + mutation flow): [`docs/4.map.md`](docs/4.map.md#runtime-behaviour)
- UI interaction flow (panel + controls): [`docs/5.ui.md`](docs/5.ui.md#basemaps-panel-composition)
- Contributor sync checklist: [`docs/2.development.md`](docs/2.development.md#basemaps-cross-module-contract-checklist)

- [API](docs/1.api.md)
- [Development guide](docs/2.development.md)
- [Instances internals](docs/3.instances.md)
- [Map module internals](docs/4.map.md)
- [UI module internals](docs/5.ui.md)
- [Docs index](docs/README.md)
