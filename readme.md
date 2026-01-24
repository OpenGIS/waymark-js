# Waymark JS

> [!CAUTION]
> Waymark JS v3 is currently in alpha.

Adding _meaning_ to GeoJSON.

Waymark JS is a JavaScript library for rendering GeoJSON data on a [OpenStreetMap](https://www.openstreetmap.org/) vector basemap.

Built on the shoulders of giants:

- [MapLibre GL JS](https://maplibre.org/) for map rendering
- [OpenStreetMap](https://www.openstreetmap.org/) for map data
- [OpenFreeMap](https://openfreemap.org/) for vector tiles

## Installation

### NPM

To install via NPM, run:

```bash
npm install @ogis/waymark-js
```

Then import the library and CSS in your JavaScript:

```javascript
import { createInstance } from "@ogis/waymark-js";
import "@ogis/waymark-js/dist/waymark-js.css";
```

### CDN

#### ES Module

To use via CDN, include the following in your HTML:

```html
<link
  rel="stylesheet"
  href="https://unpkg.com/@ogis/waymark-js/dist/waymark-js.css"
/>

<script type="module">
  import { createInstance } from "https://unpkg.com/@ogis/waymark-js/dist/waymark-js.js";
</script>
```

#### UMD

When you can't rely on native ES modules, you can load the bundled UMD build via a classic `<script>` tag. The bundle exposes a `WaymarkJS` global with the same `Instance` class that the package exports.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/@ogis/waymark-js/dist/waymark-js.css"
    />
    <script
      defer
      src="https://unpkg.com/@ogis/waymark-js/dist/waymark-js.umd.cjs"
    ></script>
  </head>
  <body>
    <div id="waymark-instance" style="height: 480px"></div>
    <script>
      window.addEventListener("DOMContentLoaded", () => {
        const instance = new WaymarkJS.createInstance({
          id: "waymark-instance",
        });
      });
    </script>
  </body>
</html>
```

If you're self-hosting the assets, replace the CDN URLs with your local `waymark-js.css` and `waymark-js.umd.cjs` paths.

## Usage

### HTML

Add a container element for the Instance:

```html
<div id="waymark-instance" style="height: 480px"></div>
```

> [!NOTE]
> The element that contains the Instance must have a **height** set, either inline or via CSS.

### JavaScript

Create a Waymark Instance with your configuration, then load some GeoJSON data:

```javascript
import { createInstance } from "@ogis/waymark-js";
import "@ogis/waymark-js/dist/waymark-js.css";

// Create a Waymark Instance with this configuration
const instance = createInstance({
  id: "waymark-instance",
  // Passed directly to MapLibre GL JS
  // See [MapLibre Map Options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)
  mapOptions: {
    zoom: 12,
  },

  // Can pass GeoJSON here
  // geoJSON: { type: "FeatureCollection", features: [] }

  // Callback function
  onLoad: (WaymarkInstance) => {
    console.log("Waymark Instance loaded:", WaymarkInstance.id);
  },
});

// Load this GeoJSON, which contains a single "pub" Marker
instance.addGeoJSON({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        // Waymark Object used to provide custom paint
        waymark: {
          paint: {
            "circle-radius": 6,
            "circle-color": "blue",
            "circle-stroke-color": "red",
            "circle-stroke-width": 6,
          },
        },
        type: "pub",
        title: "The Scarlet Ibis",
        description:
          "Great pub, great food! Especially after a Long Ride 🚴🍔🍟🍺🍺💤",
      },
      geometry: {
        type: "Point",
        coordinates: [-128.0094, 50.6539],
      },
    },
  ],
});
```

<!--
## Documentation

1. [Start Here](docs/v3/1.index.md)
2. [Instances](docs/v3/2.instances.md)
-->

## Development

> [!IMPORTANT]
> To build Waymark JS from source, you will need [Node + NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

```bash
# Install dependencies
npm install

# Run the dev server (& tests)
npm run dev

# Build for production
npm run build
```
