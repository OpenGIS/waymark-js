# Waymark JS

Waymark JS is a small JavaScript library for rendering interactive maps with [MapLibre GL](https://maplibre.org/).

No API key is required for the default setup.

## Commands

```bash
npm install
npm run dev
npm run build # also refreshes .agents/skills/waymark-js/SKILL.md from docs/
npm test
npm run test:browser
```

## Minimal usage

```html
<div id="map" style="height: 400px"></div>
<script type="module">
  import { createInstance } from './dist/waymark.js'

  const instance = createInstance('map', {
    map: {
      center: [-0.1276, 51.5074],
      zoom: 10,
    },
  })

  instance.map.on('load', () => {
    console.log('Map ready')
  })
</script>
```

## Documentation

- [Development guide](docs/1.development.md)
- [Instances](docs/2.instances.md)
- [Config](docs/3.config.md)
