# OSM Highlights — Technical Overview

## How OSM Data Flows from Tile Server to Highlighted Map

```
┌─────────────────────┐
│  OpenFreeMap CDN    │  Vector tiles (protobuf) — OpenMapTiles schema
│  tiles.openfreemap  │  Served at /{z}/{x}/{y}.pbf
│  .org/planet/...    │  Zoom 0-14, 14 source layers
└────────┬────────────┘
         │ HTTP (browser-cached)
         ▼
┌─────────────────────┐
│  MapLibre GL JS     │  Decodes protobuf tiles into internal feature index
│  (via Waymark JS)   │  Renders basemap using OpenFreeMap "bright" style
│                     │  Tile data stays in memory — no re-fetch needed
└────────┬────────────┘
         │ map.addLayer() / map.setFilter()
         ▼
┌─────────────────────┐
│  Highlight Layers   │  Additional style layers on the SAME tile source
│  (useHighlights.js) │  Filter expressions select matching features
│                     │  Rendered on top of the basemap
└────────┬────────────┘
         │ map.queryRenderedFeatures()
         ▼
┌─────────────────────┐
│  Results Panel      │  Reads currently visible highlighted features
│  (useResults.js)    │  Deduplicates, counts, links to openstreetmap.org
└─────────────────────┘
```

### Key Principle: Zero Extra Tile Fetches

All highlight layers use `source: "openmaptiles"` — the same vector tile source that renders the basemap. MapLibre has already fetched and decoded these tiles. Adding highlight layers just creates additional rendering passes over the same in-memory data. The browser's HTTP cache ensures tiles are fetched from the network only once.

---

## Architecture

### 1. Query Model (`useQueries.js`)

Each query is a plain object:

```js
{
  id: "q_abc12345",          // Random unique ID
  name: "Bike Shops",        // User-facing label
  enabled: true,             // Toggle on/off
  colour: "#00BB00",         // Highlight colour
  sourceLayer: "poi",        // Which OpenMapTiles layer to search
  combinator: "AND",         // How to combine conditions: AND | OR
  icon: "🚲",               // Optional emoji icon for point features
  conditions: [              // Tag filters
    { key: "subclass", operator: "equals", value: "bicycle" }
  ]
}
```

**Source layers** correspond to the layers inside the vector tiles. The main ones for cycling:
- `transportation` — roads, paths, cycleways (line geometry)
- `poi` — points of interest: shops, parking, rentals (point geometry)

**Operators:**
| Operator | MapLibre Expression | Notes |
|-----------|-------------------|-------|
| `equals` | `["==", ["get", key], value]` | Exact string match |
| `not-equals` | `["!=", ["get", key], value]` | Exclusion filter |
| `contains` | `["in", value, ["coalesce", ["get", key], ""]]` | Substring search |
| `exists` | `["has", key]` | Property is present (any value) |
| `regex` | `["has", key]` + JS post-filter | MapLibre has no native regex; broad filter on map, precise filter in JS |

**Persistence:** Queries are serialised to `localStorage` under `osm2-highlight-queries`. On first visit, 8 cycling-themed preset queries are loaded.

---

### 2. Highlighting Engine (`useHighlights.js`)

This is the core module. It translates queries into MapLibre style layers.

#### Step-by-step: What happens when a query is enabled

**a) Build the filter expression**

Conditions are converted to MapLibre expression arrays and combined:

```js
// Single condition → expression
{ key: "subclass", operator: "equals", value: "cycleway" }
  → ["==", ["get", "subclass"], "cycleway"]

// Multiple conditions with AND
["all",
  ["==", ["get", "subclass"], "cycleway"],
  ["has", "bicycle"]
]
```

**b) Determine layer types from source layer**

Each source layer maps to one or more MapLibre layer types based on its geometry:

| Source Layer | Geometry | MapLibre Layer Types |
|-------------|----------|---------------------|
| `transportation` | Lines | `line` |
| `poi` | Points | `circle` + `symbol` (if icon set) |
| `building`, `landuse`, `park` | Polygons | `fill` + `line` |

**c) Create MapLibre layers**

For a transportation query like "Dedicated Cycleways":
```js
map.addLayer({
  id: "osm2-hl-q_abc12345-line",
  type: "line",
  source: "openmaptiles",           // ← shared tile source
  "source-layer": "transportation", // ← which layer in the tiles
  filter: ["==", ["get", "subclass"], "cycleway"],
  paint: { "line-color": "#FF0000", "line-width": 4, "line-opacity": 0.85 }
});
```

