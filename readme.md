# Waymark JS

Create, share and edit _meaningful_ Maps.

Waymark JS is a JavaScript library for sharing geographical information. It is designed to be easy to use, intuitive and suitable for a wide range of applications.

Originally developed for the [Waymark WordPress plugin](https://wordpress.org/plugins/waymark/), Waymark JS is a standalone library that can be used to add interactive Maps to _any website_.

Powered by [Leaflet JS](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) as the default Basemap. Waymark JS stores data in GeoJSON format, with support for GPX and KML files.

> Waymark JS is completely free, [Open-Source](https://github.com/OpenGIS/Waymark-JS) and requires **no API keys**! ❤️

## Documentation / Demo

Demo and and documentation [here](https://www.ogis.org/waymark-js/).

## Installation

To use Waymark JS, you will need to include the following assets in your page. Here we are adding them to the `<head>` of the document so they are immediately available to the `<body>`:

> [!IMPORTANT]
> The `dist/` [directory](https://github.com/OpenGIS/Waymark-JS/tree/master/dist) in the project root contains the assets ready for _production_ use. The `src/` directory contains the source files for development which can be modified and built using the instructions in the [Development](#development) section below.

```html
<!-- jQuery (required) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- Waymark CSS & JavaScript -->
<link rel="stylesheet" href="dist/css/waymark-js.min.css" />
<script src="dist/js/waymark-js.min.js"></script>
```

> [!TIP]
> Waymark JS requires the `jQuery` global to be available before creating a Map. If you are not already using [jQuery](https://jquery.com/), you can include it from a CDN as shown above.

## Quick Start

### Viewer

The following example will display a Map on the page with a single Marker. Once the Marker is clicked, a popup will display with the Marker's title, image and description.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />

    <!-- Stylesheet -->
    <link rel="stylesheet" href="dist/css/waymark-js.css" />

    <!-- JS -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="dist/js/waymark-js.js"></script>
  </head>
  <body>
    <!-- Map Container -->
    <div id="waymark-map"></div>

    <script>
      // Create a Viewer Instance
      const viewer = window.Waymark_Map_Factory.viewer();

      viewer.init();
      viewer.load_json({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              title: "The Scarlet Ibis",
              description:
                "Great pub, great food! Especially after a Long Ride 🚴🍔🍟🍺🍺💤",
              image_large_url: "https://www.ogis.org/waymark-js/assets/geo/pub.jpeg",
            },
            geometry: {
              type: "Point",
              coordinates: [-128.0094, 50.6539],
            },
          },
        ],
      });
    </script>
  </body>
</html>
```

### Editor

The following example will display an empty Map Editor on the page, set to an initial location. Any edits made to the Map are converted to GeoJSON and output into the `<textarea id="waymark-data">` data container.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />

    <!-- Stylesheet -->
    <link rel="stylesheet" href="dist/css/waymark-js.min.css" />

    <!-- JS -->
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="dist/js/waymark-js.min.js"></script>
  </head>
  <body>
    <!-- Map Container -->
    <div id="waymark-map"></div>

    <!-- Map Data -->
    <textarea id="waymark-data"></textarea>

    <script>
      // Create the Editor
      window.Waymark_Map_Factory.editor().init({
        map_options: {
          // Initial location
          map_init_latlng: [50.6539, -128.0094],
          map_init_zoom: 14,
        },
      });
    </script>
  </body>
</html>
```

> [!TIP]
> View the full documentation and examples [here](https://www.ogis.org/waymark-js/).

## Development

> [!IMPORTANT]
> To build Waymark JS from source, you will need [Node and NPM installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

### Setup

```bash
# Clone the repository
git clone https://github.com/OpenGIS/Waymark-JS
cd Waymark-JS

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (watch mode)
grunt

# Run tests (see tests/readme.md)
npm test
```
