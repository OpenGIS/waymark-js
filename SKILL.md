---
name: waymark-js
description: Consumer API reference for the Waymark JS map library. Use when building with createInstance(...), configuring maps, basemaps, data layers, paint, types, or instance events.
---

# API

> Consumer API reference for `createInstance(instanceDocument?)`.

## Quick start

```html
<div id="map" style="width: 100%; height: 400px"></div>

<script type="module">
  import { createInstance } from "./dist/waymark.js";

  const instance = createInstance({
    config: {
      id: "map",
    },
  });
  instance.on("waymark:map.load", () => {
    console.log(instance.toJSON());
  });
</script>
```

## Factory signature

`createInstance(instanceDocument?)`
| Parameter | Type | Required | Behaviour |
| ------------------ | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `instanceDocument` | `object` | No | Canonical serialisable InstanceDocument with strict top-level keys: `config`, `state`, `data`. Unknown top-level keys are ignored. |

Waymark guarantees strict round-trip serialisation for canonical documents:

```js
const first = createInstance(instanceDocument);
const second = createInstance(first.toJSON());

second.toJSON(); // strict match for serialisable fields
```

Canonical v1 shape:

```js
{
  config: {
    id?: string,
    map?: {
      options?: object,
      basemaps?: {
        raster?: Array<{
          tileURLTemplates: string[],
          title?: string,
          attributionHTML?: string,
          tileSize?: number,
          minZoom?: number,
          maxZoom?: number,
          opacity?: number
        }>,
        vector?: Array<{
          styleURL: string | object,
          title?: string,
          attributionHTML?: string,
          maxZoom?: number,
          opacity?: number
        }>
      }
    },
    ui?: { mode?: "view" | "debug" },
    paint?: {
      circle?: {
        "circle-color"?: string,
        "circle-radius"?: number,
        "circle-opacity"?: number
      },
      line?: {
        "line-color"?: string,
        "line-width"?: number,
        "line-opacity"?: number
      },
      fill?: {
        "fill-color"?: string,
        "fill-opacity"?: number
      }
    },
    types?: Record<string, {
      icon?: string,
      iconSize?: number,
      paint?: {
        circle?: object,
        line?: object,
        fill?: object
      }
    }>,
    debug?: boolean
  },
  state: {
    map: {
      options?: {
        center?: [number, number],
        zoom?: number,
        bearing?: number,
        pitch?: number
      },
      basemaps?: {
        raster?: Array<{
          tileURLTemplates: string[],
          title?: string,
          attributionHTML?: string,
          tileSize?: number,
          minZoom?: number,
          maxZoom?: number,
          opacity?: number
        }>,
        vector?: Array<{
          styleURL: string | object,
          title?: string,
          attributionHTML?: string,
          maxZoom?: number,
          opacity?: number
        }>
      }
    },
    types?: Record<string, { visible?: boolean }>,
    ui: {
      mode?: "view" | "debug"
    },
    debug?: boolean
  },
  data: {
    layers: Array<{
      type?: "geojson",
      data: object,
      paint?: {
        circle?: object,
        line?: object,
        fill?: object
      }
    }>
  }
}
```

`data.layers[]` input accepts `{ type?: "geojson", data }`. `type` defaults to `"geojson"`, and serialised output normalises each layer to `{ type: "geojson", data }`.

`data` must use one of these RFC7946-aligned GeoJSON shapes:

- `FeatureCollection` with `features` array
- `Feature` with `geometry` key (`object` or `null`)
- Geometry object with `type` in `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon`, or `GeometryCollection`

Waymark validates essential geometry semantics at the data-layer boundary:

- positions must be arrays with at least two finite numbers (`longitude`, `latitude`)
- `LineString` must contain at least two positions
- `LinearRing` must contain at least four positions and be closed (first and last positions equivalent)
- `Polygon` must contain at least one valid ring
- `MultiPoint`/`MultiLineString`/`MultiPolygon` must contain only valid per-member geometries
- `GeometryCollection` validates recursively through nested geometries