For a POI query like "Bike Shops", TWO layers are created:
```js
// 1. Circle marker (always visible)
map.addLayer({
  id: "osm2-hl-q_def67890-circle",
  type: "circle",
  source: "openmaptiles",
  "source-layer": "poi",
  minzoom: 11,  // POI data starts at zoom 11
  filter: ["==", ["get", "subclass"], "bicycle"],
  paint: { "circle-radius": 7, "circle-color": "#00BB00", ... }
});

// 2. Symbol layer with emoji icon + name label
map.addLayer({
  id: "osm2-hl-q_def67890-symbol",
  type: "symbol",
  source: "openmaptiles",
  "source-layer": "poi",
  minzoom: 11,
  filter: ["==", ["get", "subclass"], "bicycle"],
  layout: { "icon-image": "osm2-icon-q_def67890", "text-field": ["get", "name"], ... }
});
```

**d) Emoji icons via Canvas**

Server-side fonts (Noto Sans on OpenFreeMap) don't contain emoji glyphs. Instead, emoji are rendered to a `<canvas>` element using the browser's native emoji font, then registered with MapLibre as raster images:

```js
const canvas = document.createElement("canvas");
ctx.fillText("🚲", ...);
const imageData = ctx.getImageData(0, 0, size, size);
map.addImage("osm2-icon-q_def67890", imageData, { pixelRatio: ratio });
```

The symbol layer then references this with `"icon-image": "osm2-icon-q_def67890"`.

#### Layer Lifecycle

`syncLayers()` runs whenever queries change (via Vue `watch`). It:
1. Builds a map of desired layers from all enabled queries
2. Removes any existing layers that are no longer needed
3. Adds new layers or updates filters/paint/layout on existing ones
4. Exposes the list of active layer IDs for the results composable

---

### 3. Results Engine (`useResults.js`)

After MapLibre renders highlight layers, the results composable reads back what's visible.

**How it works:**

```js
// Get all visible features on the highlight layers
const features = map.queryRenderedFeatures({ layers: ["osm2-hl-q_abc-line"] });
```

`queryRenderedFeatures` searches MapLibre's internal tile index for features that:
- Match the layer's filter expression
- Are within the current viewport
- Are at the current zoom level

**Post-processing:**
1. **Regex post-filter** — For `regex` operator conditions, MapLibre uses a broad `["has", key]` filter. The results composable applies the actual `RegExp` test in JavaScript.
2. **Deduplication** — The same OSM feature can appear in multiple tiles at tile boundaries. Features are deduplicated by `osm_id` (or feature ID, or coordinate hash).
3. **OSM links** — Each feature's ID encodes the OSM ID and type: `feature.id = osm_id * 10 + type` (1=node, 2=way, 3=relation). Links point to `openstreetmap.org/{type}/{osm_id}`.

Results refresh on `moveend` and `zoomend` map events.

---

### 4. OpenMapTiles Data Schema

The vector tiles follow the [OpenMapTiles schema](https://openmaptiles.org/schema/). Key fields for cycling queries:

**`transportation` layer** (lines — roads, paths, cycleways):
| Field | Values | Example |
|-------|--------|---------|
| `class` | `motorway`, `primary`, `secondary`, `tertiary`, `minor`, `path`, `service` | Filter road types |
| `subclass` | `cycleway`, `footway`, `path`, `bridleway`, `steps` | Specific path types |
| `bicycle` | `yes`, `designated`, `no`, `dismount` | Explicit cycling access |
| `surface` | `paved`, `unpaved`, `asphalt`, `gravel`, `ground` | Surface quality |

**`poi` layer** (points — shops, amenities):
| Field | Values | Example |
|-------|--------|---------|
| `class` | `bicycle`, `bicycle_rental`, `bicycle_parking`, `shop`, `cafe`, `hospital` | POI category |
| `subclass` | `bicycle`, `bicycle_parking`, `bicycle_rental`, `drinking_water`, `cafe` | Specific type |
| `name` | Feature name string | Display label |
| `rank` | 1-25 | Importance (lower = more important) |

**Tile zoom ranges:**
- Transportation data: zoom 4-14
- POI data: zoom 11-14 (only appears when zoomed in)
- MapLibre overzooms beyond z14 using cached z14 tiles

---

## Data Flow Summary

```
User creates/edits query in Vue UI
        │
        ▼
useQueries saves to localStorage + updates reactive ref
        │
        ▼
Vue watch triggers useHighlights.syncLayers()
        │
        ├── Converts conditions → MapLibre filter expressions
        ├── Renders emoji → Canvas → map.addImage()
        └── Calls map.addLayer() / map.setFilter() / map.setPaintProperty()
                │
                ▼
        MapLibre re-renders using EXISTING tile data (no network request)
                │
                ▼
        moveend/zoomend events trigger useResults.refreshResults()
                │
                ├── map.queryRenderedFeatures({ layers: [...] })
                ├── Post-filter regex conditions in JS
                ├── Deduplicate by osm_id
                └── Update results panel with counts + OSM links
```

No tiles are re-fetched. All querying happens against MapLibre's in-memory tile index.
