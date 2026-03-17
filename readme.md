# Waymark JS

> [!CAUTION]
> Waymark JS v3 is currently in alpha.

Adding _meaning_ to GeoJSON.

Waymark JS is a JavaScript library for rendering GeoJSON data on a [OpenStreetMap](https://www.openstreetmap.org/) vector basemap.

**[View the Demo](https://opengis.github.io/Waymark-JS/)**

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

<!--
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
-->

## Usage

### HTML

Add a container element for the Instance:

```html
<div id="waymark-instance" style="height: 480px"></div>
```

> [!NOTE]
> Instance element must have a **height** in order to be visible.
> If there isn't a DOM element with the given id, Waymark JS will create one for you and append it to the body (with 100% width and height).

### JavaScript

Create a Waymark Instance with your configuration, showing some GeoJSON data:

```javascript
import { createInstance } from "@ogis/waymark-js";
import "@ogis/waymark-js/dist/waymark-js.css";

const instance = createInstance({
  // Will console.log() all Waymark JS Events
  // debug: true,

  // Unique ID repesenting the DOM element to load the Instance into
  // Is added to the DOM if it doesn't exist
  id: "waymark-instance",

  // MapLibre GL JS Options
  // See [MapLibre Map Options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)
  mapOptions: {
    zoom: 12,
  },

  // Can pass GeoJSON here
  geoJSON: {
    type: "FeatureCollection",
    features: [
      {
        // Set an ID here so you can access the Overlay
        id: "pub-marker",
        type: "Feature",
        properties: {
          // Waymark Properties
          waymark: {
            // The Title & Descrption will display when the Marker is clicked
            title: "The Scarlet Ibis",
            description:
              "Great pub, great food! Especially after a Long Ride 🚴🍔🍟🍺🍺💤",

            // MapLibre GL JS Layer Paint Properties
            paint: {
              "circle-radius": 20,
              "circle-color": "white",
              "circle-stroke-color": "brown",
              "circle-stroke-width": 6,
            },

            // Marker Icons
            icon: {
              // <img /> and <i /> tags work well here
              html: `<div style="font-size:32px">🍺</div>`,

              // Inline SVG supported
              // svg: `<svg />`

              // Image URLs supported
              // url: "https://...pint.png
            },
          },
        },
        geometry: {
          type: "Point",
          coordinates: [-128.0094, 50.6539],
        },
      },
    ],
  },

  // This function is called when the Instance has finished loading
  // and is passed the Instance as an argument
  onLoad: (thisInstance) => {
    //Get the Waymark JS Overlay for the "pub-marker" Feature
    const pubMarker = thisInstance.geoJSONStore.getItem("pub-marker");

    // Get the MapLibre GL JS Map
    const map = thisInstance.mapLibreStore.mapLibreMap;

    // Set the map view to fit the Marker (instantly)
    map.setCenter(pubMarker.geometry.coordinates);
    map.setZoom(12);
  },
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
