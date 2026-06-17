---
name: waymark-js
description: Waymark JS library reference. Use when working on Waymark JS source code, writing features, fixing bugs, or answering questions about the API, options, Viewer, Editor, or Map configuration.
---

# Waymark JS

Waymark JS is a JavaScript library for creating and sharing geographical information, built on [Leaflet JS](https://leafletjs.com/). It supports a read-only Viewer mode and an interactive Editor mode. Data is stored as GeoJSON, with GPX and KML import support. No API key required.

**Key facts:**
- Entry point: `window.Waymark_Map_Factory.viewer()` / `window.Waymark_Map_Factory.editor()`
- Source: `src/` — built with Grunt into `dist/`
- Tests: `npm test` (see `tests/readme.md`)
- Docs site source: `docs/` (Nuxt Content)

---

Create, Edit and Share Meaningful Maps

Waymark JS is a JavaScript library for creating and sharing geographical information. It is designed to be easy to use and intuitive, and is suitable for a wide range of applications due to its flexibility and customisation [options](map#map-options).

Powered by [Leaflet JS](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) as the default Basemap. Waymark JS stores data in GeoJSON format, with support for GPX and KML files.

> Waymark JS is completely free, [Open-Source](https://github.com/OpenGIS/Waymark-JS) and requires **no API key**! ❤️

## Quick Start

Display a Map with a custom Marker.

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />

    <link
      rel="stylesheet"
      href="https://www.ogis.org/waymark-js/dist/latest/css/waymark-js.min.css"
    />

    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <script src="https://www.ogis.org/waymark-js/dist/latest/js/waymark-js.min.js"></script>
  </head>
  <body>
    <!-- Map Container -->
    <div id="waymark-map"></div>

    <script>
      // Create viewer Instance
      const viewer = window.Waymark_Map_Factory.viewer();

      // Initialise with our options
      viewer.init({
        map_options: {
          // Initial Map Zoom
          map_init_zoom: 16,

          // Our Pub Icon
          marker_types: [
            {
              // The Title is used to create the "pub" Type Key
              marker_title: "Pub",
              marker_icon: "ion-beer",
              marker_colour: "brown",
            },
          ],
        },
      });

      // Load GeoJSON
      viewer.load_json({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              type: "pub",
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

## Installation

To use Waymark JS, you will need to include the following assets in your page. Here we are adding them to the `<head>` of the document so they are immediately available to the `<body>`:

```html
<!-- jQuery (required) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

<!-- Waymark CSS & JavaScript -->
<link
  rel="stylesheet"
  href="https://www.ogis.org/waymark-js/dist/latest/css/waymark-js.min.css"
/>
<script src="https://www.ogis.org/waymark-js/dist/latest/js/waymark-js.min.js"></script>
```

Alternatively, the `<script>` tags could be placed at the end of the `<body>` to defer loading.

> [!TIP]
> Waymark JS requires the `jQuery` global to be available before creating a Map. If you are not already using [jQuery](https://jquery.com/), you can include it from a CDN as shown above.

## Usage

To display a Map, place an empty `<div>` in the body of your document. If you plan to display just one Map on the page, you can use the default `id` of `waymark-map`.

```html
<!-- Map Container -->
<div id="waymark-map"></div>
```

To initialise the Map, we need to add a `<script>` tag to the document. This should be placed _after_ the Map Container and JS/CSS assets have been included.

Here we are creating a new Viewer Instance, setting some [options](map#map-options), and adding a Marker to the Map.

> [!TIP]
> For multiple Maps, provide the unique `id` for each using the `map_options.map_div_id` [option](map#map-options).

```html
<!-- Map Initialisation -->
<script>
  // Create a Viewer Instance
  const viewer = window.Waymark_Map_Factory.viewer();

  // Initialise with our options
  viewer.init({
    map_options: {
      // Initial Map Zoom
      map_init_zoom: 16,

      // Define a new Type
      marker_types: [
        {
          // The title is used to create the "pub" Type Key
          marker_title: "Pub",
          marker_icon: "ion-beer",
          marker_colour: "brown",
        },
      ],
    },
  });

  // Load a Marker from GeoJSON
  viewer.load_json({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          // The "pub" Type Key
          type: "pub",
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
```

The above example creates a Viewer Instance and initialises it with a custom Marker Type, defined in the `map_options` [object](map#map-options). The Marker location is loaded from GeoJSON and because the feature has a `type` property of `pub`, it is displayed using the custom Type.

While the `load_json` method only accepts GeoJSON FeatureCollections, Waymark JS includes a GPX and KML parser to [load data](viewer#loading-data) from those formats.

> [!TIP]
> Each Type has a unique Key that is used to identify it (e.g. `pub` in the above example). This is created from the `marker_title` property, so Type Titles should be unique.


---

Powered by [Leaflet JS](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) as the default Basemap.

# Map

The Map is the central component of Waymark JS. It is used to display Basemaps, Overlays (Markers, Lines and Shapes) as well as an interface for interacting with the Map. The Map can be used in two modes: Viewer and Editor.

## Instances

Maps can either be read-only using the Viewer, or editable using the Editor. Both the Viewer and Editor extend the `Waymark_Map` class.

Multiple maps can be used on a single page, each with their own configuration. A single Map is known as an Instance and is created using the `Waymark_Map_Factory` which is attached to the `window` object. To create a new Instance, use the `viewer` or `editor` method of the `Waymark_Map_Factory`:

```javascript
// Create a Viewer Instance
const viewer = window.Waymark_Map_Factory.viewer();
```

### Configuration

Once an Instance has been created, it must be initialised with a configuration in order to display a Map.

Each Instance is provided its own configuration, as a JavaScript object, which is passed to the `init` method of the Map Instance.

```javascript
// Initialise with our options
viewer.init({
  map_options: {
    map_init_zoom: 10,
    map_init_latlng: [-128.0094, 50.6539],
    map_init_basemap: "Satellite Imagery",
  },
});
```

### Data

Geographical data is represented in [GeoJSON](https://geojson.org/) format. Data can be [loaded](viewer#loading-data) into the Instance using the `load_json` method, which accepts a GeoJSON object as an argument.

```javascript
// Load GeoJSON data
viewer.load_json({
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-85.038, 49.4595] },
      properties: { type: "food" },
    },
  ],
});
```

> [!NOTE]
> The object is expected to be a [FeatureCollection](https://geojson.org/geojson-spec.html#feature-collection-objects) with an array of [Features](https://geojson.org/geojson-spec.html#feature-objects), even if only one Feature is being added.

The current state of the Map is accessible through the `Waymark_Map.map_data` object, which contains the current GeoJSON data. This is a Leaflet [GeoJSON Layer](https://leafletjs.com/reference.html#geojson) and provides the current state of the Map in GeoJSON using the `toGeoJSON` method.

```javascript
// Get GeoJSON data
const map_data = viewer.map_data.toGeoJSON();
```

## Viewer

The Viewer can be used to display [Basemaps](#basemaps) with a single Marker, or many Overlays (Markers, Lines and Shapes). Each Overlay can be given a Title, Description and Image URL, which are displayed in a Popup when the Overlay is clicked.

To create a Viewer Instance, use the `viewer` method of the `Waymark_Map_Factory`:

```javascript
// Create a Viewer Instance
const viewer = window.Waymark_Map_Factory.viewer();
```

Overlays can be categorised using Types, provided to the `map_options` [object](#types). These allow you to define custom Icons, Colours and more. To associate an Overlay to a Type, set the `type` property in the GeoJSON feature to the relevant [Type Key](map#marker-types) (based on the Title, "Pub" => `pub`).

The Viewer has some features that are not available in the Editor, such as the Image Gallery, Overlay Filter and Elevation Profile.

## Editor

The Editor can be used to create, edit and delete Overlays. It has a similar interface to the Viewer, but with additional controls for adding and editing Overlays. The Editor can also be used to import and export GeoJSON data, which can be used to save and load Maps.

To Create an Editor Instance, use the `editor` method of the `Waymark_Map_Factory`:

```javascript
// Create an Editor Instance
const editor = window.Waymark_Map_Factory.editor();
```

Data can be added using the `load_json` method, which accepts a GeoJSON object. Every time the Map is edited, the Map is converted to GeoJSON and output into (the inner HTML of) a `<textarea>` element.

This can be used to easily integrate Waymark JS with a form. You can specify the container ID using the `editor_options.data_div_id` [option](editor#options). The default `<textarea id="waymark-data">` will be created automatically if the container is not found.

> [!IMPORTANT]
> Waymark JS does not currently handle reading from file. You can see how Waymark JS can be integrated with a WordPress back-end to handle this [here](https://github.com/OpenGIS/Waymark/blob/master/assets/js/admin.js).

## Map Options

These options, provided in the `map_options` object, are used to customise both Viewer and Editor Modes.

| Option             | Values   | Description                                                                      | Example                    |
| ------------------ | -------- | -------------------------------------------------------------------------------- | -------------------------- |
| `map_div_id`       | string   | The ID of the HTML element to contain the Map. Defaults to `waymark-map`.        | `map`                      |
| `map_height`       | number   | Specify the desired height of the Map (in pixels).                               | `420`                      |
| `map_width`        | number   | Specify the desired width of the Map (in pixels).                                | `800`                      |
| `map_init_zoom`    | `0`-`18` | The initial zoom level of the Map.                                               | `10`                       |
| `map_init_latlng`  | array    | The initial centre coordinates of the Map (Latitude,Longitude).                  | `[51.5074, 0.1278] `       |
| `map_init_basemap` | string   | The initial basemap of the Map. Use the exact title, including spaces.           | `Satellite Imagery`        |
| `map_max_zoom`     | `0`-`18` | The maximum zoom level of the Map.                                               | `12`                       |
| `show_scale`       | `1`/`0`  | Whether to show the scale on the Map.                                            | `1`                        |
| `tile_layers`      | array    | An array of Basemaps to be used on the Map.                                      | [See Below](#basemaps)     |
| `marker_types`     | array    | An array of Marker Types to be used on the Map.                                  | [See Below](#marker-types) |
| `line_types`       | array    | An array of Line Types to be used on the Map.                                    | [See Below](#line-types)   |
| `shape_types`      | array    | An array of Shape Types to be used on the Map.                                   | [See Below](#shape-types)  |
| `debug_mode`       | `1`/`0`  | Whether to enable debug mode. This will output debug information to the console. | `1`                        |

> [!TIP]
> Map options are available to both the Viewer and Editor.

### Basemaps

Waymark uses the excellent [OpenStreetMap](https://www.openstreetmap.org/) as it’s default Basemap and supports [many other providers](https://leaflet-extras.github.io/leaflet-providers/preview/).

Basemaps are added to the Map using the `map_options.tile_layers` array, each Basemap is an object with the following options:

| Option              | Values   | Description                                                                                                     | Example                                                                                   |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `layer_name`        | string   | The Name will appear in a dropdown list shown by the Map when multiple Basemaps have been entered.              | `OpenStreetMap`                                                                           |
| `layer_url`         | string   | Many mapping services support the Slippy Map format. Waymark requires URLs that contain `{z}`, `{x}` and `{y}`. | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?r=1`                                  |
| `layer_attribution` | string   | The attribution to be displayed on the Map.                                                                     | `&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors` |
| `layer_max_zoom`    | `0`-`18` | The maximum zoom level of the Basemap.                                                                          | `14`                                                                                      |

This is an example of a Basemap configuration:

```javascript
const config = {
  map_options: {
    tile_layers: [
      {
        layer_name: "OpenStreetMap",
        layer_url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?r=1",
        layer_attribution:
          '@copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        layer_max_zoom: "18",
      },
      {
        layer_name: "OpenTopoMap",
        layer_url: "https://{a|b|c}.tile.opentopomap.org/{z}/{x}/{y}.png",
        layer_attribution:
          '© <a href="https://openstreetmap.org/copyright">OSM</a>-Mitwirkende, SRTM | © <a href="http://opentopomap.org" data-moz-translations-id="285">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>',
        layer_max_zoom: "17",
      },
    ],
  },
};
```

> [!TIP]
> OpenStreetMap is the default Basemap. If you do not provide any Basemaps, OpenStreetMap will be used.

### Types

Customise how Overlays are displayed on the Map. When you add an Overlay (Marker, Line or Shape) to the Map you may want to style it in a certain way. In the case of Markers, you may want to use certain icons and colours.

Types allow you set these styles once, using the `map_options.marker_types`, `map_options.line_types` and `map_options.shape_types` arrays. Once a type has been provided, an Overlay can be assigned to it using the `type` feature property.

We can create a new Marker Type `pub` by adding it to the `marker_types` array like this:

```javascript
const config = {
  map_options: {
    marker_types: [
      {
        marker_title: "Pub",
        marker_shape: "marker",
        marker_size: "large",
        icon_type: "icon",
        marker_icon: "ion-beer",
        marker_colour: "#fbfbfb",
        icon_colour: "#754423",
      },
    ],
  },
};
```

When a Marker is added to the Map, it can be associated with the "Pub" Type by setting the `type` feature property to `pub`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-2.548828125, 51.46769693762546]
      },
      "properties": {
        "type": "pub",
        "title": "Great place for a pint!"
      }
    }
  ]
}
```

#### Marker Types

Marker Types are added to the Map using the `marker_types` array, each Marker Type is an object with the following options:

| Option          | Values                          | Description                                                                                                                                                                                                                                                                   | Example   |
| --------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `marker_title`  | string                          | What kind of Marker is this? E.g. `Photo`, `Grocery Store`, `Warning!`. Marker Titles should be unique and are used to generate [Type Keys](#type-keys).                                                                                                                      | `Pub`     |
| `marker_shape`  | `marker`, `circle`, `rectangle` | Which shape of Marker to use. Circles and Squares are centered at the specified location, Markers point down to that location.                                                                                                                                                | `marker`  |
| `marker_size`   | `small`, `medium`, `large`      | Which size of Marker to use.                                                                                                                                                                                                                                                  | `large`   |
| `marker_colour` | CSS Color                       | The Marker background colour, provided as a CSS colour (e.g. `white`, `#ffba00`, `rgb(255, 186, 0)`).                                                                                                                                                                         | `#da3d20` |
| `icon_type`     | `icon`, `text`, `html`          | Font Icons are available from Font Awesome and Ionic Icons. Simple Text or Emojis are supported, as well as custom HTML.                                                                                                                                                      | `icon`    |
| `marker_icon`   | string                          | Enter the `text`/`html` ([Emojis](https://emojifinder.com/) and nested HTML supported!) For `icon` enter the [Ionicons](https://ionic.io/ionicons/v2/cheatsheet.html) or [Font Awesome](https://fontawesome.com/v4/cheatsheet/), icon name e.g. `ion-camera`, or `fa-camera`. | `🍺`      |
| `icon_colour`   | CSS Color                       | The colour of the icon, provided as a CSS colour (e.g. `white`, `#ffba00`, `rgb(255, 186, 0)`).                                                                                                                                                                               | `#ffba00` |

The following is an example of a Marker Type configuration:

```javascript
const config = {
  map_options: {
    marker_types: [
      {
        marker_title: "Pub",
        marker_shape: "marker",
        marker_size: "large",
        icon_type: "icon",
        marker_icon: "ion-beer",
        marker_colour: "#fbfbfb",
        icon_colour: "#754423",
      },
    ],
  },
};
```

#### Line Types

Line Types are added to the Map using the `line_types` array, each Line Type is an object with the following options:

| Option         | Values     | Description                                                                                                                                             | Example     |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `line_title`   | string     | What kind of Line is this? E.g. `Bike Path`, `Walking Only`, `Dark Red`. Line Titles should be unique and are used to generate [Type Keys](#type-keys). | `Bike Path` |
| `line_colour`  | CSS Colour | The colour of the Line, provided as a CSS colour (e.g. `white`, `#ffba00`, `rgb(255, 186, 0)`).                                                         | `#3cbc47`   |
| `line_weight`  | number     | The width of the Line, in pixels.                                                                                                                       | `2`         |
| `line_opacity` | `0`-`1`    | The opacity of the Line, between `0.0` and `1.0`.                                                                                                       | `0.85`      |

The following is an example of a Line Type configuration:

```javascript
const config = {
  map_options: {
    line_types: [
      {
        line_title: "Bike Path",
        line_colour: "#3cbc47",
        line_weight: "2",
        line_opacity: "0.5",
      },
    ],
  },
};
```

#### Shape Types

Shape Types are added to the Map using the `shape_types` array, each Shape Type is an object with the following options:

| Option         | Values     | Description                                                                                                                                       | Example   |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `shape_title`  | string     | What kind of Shape is this? E.g. `Park`, `Danger!`, `Light Blue`. Shape Titles should be unique and are used to generate [Type Keys](#type-keys). | `Park`    |
| `shape_colour` | CSS Colour | The colour of the Shape, provided as a CSS colour (e.g. `white`, `#ffba00`, `rgb(255, 186, 0)`).                                                  | `#81d742` |
| `fill_opacity` | number     | The opacity of the inside of the Shape, between `0.0` and `1.0`.                                                                                  | `0.5`     |

The following is an example of a Shape Type configuration:

```javascript
const config = {
  map_options: {
    shape_types: [
      {
        shape_title: "Park",
        shape_colour: "#81d742",
        fill_opacity: "0.5",
      },
    ],
  },
};
```

#### Type Keys

Type Keys are a unique string that identifies a Type. The Type Title is used to create the Type Key, by removing any non-alpha-numeric characters and converting it to lowercase.

> [!TIP]
> The Type Key for "Pub" would be `pub`. The Type Key for "A Much Longer Title" would be `amuchlongertitle`.

When assigning a Type to an Overlay, the `type` feature property must match the Type Key. For example, to assign the "Pub" Type to a Marker:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "type": "pub",
        "title": "Great place for a pint!"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-2.548828125, 51.46769693762546]
      }
    }
  ]
}
```

Waymark JS adds the Type Key to the Overlay using the `waymark-marker-[type_key]` class. For example, the "Pub" Type would be:

```html
<div class="waymark-marker waymark-marker-pub">
  <div class="waymark-marker-background" style="background:#fbfbfb;"></div>
  <i
    style="color:#754423;"
    class="waymark-marker-icon waymark-icon-icon ion ion-beer"
  ></i>
</div>
```

You can use this class to target specific Types in your CSS, for example:

```css
/* Adjust the "Pub" Marker Text Icon size */
.waymark-marker-pub i {
  font-size: 24px !important;
}
```

> [!TIP]
> Use your browser’s inspector ([Firefox](https://developer.mozilla.org/en-US/docs/Tools/Page_Inspector/How_to/Open_the_Inspector) / [Chrome](https://developer.chrome.com/docs/devtools/open/)) to find Type keys.


---

# Viewer

The Viewer can be used to display [Basemaps](map#basemaps) with a single Marker, or many Overlays (Markers, Lines and Shapes). Each Overlay can be given a Title, Description and Image URL, which are displayed in a Popup when the Overlay is clicked.

Features include:

- **Image Gallery** &ndash; Thumbnails for Markers currently in view on the Map are displayed and can be clicked open the Marker popup.
- **Overlay Filter** &ndash; Pick which Overlays are currently visible by [Type](map#types).
- **Marker Clustering** &ndash; Markers that are close together are stacked, to declutter the Map.
- **Elevation Profile** &ndash; An interactive elevation profile for Lines that have elevation data.

## Creation

To create a Viewer Instance, use the `viewer` method of the `Waymark_Map_Factory`:

```javascript
// Create a Viewer Instance
const viewer = window.Waymark_Map_Factory.viewer();
```

Options are passed to the Instance `init` method to configure the Viewer.

## Options

These options, provided in the `viewer_options` object, are used to customise the Viewer Mode.

| Option                | Values              | Description                                                                                                                                                                                                                                       | Example             |
| --------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `show_gallery`        | `1`/`0`             | Whether to display an image gallery for Markers that have images. Thumbnails for Markers currently in view on the Map are displayed and clicking on a thumbnail will centre the Map on the Marker and open the popup.                             | `1`                 |
| `show_filter`         | `1`/`0`             | Allow the user to filter which Overlays are currently visible on Map.                                                                                                                                                                             | `1`                 |
| `show_cluster`        | `1`/`0`             | Whether to cluster (stack) Markers that are close together, to declutter the Map.                                                                                                                                                                 | `1`                 |
| `cluster_radius`      | number              | The maximum radius that a cluster will cover from the central Marker (in pixels). Decreasing will make more, smaller clusters. Default `80`.                                                                                                      | `80`                |
| `cluster_threshold`   | `0`-`18`            | Markers will not be clustered above this zoom level.                                                                                                                                                                                              | `14`                |
| `show_elevation`      | `1`/`0`             | Whether to display an interactive elevation profile graph below the Map for Lines that have elevation data.                                                                                                                                       | `1`                 |
| `elevation_div_id`    | string              | The ID of the HTML element to contain the elevation profile graph. The default is `waymark-elevation` and if this element does not exist, it will be created **inside** the Map Container.                                                        | `waymark-elevation` |
| `elevation_units`     | `metric`/`imperial` | Display elevation data in metric (m/km) or imperial (ft/mi) units.                                                                                                                                                                                | `metric`            |
| `elevation_colour`    | CSS Colour          | The colour of the elevation graph and associated Line, provided as a CSS colour (e.g. `white`, `#ffba00`, `rgb(255, 186, 0)`).                                                                                                                    | `#b42714`           |
| `elevation_initial`   | `1`/`0`             | Whether to show the elevation profile initially when the Map loads, or wait for a Line to be clicked.                                                                                                                                             | `0`                 |
| `sleep_delay_seconds` | number              | How many seconds before scroll zoom is enabled. `0` seconds will mean no delay (disabling this feature). A large number of seconds like `3600` (an hour) will essentially _disable hover to wake_, meaning the user will need to _click_ to wake. | `3600`              |
| `sleep_do_message`    | `1`/`0`             | Whether to display a message while scroll zoom is disabled.                                                                                                                                                                                       | `1`                 |
| `sleep_wake_message`  | string              | The message to display while scroll zoom is disabled.                                                                                                                                                                                             | `Click to Wake`     |

### Example Config

This configuration enables all available Viewer features:

```javascript
const config = {
  viewer_options: {
    show_gallery: true,
    show_filter: true,
    show_cluster: true,
    show_elevation: true,
  },
};
```

## Initialisation

Once the configuration is set, the `init` method is called to initialise the Map:

```javascript
// Initialise with our options
viewer.init(config);
```

The Map is now displayed on the page according to the provided options.

## Loading Data

Waymark JS supports loading data from [GeoJSON](https://geojson.org/), [GPX](https://www.topografix.com/gpx.asp) and [KML](https://developers.google.com/kml) files.

### GeoJSON

After the Map is initialised, data can be loaded using the `load_json` method, which accepts a [GeoJSON](https://geojson.org/) object as an argument.

```javascript
viewer.load_json({
  type: "FeatureCollection",
  features: [
    {
      geometry: { type: "Point", coordinates: [-85.038, 49.4595] },
      type: "Feature",
      properties: { type: "food" },
    },
  ],
});
```

To load a GeoJSON file using [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), the `load_json` method is called within the `fetch` promise to ensure the data is available:

```javascript
// Load GeoJSON
fetch("../examples/assets/geo/route.geojson")
  .then((response) => response.json())
  .then((geojson) => {
    viewer.load_json(geojson);
  });
```

### GPX and KML

To load data from a GPX or KML file, the file is fetched and parsed as XML, then converted to GeoJSON using the included `toGeoJSON` library using the `gpx` or `kml` methods. The resulting GeoJSON is then added to the Map.

See this example in action [here](examples/viewer/formats.html).

```javascript
// Load GPX
fetch("../examples/assets/geo/route.gpx")
  .then((response) => response.text())
  // As Text
  .then((gpx) => {
    // Parse GPX
    const parsed = new DOMParser().parseFromString(gpx, "text/xml");

    // Convert to GeoJSON
    const geojson = toGeoJSON.gpx(parsed) || {};

    // Ensure is valid FeatureCollection
    if (geojson.type !== "FeatureCollection") {
      return;
    }

    // Add to Map
    viewer.load_json(geojson);
  });

// Load KML
fetch("../assets/geo/route.kml")
  .then((response) => response.text())
  // As Text
  .then((kml) => {
    // Parse KML
    const parsed = new DOMParser().parseFromString(kml, "text/xml");

    // Convert to GeoJSON
    const geojson = toGeoJSON.kml(parsed) || {};

    // Ensure is valid FeatureCollection
    if (geojson.type !== "FeatureCollection") {
      return;
    }

    // Add to Map
    viewer.load_json(geojson);
  });
```

> [!NOTE]
> The object is expected to be a [FeatureCollection](https://geojson.org/geojson-spec.html#feature-collection-objects) with an array of [Features](https://geojson.org/geojson-spec.html#feature-objects), even if only one Feature is being added.

## Examples

### Marker With Custom Icon

Here we are creating a new Viewer Instance, setting some [options](map#map-options), and adding a Marker to the Map.

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
    <div id="waymark-map"></div>

    <script>
      // Create viewer Instance
      const viewer = window.Waymark_Map_Factory.viewer();

      // Initialise with our options
      viewer.init({
        map_options: {
          // Initial Map Zoom
          map_init_zoom: 14,

          // Our Pub Icon
          marker_types: [
            {
              marker_title: "Pub",
              marker_icon: "ion-beer",
              marker_colour: "brown",
            },
          ],
        },
      });

      // Load GeoJSON
      viewer.load_json({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              type: "pub",
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

### Multiple Overlays From File

Here we are creating a new Viewer Instance initialised with some [Types](map#types) and loading GeoJSON data from a file.

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
    <div id="waymark-map"></div>

    <script>
      // Create Viewer Instance
      const viewer = window.Waymark_Map_Factory.viewer();

      // Initialise with our options
      viewer.init({
        // Viewer Specific Options
        viewer_options: {
          show_gallery: "1",
          show_filter: "1",
          show_cluster: "1",
          show_elevation: "1",
          elevation_units: "imperial",
          elevation_colour: "#70af00",
          elevation_initial: "1",
          sleep_do_message: "1",
        },

        // General Map Options
        map_options: {
          debug_mode: true,

          // Line Types
          line_types: [
            {
              line_title: "Route",
              line_colour: "green",
            },
          ],

          // Marker Types
          marker_types: [
            {
              marker_title: "Photo",
              icon_type: "icon",
              marker_icon: "ion-camera",
              marker_colour: "#70af00",
              icon_colour: "#ffffff",
            },
            {
              marker_title: "Information",
              icon_type: "icon",
              marker_icon: "ion-information-circled",
              marker_colour: "#fbfbfb",
              icon_colour: "#0069a5",
            },
            {
              marker_title: "Alert",
              icon_type: "icon",
              marker_icon: "ion-android-alert",
              marker_colour: "#da3d20",
              icon_colour: "white",
            },
            {
              marker_title: "Food",
              icon_type: "icon",
              marker_icon: "ion-pizza",
              marker_colour: "#da3d20",
              icon_colour: "#ffba00",
            },
            {
              marker_title: "Beer",
              icon_type: "icon",
              marker_icon: "ion-beer",
              marker_colour: "#fbfbfb",
              icon_colour: "#754423",
            },
            {
              marker_title: "Camp",
              icon_type: "icon",
              marker_icon: "ion-android-home",
              marker_colour: "#a43233",
              icon_colour: "#ffffff",
            },
          ],
        },
      });

      // Load GeoJSON asynchronously from file
      const geojson = fetch("./assets/geo/route.geojson")
        .then((response) => response.json())
        .then((data) => {
          viewer.load_json(data);
        });
    </script>
  </body>
</html>
```


---

# Editor

The Editor Mode allows users to create and edit Overlays (Markers, Lines, and Shapes) on a Map. Each Overlay can be customised with a Title, Description, Image URL and categorised using [Types](map#types).

Every time the Map is edited, the Map is converted to GeoJSON and output into (the inner HTML of) a `<textarea>` element. This can be used to easily integrate Waymark JS with a form. You can specify the container ID using the `data_div_id` [option](editor#options). The default `<textarea id="waymark-data">` will be created automatically if the container is not found.

> [!IMPORTANT]
> Waymark JS does not currently handle reading from file. You can see how Waymark JS can be integrated with a WordPress back-end to handle this [here](https://github.com/OpenGIS/Waymark/blob/master/assets/js/admin.js).

## Creation

```javascript
// Create an Editor Instance
const editor = window.Waymark_Map_Factory.editor();
```

## Options

These options, provided in the `editor_options` object, are used to customise the Editor Mode.

| Option           | Values  | Description                                                                        | Example        |
| ---------------- | ------- | ---------------------------------------------------------------------------------- | -------------- |
| `confirm_delete` | `1`/`0` | Whether to show a confirmation message when deleting an object.                    | `1`            |
| `data_div_id`    | string  | The ID of a element to output the GeoJSON into. By default this is a `<textarea>`. | `waymark-data` |

### Example Config

This configuration disables the confirmation message when deleting an object and specifies a custom container for the GeoJSON output.

```javascript
const config = {
  editor_options: {
    confirm_delete: "0",
    data_div_id: "data",
  },
};
```

## Initialisation

Once the configuration is set, the `init` method is called to initialise the Map:

```javascript
// Create an Editor Instance
const editor = window.Waymark_Map_Factory.editor();

// Initialise with our options
editor.init(config);
```

The Map is now displayed on the page according to the provided options.

## Loading Data

As with the Viewer, data can be loaded into the Map using the `load_json` method, which accepts a GeoJSON object as an argument.

```javascript
editor.load_json({
  type: "FeatureCollection",
  features: [
    {
      geometry: { type: "Point", coordinates: [-85.038, 49.4595] },
      type: "Feature",
      properties: { type: "food" },
    },
  ],
});
```

Data can be loaded asynchronously using the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), the `load_json` method is called within the `fetch` promise to ensure the data is available:

```javascript
// Load GeoJSON
fetch("../examples/assets/geo/route.geojson")
  .then((response) => response.json())
  .then((geojson) => {
    editor.load_json(geojson);
  });
```

Alternatively, if a GeoJSON string exists in the Data Container, it will be loaded into the Map when the Editor is initialised. For example, if the Data Container is a `<textarea>` element with an ID of `waymark-data`, the GeoJSON will be loaded into the Map when the Editor is initialised.

```html
<textarea id="waymark-data" name="map_data">
  {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [-85.038, 49.4595]
        },
        "properties": {
          "type": "food"
        }
      }
    ]
  }
</textarea>
```

This is useful for integrating Waymark JS with a `<form>`.

## Retrieving Data

The Map data can be retrieved as GeoJSON using the `toGeoJSON` method:

```javascript
//Map Data
const map_data = editor.map_data.toGeoJSON();
```

Every time the Map is edited, the Map GeoJSON is output into the inner HTML of the Data Container. By default this is a `<textarea>` element with an ID of `waymark-data` to easily integrate Waymark JS with a form.

You can specify an alternative container ID using the `data_div_id` [option](editor#options). The default `<textarea id="waymark-data">` will be created automatically if a container is not found.

## Examples

### Marker With Custom Icon

Here we are creating a new Editor Instance, setting some [options](editor#options), and adding a Marker to the Map.

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
      // Create and initilise the Editor with the default options
      const editor = window.Waymark_Map_Factory.editor();

      editor.init({
        // Don't confirm delete
        editor_options: {
          confirm_delete: "0",
        },

        map_options: {
          // Our Pub Icon
          marker_types: [
            {
              marker_title: "Pub",
              marker_icon: "ion-beer",
              marker_colour: "brown",
            },
          ],
        },
      });

      editor.load_json({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              type: "pub",
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

### Multiple Overlays From File

Here we are creating a new Editor Instance initialised with some [Types](map#types) and loading GeoJSON data from a file.

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
    <div id="waymark-map"></div>

    <script>
      // Create an Editor Instance
      const editor = window.Waymark_Map_Factory.editor();

      // Initialise with our options
      editor.init({
        // Editor Specific Options
        editor_options: {
          confirm_delete: "0",
        },

        // General Map Options
        map_options: {
          debug_mode: true,

          // Line Types
          line_types: [
            {
              line_title: "Route",
              line_colour: "green",
            },
          ],

          // Marker Types
          marker_types: [
            {
              marker_title: "Photo",
              icon_type: "icon",
              marker_icon: "ion-camera",
              marker_colour: "#70af00",
              icon_colour: "#ffffff",
            },
            {
              marker_title: "Information",
              icon_type: "icon",
              marker_icon: "ion-information-circled",
              marker_colour: "#fbfbfb",
              icon_colour: "#0069a5",
            },
            {
              marker_title: "Alert",
              icon_type: "icon",
              marker_icon: "ion-android-alert",
              marker_colour: "#da3d20",
              icon_colour: "white",
            },
            {
              marker_title: "Food",
              icon_type: "icon",
              marker_icon: "ion-pizza",
              marker_colour: "#da3d20",
              icon_colour: "#ffba00",
            },
            {
              marker_title: "Beer",
              icon_type: "icon",
              marker_icon: "ion-beer",
              marker_colour: "#fbfbfb",
              icon_colour: "#754423",
            },
            {
              marker_title: "Camp",
              icon_type: "icon",
              marker_icon: "ion-android-home",
              marker_colour: "#a43233",
              icon_colour: "#ffffff",
            },
          ],
        },
      });

      // Load GeoJSON asycnhronously from file
      const geojson = fetch("./assets/geo/route.geojson")
        .then((response) => response.json())
        .then((data) => {
          editor.load_json(data);
        });
    </script>
  </body>
</html>
```


---

# Customise

Watmark JS was designed to be customisable and flexible.

In addition to the available options, you can customise Waymark JS using CSS and JavaScript.

> [!TIP]
> The Map above has lots of (Patriotic) customisations to help illustrate some of the concepts outlined here. Be sure to view the <a href="/examples/editor/custom.html" target="_blank">source code</a>.

## Options

Waymark has lots of options so you can create custom Maps with Overlays to suit your needs.

Be sure to check out the full list of:

- **[Map Options](map#map-options)** &ndash; for setting up the Map view, including custom [Basemaps](map#basemaps) and [Types](map#types).
- **[Veiwer Options](viewer#options)** &ndash; enabling and configuring Viewer features, including the Image Gallery, Overlay Filter, Marker Clustering and Elevation Profile.

- **[Editor Options](editor#options)** &ndash; to customise the Editor Mode, including the GeoJSON output and confirmation messages.

### Localization

All text displayed by Waymark JS is fully customisable and can be translated/localised into any language.

You can modify the default strings using the `config.language` option when initialising the Map. In the example above, all text displayed by the Editor user interface will be in French.

```javascript
// Add translations for the Editor
config.language = {
  action_fullscreen_activate: "Plein écran",
  action_fullscreen_deactivate: "Sortir du plein écran",
  action_locate_activate: "Montre-moi où je suis",

  // Etc..

  show_direction: "Montrer la direction",
  reverse_direction: "Inverser la direction",
  sleep_wake_message: "Cliquez ou survolez pour réveiller",
};

// Initialise with our options
editor.init(config);
```

The full list of localisation strings is:

```javascript
const english = {
  // Common (Viewer & Editor)
  action_fullscreen_activate: "View Fullscreen",
  action_fullscreen_deactivate: "Exit Fullscreen",
  action_locate_activate: "Show me where I am",
  action_zoom_in: "Zoom in",
  action_zoom_out: "Zoom out",
  label_total_length: "Total Length: ",
  label_max_elevation: "Max. Elevation: ",
  label_min_elevation: "Min. Elevation: ",
  label_ascent: "Total Ascent: ",
  label_descent: "Total Descent: ",

  // Editor only
  add_line_title: "Draw a Line",
  add_photo_title: "Upload an Image",
  add_marker_title: "Place a Marker",
  add_rectangle_title: "Draw a Rectangle",
  add_polygon_title: "Draw a Polygon",
  add_circle_title: "Draw a Circle",
  upload_file_title:
    "Read Lines and Markers from file (GPX/KML/GeoJSON supported, which most apps should Export to)",
  action_duplicate: "Duplicate",
  action_delete: "Delete",
  action_edit: "Edit",
  action_edit_done: "Finish editing",
  action_upload_image: "Upload Image",
  object_title_placeholder: "Title",
  object_image_placeholder: "Image URL",
  object_description_placeholder: "Description",
  object_type_label: "Type",
  marker_latlng_label: "Lat,Lng",
  action_delete_confirm: "Are you sure you want to delete this",
  action_search_placeholder: "Search...",
  object_label_marker: "Marker",
  object_label_line: "Line",
  object_label_shape: "Shape",
  object_label_marker_plural: "Markers",
  object_label_line_plural: "Lines",
  object_label_shape_plural: "Shapes",
  error_message_prefix: "Waymark Error",
  info_message_prefix: "Waymark Info",
  debug_message_prefix: "Waymark Debug",
  error_file_type: "This file type is not supported.",
  error_file_conversion: "Could not convert this file to GeoJSON.",
  error_file_upload: "File upload error.",
  error_photo_meta: "Could not retrieve Image metadata.",
  info_exif_yes: "Image location metadata (EXIF) detected!",
  info_exif_no: "Image location metadata (EXIF) NOT detected.",
  error_no_wpmedia: "WordPress Media Library not found",
  no_direction: "No Direction",
  show_direction: "Show Direction",
  reverse_direction: "Reverse Direction",
  sleep_wake_message: "Click or Hover to Wake",
};
```

> [!TIP]
> If a translation is not provided, the default English string will be used.

## Styling

Most elements can be styled using CSS and have sensibly named `waymark-` classes.

For example, the HTML for a "Pub" Marker looks like this:

```html
<div
  class="waymark-marker waymark-marker-pub waymark-marker-marker waymark-marker-medium"
>
  <div class="waymark-marker-background" style="background:#70af00;"></div>
  <div style="color:#ffffff;" class="waymark-marker-icon waymark-icon-text">
    🍻
  </div>
</div>
```

We can use the `.waymark-marker-pub` class to target the Pub Marker, and the `.waymark-marker-background` and `.waymark-marker-icon` classes to style the Marker's content.

```css
/* Target by the "Pub" Type Key  */
.waymark-marker.waymark-marker-pub .waymark-marker-background {
  /* Marker Background Colour */
  background-color: white !important;
}
.waymark-marker.waymark-marker-pub .waymark-icon-text {
  /* Marker Icon Colour */
  color: red !important;
}
```

> [!TIP]
> Use your browser’s inspector ([Firefox](https://developer.mozilla.org/en-US/docs/Tools/Page_Inspector/How_to/Open_the_Inspector) / [Chrome](https://developer.chrome.com/docs/devtools/open/)) to explore the Markup and Styling of Waymark JS elements.

## Interaction

Once the Map is initialised using the `init` method, you can interact with it using JavaScript.

Because Waymark JS utilises [jQuery](https://api.jquery.com/) and [Leaflet](https://leafletjs.com/reference.html), you can also use these APIs to interact with the Map and its elements.

The Leaflet Map object is available through the `map` property on the `Waymark_Map` Instance. For example, to add an event handler to execute each time an Overlay popup is displayed:

```javascript
// Once the map is initialised, i.e. after
// editor.init({ ... });

// Get the Leaflet Map object
const map = editor.map;

// Leaflet Popup
map.on("popupopen", function (e) {
  // Get the layer from Leaflet
  const layer = e.popup._source;

  // Remove all active classes
  jQuery(".waymark-marker").removeClass("active");

  // Get the container with jQuery
  const marker = jQuery(layer._icon);

  // Add active class
  marker.addClass("active");
});
```

Using jQuery, we can also interact with the Map and its elements. For example, to add a class to the Map container and create a toggle button:

```javascript
// Get the container with jQuery
const map_container = jQuery("#waymark-map");

// Add a class to the container
map_container.addClass("oh-canada");

// Create a toggle button
const toggle_button = jQuery("<button />")
  .addClass("canada-toggle")
  .html("🇨🇦🇨🇦🇨🇦<small>Click Me!</small>")
  .on("click", () => {
    map_container.toggleClass("oh-canada");
  });

// Append to the container
map_container.append(toggle_button);
```

## Callback Function

Waymark JS provides the _global_ callback function `waymark_loaded_callback` that is executed every time a Map is [initialised](viewer#initialisation). This accepts a single argument, which is the Waymark Map instance.

Once defined on your page (accessible in the global scope), we can use the instance object to perform additional actions. For example, we can add a custom class to the Map container:

```javascript
// Define the callback function
function waymark_loaded_callback(instance) {
  // Get the Map container
  const map_container = instance.map.getContainer();

  // Add a custom class
  map_container.classList.add("oh-canada");
}
```

> [!TIP]
> Check out the Waymark WordPress plugin [source code](https://github.com/OpenGIS/Waymark/tree/master/assets/js) and the [Map First](https://github.com/OpenGIS/Map-First) WordPress theme for an example of integrating Waymark JS with WordPress.

