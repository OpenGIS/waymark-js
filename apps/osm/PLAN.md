# Implementation Plan: OSM PBF Tile Inspector

## Goal
Re-implement the OSM PBF Tile Inspector using the latest Waymark JS (v3). This application allows users to inspect raw vector data from OpenStreetMap PBF tiles loaded by the map.

## Context
- **App Entry**: `apps/osm/index.html`
- **Functionality**: Intercepts map tile requests, allows users to select specific tiles, parses their PBF content, and renders the raw vector features as interactive overlays.
- **Data Source**: OpenFreeMap (OpenStreetMap data) via PBF vector tiles.

## Functional Requirements

### 1. Tile Debugger UI
A floating debug panel provides controls and feedback:
- **Tile List**: Displays a real-time list of PBF tiles being requested by the map view.
- **View Filter**: Option to "Only show tiles in view" to filter the list to the current map extent.
- **Geometry Filters**: Checkboxes to toggle visibility of specific geometry types (Point, LineString, Polygon, etc.).
- **Layer Filters**: Dynamic list of vector layers found within parsed tiles (e.g., `transportation`, `building`), allowing users to toggle them on/off.

### 2. Tile Interception
- The application monitors network requests made by the MapLibre instance.
- Specifically targets requests to the tile provider (e.g., `openfreemap`) ending in `.pbf`.
- Captures the URL and tile coordinates (Z/X/Y) for display in the debugger.

### 3. PBF Parsing & Rendering
- **On-Demand Loading**: Users click a "Load" button next to a tile in the debug list.
- **Browser Cache Usage**: The app fetches the selected PBF tile using `cache: "force-cache"`. This ensures efficient reuse of the data already downloaded by the map renderer, avoiding redundant network requests.
- **Vector Decoding**:
  - Uses `pbf` to decode the protocol buffer format.
  - Uses `@mapbox/vector-tile` to extract vector layers and features.
- **GeoJSON Conversion**:
  - Converts vector tile features into standard GeoJSON.
  - Transforms tile-relative coordinates to WGS84 (Lat/Lng).
  - Enriches feature properties with metadata (layer name, original tile coordinates).
  - Generates an HTML description table for feature properties to support inspection.

### 4. Feature Inspection
- When parsed features are loaded onto the map, they become interactive.
- Clicking a feature displays its properties (tags from OSM) in a popup or overlay, utilizing the generated HTML description.

## Implementation Details

### External Dependencies
The application requires the following libraries (loaded via ESM) to parse the vector tile standard (MVT):
- `pbf`: For low-level protocol buffer decoding.
- `@mapbox/vector-tile`: A standard library for parsing the Vector Tile specification (which MapLibre uses).

### Migration Notes (v2 to v3)
- **Data Loading**: The mechanism for adding GeoJSON data to the map has changed in v3. The implementation should use the appropriate v3 API for adding the parsed FeatureCollection (e.g., via a source/layer management API or a dedicated overlay method).
- **Instance Configuration**: Ensure the Waymark instance is initialized correctly according to v3 patterns.
- **Event Handling**: Update map event listeners (moveend, zoomend) to align with any changes in the v3 event system if applicable.