## Container resolution

- `createInstance(...)` is a browser-runtime API. It requires DOM access and is not intended for server-only runtimes without a DOM.
- A provided `instanceDocument.config.id` must already exist in the DOM.
- If that element is missing, `createInstance(...)` throws `Waymark container "{id}" was not found.`.
- If `instanceDocument.config.id` is omitted, Waymark generates an ID prefixed with `waymark-` and appends the container to `document.body`.

In SSR applications, instantiate on the client only, after the container element exists.

## Config defaults and merge behaviour

Waymark resolves config with a deep merge:

- Base: `src/config/defaults.js` (`defaultConfig`)
- Override: `instanceDocument.config`
- Objects merge recursively
- Arrays are replaced (not merged by index)
- `map.options.attributionControl`: `false`
- `map.basemaps.vector[0].styleURL` (resolved as config baseline only when no basemap entries exist): `https://raw.githubusercontent.com/OpenGIS/outdoors/refs/heads/master/style.json`
- `paint`: `{}` (no instance-wide paint overrides)
- `types`: `{}` (no type-based rendering)
- `debug`: `false`
- `ui.mode`: `"view"` (invalid values fall back to `"view"`)

Accepted `ui.mode` values:

- `"view"` (default): mounts the shell but renders no mode-specific content.
- `"debug"`: renders a debug control in the shell; the control toggles debug outputs.

Any other value is normalised to `"view"`.

### Debug logging

When `config.debug` is `true`, Waymark logs every emitted Waymark event to the browser console with a `[waymark:debug]` prefix:

```js
[waymark:debug] map waymark:map.load
[waymark:debug] map waymark:state.changed
```

Debug can be controlled at runtime via the public API:

```js
instance.debug.setEnabled(true); // start console logging
instance.debug.setEnabled(false); // stop console logging
```

`config.debug` is a baseline toggle. Runtime changes are serialised as `state.debug` delta when they diverge from the config baseline.

## UI shell mode rendering

Waymark mounts a per-instance Vue shell in the target map container (`data-waymark-app="true"`) and renders mode-specific content through nested mode components:

- `src/ui/InstanceShell.vue`
- `src/ui/modal/InstanceShellModal.vue`
- `src/ui/modes/InstanceShellModeView.vue`
- `src/ui/modes/InstanceShellModeDebug.vue`

UI shell routing is state-driven:

- internal controls emit panel intent (`debug-output-toggle`, `basemaps-toggle`)
- `ui.activePanel` selects modal panel content (`debug-output` or `basemaps`)
- `ui.panelContext` carries optional route metadata (for example trigger source)

In `"view"` mode, the shell stays mounted with no default panel content. In `"debug"` mode, runtime opens the `debug-output` panel by default. The debug control toggles that panel route on/off, and the shared modal is visible whenever any panel is active. When `debug-output` is active, the modal renders two debug sections:

- **Instance document**: current `instance.toJSON()` snapshot.
- **Waymark events (last 25)**: bounded event history for lifecycle/module/map events plus canonical runtime state events (`waymark:state.changed`, `waymark:state.*`) with sanitised summaries.

The debug control remains clickable while the panel is visible.

There is no separate public debug payload contract; debug output is derived from the canonical instance document and event summaries.

Event-feed appends are intentionally decoupled from full instance-document refreshes so frequent forwarded map events can update debug history with lower UI overhead.

`ui.activePanel` and `ui.panelContext` are runtime-only UI routing fields; they are not persisted in `instance.toJSON()`.

For UI runtime boundaries and internal wiring, see [`docs/5.ui.md`](5.ui.md).

## Map options pass-through

Serialisable map options are passed through via `instanceDocument.config.map.options` to `new Map(options)`, except:

