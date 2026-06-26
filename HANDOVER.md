## 1) Project intent summary

The current goal is to move from a single `data.geoJSON` object to a **stacked data layer abstraction** that is serialisable, testable, and documented, while staying lightweight and GeoJSON-first.

Key intent points:

- `data` should become an ordered collection of layer objects (render order matters).
- GeoJSON (RFC 7946) should remain the core representation for vector features.
- Waymark-specific metadata/styling should be wrapped around GeoJSON over time.
- Start with a minimal tracer-bullet implementation, then expand.
- Render order target: data layers after raster basemaps, before symbol layers.

## 2) What is implemented now (concrete, with file references)

### Data model + serialisation

- InstanceDocument data now uses `data.layers: WaymarkInstanceDocumentDataLayer[]` instead of `data.geoJSON` (`src/document/instanceDocument.js:54-58`).
- Each layer currently supports only one key: `geoJSON` (`src/document/instanceDocument.js:451-455`).
- Normalisation:
  - defaults to `data.layers = []` (`src/document/instanceDocument.js:521-523`)
  - normalises `data.layers` when provided (`src/document/instanceDocument.js:530-532`)
  - coerces non-plain-object `geoJSON` to `null` (`src/document/instanceDocument.js:458-462`)
- Validation now enforces that `data.layers` is an array of objects with exactly `{ geoJSON }` (`src/document/instanceDocument.js:573-590`).

### Runtime wiring

- Runtime now passes `instanceDocument.data.layers` into the GeoJSON module (`src/runtime/createInstanceCore.js:746-750`).
- `toJSON()` serialises data back as `data.layers[]` from runtime module state (`src/runtime/createInstanceCore.js:950-953`).

### Rendering behaviour

- GeoJSON module now accepts an array of layers (`src/geojson/createGeoJSONModule.js:13-15`).
- It creates per-layer instance-scoped IDs with index suffixes (`src/geojson/createGeoJSONModule.js:17-20`).
- It renders each provided layer as a MapLibre `line` layer with fixed paint (`src/geojson/createGeoJSONModule.js:45-53`).
- Layer insertion uses `beforeLayerId` chaining so index `0` ends up on top within the GeoJSON stack (`src/geojson/createGeoJSONModule.js:33-59`).
- Rendering happens on map `load` (or immediately if already loaded) (`src/geojson/createGeoJSONModule.js:66-76`).

### Dev-page fixtures

- `src/dev.js` now passes one basic GeoJSON data layer into each demo instance via `data.layers`.
- `tests/browser/2.development.test.js` now asserts both dev instances serialise one data layer in `toJSON().data.layers`.

### Test coverage added/updated

- Unit/API tests moved to `data.layers` and assert serialisation/reuse (`tests/docs/1.api.test.js:179-233`, `tests/docs/1.api.test.js:2483-2486`).
- Unit/API tests assert stack order with raster + symbol context (`tests/docs/1.api.test.js:2415-2482`).
- Browser/API tests moved to `data.layers` and assert scoped IDs + stack order (`tests/browser/1.api.test.js:1013-1067`, `tests/browser/1.api.test.js:1069-1163`).
- A new intentionally failing browser/API test now exists as the next implementation starting point: `tests/browser/1.api.test.js` → `renders Point-only GeoJSON layers as circle layers`.

## 3) What is intentionally deferred

The current implementation is intentionally minimal:

- No first-party layer metadata yet (`id`, `title`, `descriptionHTML`, etc.).
- No layer-level style/paint configuration in the document model.
- No geometry-type-aware rendering (everything is currently rendered as a line layer).
- No RFC 7946 semantic validation beyond “plain object + serialisable”.
- No layer lifecycle commands yet (add/remove/reorder/toggle after instance creation).
- No public events specific to data-layer mutations.

## 4) Remaining risk notes versus target architecture

> [!NOTE]
> Docs have now been synced to the canonical `data.layers` model, including stack/insertion semantics.

- The “data layer abstraction” exists, but currently as a thin wrapper (`{ geoJSON }`) without additional metadata/styling expected in later phases.
- Render order target (after raster basemaps, before symbol layers) is implemented and tested.
- Styling flexibility and layer lifecycle commands remain intentionally deferred (see next slices).

## 5) Recommended next tracer-bullet slices for GeoJSON rendering expansion

> [!WARNING]
> Current red test to start from: `tests/browser/1.api.test.js` → `renders Point-only GeoJSON layers as circle layers`.
> It currently fails because Point features are still rendered through a `line` layer.

1. **Slice A — Canonical layer envelope v1**
   - Add minimal stable keys: `layerId`, `title` (optional), `visibility` (optional), `geoJSON`.
   - Keep strict normalisation + serialisation rules.
   - Update tests/docs first-class contract for new keys.

2. **Slice B — Per-layer paint preset (still simple)**
   - Add a small optional `paint` object for line-only styling (e.g. colour/width/opacity).
   - Keep fallback defaults identical to current output.
   - Validate serialisability and clamp numeric ranges where needed.

3. **Slice C — Geometry-aware rendering baseline**
   - Support `Point`/`LineString`/`Polygon` families with basic layer types (`circle`/`line`/`fill`).
   - Keep one predictable style preset per geometry family.
   - Preserve stack ordering semantics (`layers[0]` top within data stack).

4. **Slice D — Runtime mutation commands (minimum useful set)**
   - Add core commands for `setLayerVisibility` and `reorderLayers`.
   - Emit one aggregate `waymark:data.layers.changed` event.
   - Keep `toJSON()` state delta aligned with emitted snapshots.

## 6) Verification checklist for next phase

- Run baseline checks:
  - `npm run format:check`
  - `npm run docs:sync`
  - `npm test`
  - `npm run test:browser`
- Add/keep explicit assertions for:
  - strict round-trip `createInstance(x).toJSON()` parity
  - layer order guarantees (including raster/symbol sandwich)
  - invalid key rejection for data-layer schema
  - serialisation of optional layer metadata/style fields
  - browser smoke: no console errors on GeoJSON-layer scenarios
- Update docs in the same slice as source/tests:
  - `docs/1.api.md`, `docs/4.map.md`, `README.md`
  - ensure examples use `data.layers` consistently
  - re-run `npm run docs:sync` after doc edits
