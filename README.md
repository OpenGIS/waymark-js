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
    id: "map",
    map: {
      options: {
        center: [-0.1276, 51.5074],
        zoom: 10,
      },
    },
  });

  instance.map.on("load", () => {
    console.log("Map ready");
    console.log(instance.getSnapshot());
  });

  // Tear down when no longer needed
  // instance.destroy();
</script>
```

`map.options` is passed through to the MapLibre `new Map(options)` constructor, except `container`, which Waymark always sets from `createInstance({ id })`.

## Instance container events

Each instance exposes a small container-centred event API:

- `instance.on(type, handler, options?)`
- `instance.off(type, handler, options?)`
- `instance.once(type, handler, options?)`

Handlers receive `CustomEvent`s dispatched from the instance container (`waymark:*`). Event families are:

- Lifecycle: `waymark:instance.created`, `waymark:instance.reused`, `waymark:instance.destroyed`
- Forwarded map events: `waymark:map.load`, `waymark:map.moveend`, `waymark:map.zoomend`, `waymark:map.rotateend`, `waymark:map.pitchend`

See [`docs/1.api.md`](docs/1.api.md#instance-event-api) for payload shapes and usage notes.

`instance.getSnapshot()` returns a serialisable per-instance snapshot from `src/state/createInstanceSnapshot.js`, including `ui.mode` (`"view"` or `"debug"`).

Waymark always mounts a Vue app shell (`src/ui/InstanceShell.vue`) in the map container. The shell content is mode-driven:

- `view` (default): shell present, no mode content
- `debug`: shell renders the **Instance snapshot** inspector via `src/ui/modes/InstanceShellModeDebug.vue`

`config.ui.mode` is normalised to `view` when invalid.

Shell refresh is driven by forwarded container events (`waymark:map.load`, `waymark:map.moveend`, `waymark:map.zoomend`, `waymark:map.rotateend`, `waymark:map.pitchend`) using end-event defaults rather than raw high-frequency map motion listeners. Runtime instance tracking is handled separately by the internal runtime registry in `src/core/runtimeRegistry.js`.

## Naming glossary

- **Instance**: the public object returned by `createInstance(...)` (`id`, `map`, `config`, `getSnapshot()`, `destroy()`, `on()`, `off()`, `once()`).
- **Runtime core**: internal lifecycle object assembled by `src/core/createInstanceCore.js` and tracked in `src/core/runtimeRegistry.js`.
- **Snapshot**: serialisable plain object returned by `instance.getSnapshot()`.
- **GeoJSON**: the map data format; written as `GeoJSON` in symbols and docs.

Set a custom style with `map.options.style`:

```js
createInstance({
  id: "map",
  map: {
    options: {
      style: "https://example.com/style.json",
    },
  },
});
```

## Documentation

- [API](docs/1.api.md)
- [Development guide](docs/2.development.md)
- [Instances internals](docs/3.instances.md)
- [Docs index](docs/README.md)