- `container`, which Waymark always controls from `instanceDocument.config.id`
- `style`, which is reserved for MapLibre style output and managed by Waymark from `instanceDocument.config.map.basemaps.vector[]`

Basemap configuration is strict and separate from `map.options`:

- `instanceDocument.config.map.basemaps.raster[]`: multiple allowed, runtime uses top-first stack semantics (`raster[0]` is visually on top).
- `instanceDocument.config.map.basemaps.vector[]`: multiple allowed, runtime active vector is always `vector[0]`.
- vector switching is supported through the basemaps panel radio controls; selecting a vector basemap makes it active at `vector[0]`.
- raster entries use canonical keys: `tileURLTemplates`, `title`, `attributionHTML`, `tileSize`, `minZoom`, `maxZoom`, `opacity`.
- vector entries use canonical keys: `styleURL`, `title`, `attributionHTML`, `maxZoom`, `opacity`.
- legacy basemap field names are rejected (no aliases).
- raster layers are inserted below the first style layer with `type: "symbol"`; if no symbol layer exists, they are appended.
- canonical basemap object key order in normalised/serialised InstanceDocuments is `raster` then `vector`.
- legacy `instanceDocument.config.map.options.style` is rejected.

Runtime default behaviour:

- Open GIS Outdoors vector is resolved as config baseline only when no vector or raster basemap entries are provided.
- If any basemap entry exists (including raster-only), no default vector is injected.
- In raster-only setups, Waymark boots with an internal empty style object and then mounts raster basemap layers.
- A vector basemap without an explicit `attributionHTML` falls back to the attribution declared by its `style.json` (aggregated from the style's source attributions) once the style loads. This runtime-injected attribution is shown in the basemaps panel but is omitted from `toJSON()` output — only explicitly authored `attributionHTML` values are serialised.

Non-serialisable option values are deterministically dropped during normalisation (for example functions, symbols, class instances). This keeps `createInstance(x).toJSON()` stable and re-usable.

For map module boundaries and state-sync internals, see [`docs/4.map.md`](4.map.md).

```js
const instance = createInstance({
  config: {
    id: "map",
    map: {
      basemaps: {
        raster: [
          {
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            title: "OpenStreetMap raster",
            attributionHTML:
              '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
            opacity: 0.6,
          },
        ],
        vector: [
          {
            styleURL:
              "https://raw.githubusercontent.com/OpenGIS/outdoors/refs/heads/master/style.json",
            title: "Open GIS Outdoors",
          },
          {
            styleURL: "https://tiles.openfreemap.org/styles/bright",
            title: "OpenFreeMap Bright",
          },
        ],
      },
      options: {
        center: [-0.1276, 51.5074],
        zoom: 10,
        bearing: 15,
      },
    },
  },
});
```

## Returned instance shape

`createInstance(...)` returns:

```js
{
  id: string,
  toJSON: () => InstanceDocument,
  data: {
    addLayer: (
      layer: { type?: "geojson", data: object, paint?: object },
      options?: { fitBounds?: boolean }
    ) => void,
    fitBounds: (options?: { padding?: number }) => void,
    featureProperties: {
      setEnabled: (enabled: boolean) => void,
      addWhitelistKeys: (keys: string[]) => void,
      getWhitelist: () => string[],
      isEnabled: () => boolean,
      showPopup: (feature: object) => void,
    }
  },
  ui: {
    setMode: (mode: "view" | "debug") => void
  },
  types: {
    setVisibility: (typeKey: string, visible: boolean) => { previous: boolean, next: boolean } | null,
    getVisibility: (typeKey: string) => boolean,
    getAll: () => Record<string, { title: string, visible: boolean }>,
    resetVisibility: () => void
  },
  debug: {
    setEnabled: (enabled: boolean) => void
  },
  destroy: () => void,
  on: (type, handler, options?) => void,
  off: (type, handler, options?) => void,
  once: (type, handler, options?) => void
}
```

`toJSON()` is the only public serialisation API.

## Instance reuse and destroy semantics

- Reuse is ID-first.
- Calling `createInstance(...)` again with the same ID destroys the existing runtime and creates a fresh public instance from the incoming `instanceDocument`.
- `waymark:instance.recreated` is emitted before teardown on that same-ID recreate path.
- `destroy()` is idempotent and safe to call more than once.
- After `destroy()`, creating again with the same ID returns a fresh instance.

## Instance event API

Events are dispatched as `CustomEvent`s from the instance container.

`on(...)`, `off(...)`, and `once(...)` follow browser `EventTarget` semantics because handlers are attached to the container element.

- Use `on(type, handler, options?)`
- Use `off(type, handler, options?)`
- Use `once(type, handler, options?)`

Lifecycle events:

- `waymark:instance.created`
- `waymark:instance.recreated`
- `waymark:instance.destroyed`
  Forwarded map events:
- `waymark:map.load`
- `waymark:map.moveend`
- `waymark:map.zoomend`
- `waymark:map.rotateend`
- `waymark:map.pitchend`
- `waymark:map.error`
  Forwarded map event payload shape:

```js
{
  id: string,
  mapEvent:
    | "load"
    | "moveend"
    | "zoomend"
    | "rotateend"
    | "pitchend"
    | "error",
  originalEvent: unknown
}
```

UI module events:

- `waymark:ui.mode.changed`

Basemaps module event:

- `waymark:map.basemaps.changed`

Data-layer runtime events:

- `waymark:data.layer.added`
- `waymark:data.layer.mounted`
- `waymark:data.layer.error`
  Data-layer mounted payload shape (`waymark:data.layer.mounted`):

```js
{
  id: string,
  layerIndex: number,
  mountedFamilies: Array<"circle" | "line" | "fill" | "symbol">,
  mountedLayerIds: string[],
  mountedTypes: string[]
}
```

Module event payload shape (`waymark:ui.mode.changed`):

```js
{
  id: string,
  module: string,
  event: string,
  previous: unknown,
  next: unknown,
  source: string
}
```

Basemaps changed payload shape (`waymark:map.basemaps.changed`):

```js
{
  id: string,
  mutation: "opacity_changed" | "reordered" | "vector_changed",
  changed: {
    basemapIds: string[],
    opacity?: Record<string, number>,
    orderedBasemapIds?: string[]
  },
  basemaps: {
    vector: Array<{
      basemapId: string,
      styleURL: string | object,
      title?: string,
      attributionHTML?: string,
      maxZoom?: number,
      opacity?: number
    }>,
    raster: Array<{
      basemapId: string,
      tileURLTemplates: string[],
      title?: string,
      attributionHTML?: string,
      tileSize?: number,
      minZoom?: number,
      maxZoom?: number,
      opacity?: number
    }>
  }
}
```

Canonical runtime state events:

- `waymark:state.changed`
- `waymark:state.debug.changed`
- `waymark:state.ui.mode.changed`
- `waymark:state.ui.panel.changed`
- `waymark:state.map.camera.changed`
- `waymark:state.map.basemaps.changed`
- `waymark:state.types.changed`
- `waymark:state.types.visibility.changed`

No-op runtime dispatches emit no state events.

State event payload shape:

```js
{
  id: string,
  command: string,
  scope: string,
  previous: unknown,
  next: unknown,
  meta?: unknown,
  source: string,
  snapshot: {
    map: {
      camera: {
        center: [number, number],
        zoom: number,
        bearing: number,
        pitch: number
      },
      basemaps: {
        vector: unknown[],
        raster: unknown[]
      }
    },
    types: Record<string, { visibility?: "visible" | "none" }>,
    ui: {
      mode: "view" | "debug",
      activePanel: string | null,
      panelContext: unknown
    },
    debug: boolean
  }
}
```

## InstanceDocument shape

`instance.toJSON()` returns a canonical serialisable InstanceDocument object:

```js
{
  config: {
    id: string,
    map: {
      options: object,
      basemaps?: {
        raster?: object[],
        vector?: object[]
      }
    },
    paint?: {
      circle?: object,
      line?: object,
      fill?: object
    },
    types?: Record<string, {
      icon?: string,
      paint?: {
        circle?: object,
        line?: object,
        fill?: object
      }
    }>,
    ui: {
      mode: "view" | "debug"
    },
    debug: boolean
  },
  state: {
    map: {
      options?: {
        center?: [lng, lat],
        zoom?: number,
        bearing?: number,
        pitch?: number
      },
      basemaps?: {
        raster?: object[],
        vector?: object[]
      }
    },
    types?: Record<string, { visible?: boolean }>,
    ui?: { mode?: "view" | "debug" },
    debug?: boolean
  },
  data: {
    layers: Array<{
      type: "geojson",
      data: object,
      paint?: {
        circle?: object,
        line?: object,
        fill?: object
      }
    }>
  }
}
```

`state` is persistence delta only. Unchanged/default branches are omitted.

- `state.map.options` appears only when camera values diverge from config baseline.
- `state.map.basemaps` appears only when basemaps are mutated at runtime.
- `state.types` appears only when type visibility diverges from default (`"visible"`).
- `state.ui.mode` appears only when runtime mode diverges from config baseline.
- `state.debug` appears only when runtime debug state diverges from config baseline.

Camera sync observes low-frequency map end events (`load`, `moveend`, `zoomend`, `rotateend`, `pitchend`) and dispatches state commands. State events emit only when camera values change.

In debug mode, the **Instance document** panel is refreshed from runtime-state events, so camera changes visible in the map are reflected through the same state pipeline.

`instance.toJSON()` is intentionally strict and serialisable so that `createInstance(instance.toJSON())` can be reused as canonical input.

`toJSON()` keeps `config` stable to authored/default intent and serialises basemap keys in canonical `raster` then `vector` order.

Live basemap mutations from runtime commands/UI controls (raster opacity changes, raster reorder, vector active selection) are serialised into `state.map.basemaps` so post-mutation persistence stays in sync with `waymark:map.basemaps.changed` snapshots.

Runtime-enriched metadata (for example GeoJSON source/layer IDs and lifecycle phase) is intentionally excluded from `toJSON()`.

Internal orchestration boundaries are documented in [`docs/3.instances.md`](3.instances.md).

## Initial GeoJSON overlay

Waymark supports data layers from both:

- initial document input (`instanceDocument.data.layers[]`)
- runtime additions (`instance.data.addLayer(layer, { fitBounds?: boolean })`)

Canonical layer input shape:

```js
{ type?: "geojson", data: <GeoJSON> }
```

Current support is `geojson` only. If `type` is omitted, Waymark defaults it to `"geojson"`.

`instance.data.addLayer(...)` emits:

- `waymark:data.layer.added` on success
- `waymark:data.layer.mounted` when MapLibre sublayers for the logical layer are mounted (initial load, runtime add, and style remount)
- `waymark:data.layer.error` on failure (`stage` is `validation` or `runtime`)

Invalid runtime additions throw after emitting `waymark:data.layer.error`.

`instance.data.fitBounds({ padding?: number })` fits the map viewport to encompass all currently loaded data layers. It computes the combined bounding box from every layer's GeoJSON and calls `map.fitBounds()`. `padding` defaults to `20`.

- Multiple GeoJSON layers are supported.
- Data-layer stack order is top-first: `layers[0]` is visually on top.
- Data layers are inserted after raster basemaps and before symbol layers.
- GeoJSON overlays are re-applied after style reloads so authored `data.layers` remain visible (for example when switching the active internal vector basemap).
- Geometry families are rendered by layer type:
  - `Point` and `MultiPoint` → `circle`
  - `LineString` and `MultiLineString` → `line`
  - `Polygon` and `MultiPolygon` → `fill`
- A single logical data layer may mount multiple MapLibre sublayers when the GeoJSON contains mixed families.
- Each data layer is assigned a colour from a 20-colour pool, cycling per-layer index. Pool colours are used as the default when no `config.paint`, `layer.paint`, or config.types-based paint is provided.
- Each sublayer may also participate in type-based rendering when `config.types` are defined and GeoJSON features include a `waymarkType` property. See [Paint & Types](#paint--types) for the full merge semantics.

### Paint & Types

Waymark supports per-layer paint overrides and type-based visual rendering through `config.paint`, per-layer `paint`, and `config.types`.

#### `config.paint` (instance-wide paint defaults)

`config.paint` provides instance-wide paint overrides scoped by geometry family:

```js
{
  paint: {
    circle?: {
      "circle-color"?: string,
      "circle-radius"?: number,
      "circle-opacity"?: number
    },
    line?: {
      "line-color"?: string,
      "line-width"?: number,
      "line-opacity"?: number
    },
    fill?: {
      "fill-color"?: string,
      "fill-opacity"?: number
    }
  }
}
```

Values in `config.paint` override the pool-assigned colour but sit below per-layer and per-type paint in the merge hierarchy.

#### Per-layer `paint`

Each data layer can supply its own family-scoped paint:

```js
{
  data: { ... },
  paint: {
    circle?: { "circle-color"?: string, ... },
    line?: { "line-color"?: string, ... },
    fill?: { "fill-color"?: string, ... }
  }
}
```

Per-layer paint overrides both the pool colour and `config.paint` for that layer's sublayers.

#### `config.types` (type-based rendering)

`config.types` enables data-driven visual rendering keyed by feature property values. When types are defined, features with a matching `waymarkType` property get dedicated sublayers with type-specific paint:

```js
{
  types: {
    "<typeKey>": {
      icon?: string,
      paint?: {
        circle?: { "circle-color"?: string, ... },
        line?: { "line-color"?: string, ... },
        fill?: { "fill-color"?: string, ... }
      }
    }
  }
}
```

Type keys must be non-empty and match `/^[a-z0-9]+(-[a-z0-9]+)*$/` (1-64 characters, lowercase a-z, digits 0-9, and hyphens only — no leading or trailing hyphens). For each defined type, Waymark creates per-family sublayers filtered by `["==", ["get", "waymarkType"], "<typeKey>"]`.

##### `icon` property

`config.types[typeKey].icon` (optional string) specifies an SVG symbol ID from Waymark's bundled `waymark-icons` sprite set. When set alongside a `circle-color` in the type's paint, Waymark renders point features of that type as MapLibre `symbol` layers instead of `circle` layers. The icon is extracted from the sprite, rendered to a canvas with the type's `circle-color` as fill, and registered with the map.

If the icon ID is not found in the sprite, or if no `circle-color` is provided, Waymark logs a warning and skips icon loading for that type. When `icon` is present but `circle-color` is missing, the type falls back to regular circle rendering (if a `circle` paint block exists) or is skipped.

Icons are loaded once ahead of all data layers during initial mount and after style reloads. Each icon is registered with MapLibre using the type key as the image ID, referenced in the layer's `layout` as `"icon-image": "<typeKey>"`.

##### `iconSize` property

`config.types[typeKey].iconSize` (optional number) sets the icon scale for symbol layers when a type has an `icon` defined. Defaults to `1.5` when not provided. For example, `iconSize: 1` renders the icon at its native size.

##### Type rendering plan

When types are defined, the render plan for each data layer produces:

1. An **untyped fallback** sublayer per geometry family, filtered to features without `waymarkType`, using pool colour merged with `config.paint` and `layer.paint`.
2. A **per-type sublayer** for each type that provides a matching family-scoped paint (or an icon), filtered by `waymarkType` key.

Type paint sits at the top of the merge hierarchy — it overrides pool colour, `config.paint`, and `layers[].paint` for typed sublayers.

When a type has an `icon` property, its point family becomes `"symbol"` instead of `"circle"`. The paint for symbol layers uses `icon-opacity` only; the fill colour is applied during icon rendering, not as a MapLibre paint property.

#### Paint merge order (highest to lowest priority)

1. Type paint (`config.types[typeKey].paint[family]`) — or icon-derived fill colour for symbol layers
2. Layer paint (`layer.paint[family]`)
3. Instance paint (`config.paint[family]`)
4. Pool colour + family defaults (radius, width, opacity)

##### Hit-circle layers

All point features (circle-family and icon symbols) have companion invisible hit-circle layers that provide a consistent large click target. When a feature renders as a MapLibre `circle` or `symbol` layer, an invisible circle (radius 14, `circle-opacity: 0`) is mounted behind it with the same `waymarkType` filter.

- **Symbol icons**: hit-circle ID is `{baseLayerId}-circle-hit-{typeKey}`
- **Regular circles**: hit-circle ID is `{baseLayerId}-{family}-hit`

These hit-circles are invisible to the user but detectable by `queryRenderedFeatures`, ensuring clicks near point features are captured reliably even when the visual marker or icon is small. The `featureProperties` module queries hit-circles at a higher priority than visible circle layers.

##### Click priority

When multiple layers overlap at the cursor position, the layer with the highest numeric priority wins when resolving the clicked feature:

| Priority | Layer type                  |
| -------- | --------------------------- |
| 3        | Symbol icon layers          |
| 2        | Invisible hit-circle layers |
| 1        | Regular circle layers       |
| 0        | Line and fill layers        |

This ensures that invisible hit-circles (priority 2) are preferred over visible circle layers (priority 1), and symbol icon layers (priority 3) take precedence over both. The priority system is internal to the `featureProperties` module and not exposed in the public API.

#### `instance.types` runtime API

```
instance.types.setVisibility(typeKey, visible: boolean)  → { previous: boolean, next: boolean } | null
instance.types.getVisibility(typeKey)                    → boolean
instance.types.getAll()                                  → Record<string, { title: string, visible: boolean }>
instance.types.resetVisibility()
```

- `setVisibility(boolean)` hides or shows typed sublayers by updating `waymarkType`-based filters to use `["none"]` or `["!=", ["get", "waymarkType"], typeKey]` for visibility. Returns `{ previous, next }` on success, `null` if destroyed or type key unknown.
- `getVisibility` returns `true` (visible) or `false` (hidden). Returns `true` for unknown keys.
- `getAll` returns the full type definition map including `title` and current `visible` boolean.
- `resetVisibility` restores all types to visible (no return value).

Type visibility produces `waymark:state.types.changed` and `waymark:state.types.visibility.changed` state events.

#### Paint serialisation

- `config.paint` and `config.types` are serialised in `toJSON().config` as authored.
- `state.types` appears in `toJSON()` only when type visibility diverges from default (any type set to `false`). It contains only the visibility delta:

```js
{
  types: {
    "<typeKey>": { visible: false }
  }
}
```

- Per-layer `paint` is serialised alongside each layer in `toJSON().data.layers[].paint`.

```js
createInstance({
  config: {
    id: "map",
  },
  data: {
    layers: [
      {
        data: {
          type: "FeatureCollection",
          features: [],
        },
      },
    ],
  },
});

instance.data.addLayer({
  data: {
    type: "FeatureCollection",
    features: [],
  },
});
```

GeoJSON source/layer IDs are instance-scoped to avoid collisions:

- source: `waymark-{id}-geojson-source-{index}`
- sublayer: `waymark-{id}-geojson-layer-{index}-{family}`

For the full data contract (validation, serialisation, runtime mounting, and dev example usage), see [`docs/6.data.md`](6.data.md).
