# Waymark JS

Create, share and edit _meaningful_ Maps.

Waymark JS is a JavaScript library for sharing geographical information. It is designed to be easy to use, intuitive and suitable for a wide range of applications.

> Waymark JS is completely free, [Open-Source](https://github.com/OpenGIS/Waymark-JS) and requires **no API keys**! ❤️

## Documentation / Demo

<!-- Demo and and documentation [here](https://www.ogis.org/waymark-js/). -->

## Installation

## Quick Start

### Viewer

The following example will display a Map on the page with a single Marker. Once the Marker is clicked, a popup will display with the Marker's title, image and description.

```html
<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />

        <!-- Stylesheet -->
        <link
            rel="stylesheet"
            href="https://www.ogis.org/waymark-js/dist/latest/css/waymark-js.min.css"
        />

        <!-- JS -->
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://www.ogis.org/waymark-js/dist/latest/js/waymark-js.min.js"></script>
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
                            image_large_url:
                                "https://www.ogis.org/waymark-js/assets/img/pub.jpeg",
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

        <!-- JS -->
    </head>
    <body>
        <!-- Map Container -->
        <div id="instance"></div>

        <script type="module">
            // import

            // Create Instance
        </script>
    </body>
</html>
```

## Development

### Setup

```bash


```
