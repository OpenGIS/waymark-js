# Waymark JS

Waymark JS is a small JavaScript library for rendering interactive maps with [MapLibre GL](https://maplibre.org/).

No API key is required for the default setup.

> [!NOTE]
> The public config is now style-only. Set map appearance via `config.map.options.style` (string URL or inline style object).

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
  });
</script>
```

`map.options` is passed through to the MapLibre `new Map(options)` constructor.

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
- [Docs index](docs/README.md)
