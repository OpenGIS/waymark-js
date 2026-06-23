# Waymark JS

Waymark JS is a small JavaScript library for rendering interactive maps with [MapLibre GL](https://maplibre.org/).

## Commands

```bash
npm install
npm run dev
npm run build # also refreshes .agents/skills/waymark-js/SKILL.md from docs/
npm run format
npm run format:check
npm test
npm run test:browser
```

## Minimal usage

```html
<div id="map" style="height: 400px"></div>
<script type="module">
  import { createInstance } from "./dist/waymark.js";

  const instance = createInstance("map", {
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

`map.options` is passed through to the MapLibre `new Map(options)` constructor.

`instance.getSnapshot()` returns a serialisable per-instance snapshot from `src/state/createInstanceSnapshot.js`. Runtime instance tracking is handled separately by the internal runtime registry in `src/core/runtimeRegistry.js`.

## Naming glossary

- **Instance**: the public object returned by `createInstance(...)` (`id`, `map`, `config`, `getSnapshot()`, `destroy()`).
- **Runtime core**: internal lifecycle object stored in `src/core/runtimeRegistry.js`.
- **Snapshot**: serialisable plain object returned by `instance.getSnapshot()`.
- **GeoJSON**: the map data format; written as `GeoJSON` in symbols and docs.

Set a custom style with `map.options.style`:

```js
createInstance("map", {
  map: {
    options: {
      style: "https://example.com/style.json",
    },
  },
});
```

## Documentation

- [Development guide](docs/1.development.md)
- [Instances](docs/2.instances.md)
- [Config](docs/3.config.md)
- [Naming](docs/4.naming.md)
- [Docs index](docs/README.md)
