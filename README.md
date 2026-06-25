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

Serialisable `config.map.options` values are passed through to the MapLibre `new Map(options)` constructor, except `container`, which Waymark always sets from `createInstance({ config: { id } })`.

Non-serialisable option values are dropped during normalisation to keep round-trip serialisation deterministic.

`createInstance(instanceJSON?)` is JSON-first. `instance.toJSON()` is the only public serialisation API and returns the canonical serialisable InstanceDocument.

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

`instance.toJSON()` returns a canonical serialisable per-instance document from `src/document/instanceDocument.js`, including `state.ui.mode` (`"view"` or `"debug"`).

Runtime metadata is intentionally separate from `toJSON()` and exposed only through the debug payload used by the debug UI.

Waymark always mounts a Vue app shell (`src/ui/InstanceShell.vue`) in the map container. The shell content is mode-driven:

- `view` (default): shell present, no mode content
- `debug`: shell renders the **Instance debug payload** inspector via `src/ui/modes/InstanceShellModeDebug.vue`

`config.ui.mode` is normalised to `view` when invalid.

Shell refresh is driven by forwarded container events (`waymark:map.load`, `waymark:map.moveend`, `waymark:map.zoomend`, `waymark:map.rotateend`, `waymark:map.pitchend`) using end-event defaults rather than raw high-frequency map motion listeners. Runtime instance tracking is handled separately by the internal runtime registry in `src/runtime/runtimeRegistry.js`.

## Naming glossary

- **Instance**: the public object returned by `createInstance(...)` (`id`, `toJSON()`, `ui.setMode()`, `destroy()`, `on()`, `off()`, `once()`).
- **Runtime core**: internal lifecycle object assembled by `src/runtime/createInstanceCore.js` and tracked in `src/runtime/runtimeRegistry.js`.
- **InstanceDocument**: canonical serialisable plain object returned by `instance.toJSON()`.
- **GeoJSON**: the map data format; written as `GeoJSON` in symbols and docs.

Set a custom style with `map.options.style`:

```js
createInstance({
  config: {
    id: "map",
    map: {
      options: {
        style: "https://example.com/style.json",
      },
    },
  },
});
```

## Documentation

- [API](docs/1.api.md)
- [Development guide](docs/2.development.md)
- [Instances internals](docs/3.instances.md)
- [Map module internals](docs/4.map.md)
- [UI module internals](docs/5.ui.md)
- [Docs index](docs/README.md)
