---
name: waymark-js
description: Waymark JS reference. Use when working on source, docs, tests, or API/config behaviour for the MapLibre-based library.
---

# Waymark JS

Waymark JS is a small JavaScript map library built on [MapLibre GL](https://maplibre.org/). It exposes a simple `createInstance(...)` API, forwards map configuration through `config.map.options`, and gives direct access to the underlying MapLibre instance.

**Key facts:**

- Entry point: `import { createInstance } from './dist/waymark.js'`
- Source: `src/` — built with Vite into `dist/`
- Tests: `npm test` and `npm run test:browser` (workflow in `docs/2.development.md`)
- Docs source: `docs/` (also generates this skill file)

---

# API

> Consumer API reference for `createInstance(instanceDocument?)`.

> [!NOTE]
> API heading names and `api-contract` marker blocks are enforced by sync automation. Change them only alongside matching tests and sync scripts.

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

<!-- api-contract:signature:start -->

`createInstance(instanceDocument?)`

<!-- api-contract:signature:end -->

| Parameter          | Type     | Required | Behaviour                                                                                                                          |
| ------------------ | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `instanceDocument` | `object` | No       | Canonical serialisable InstanceDocument with strict top-level keys: `config`, `state`, `data`. Unknown top-level keys are ignored. |

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
        vector?: Array<{
          styleURL: string | object,
          title?: string,
          attributionHTML?: string,
          maxZoom?: number,
          opacity?: number
        }>,
        raster?: Array<{
          tileURLTemplates: string[],
          title?: string,
          attributionHTML?: string,
          tileSize?: number,
          minZoom?: number,
          maxZoom?: number,
          opacity?: number
        }>
      }
    },
    ui?: { mode?: "view" | "debug" }
  },
  state: {
    map: {
      center?: [number, number],
      zoom?: number,
      bearing?: number,
      pitch?: number
    },
    ui: {
      mode: "view" | "debug"
    }
  },
  data: {
    geoJSON: object | null
  }
}
```

## Container resolution

- `createInstance(...)` is a browser-runtime API. It requires DOM access and is not intended for server-only runtimes without a DOM.
- A provided `instanceDocument.config.id` must already exist in the DOM.
- If that element is missing, `createInstance(...)` throws `Waymark container "{id}" was not found.`.
- If `instanceDocument.config.id` is omitted, Waymark generates an ID prefixed with `waymark-` and appends the container to `document.body`.

In SSR applications, instantiate on the client only, after the container element exists.

## Config defaults and merge behaviour

Waymark resolves config with a deep merge:

- Base: `src/config/defaultConfig.json`
- Override: `instanceDocument.config`
- Objects merge recursively
- Arrays are replaced (not merged by index)

<!-- api-contract:defaults:start -->

- `map.options.center`: `[0, 0]`
- `map.options.zoom`: `2`
- `map.options.attributionControl`: `false`
- `map.basemaps.vector[0].styleURL` (runtime-injected only when no basemap entries exist): `https://tiles.openfreemap.org/styles/bright`
<!-- api-contract:defaults:end -->

- `ui.mode`: `"view"` (invalid values fall back to `"view"`)

Accepted `ui.mode` values:

- `"view"` (default): mounts the shell but renders no mode-specific content.
- `"debug"`: renders a debug control in the shell; the control toggles debug outputs.

Any other value is normalised to `"view"`.

## UI shell mode rendering

Waymark mounts a per-instance Vue shell in the target map container (`data-waymark-app="true"`) and renders mode-specific content through nested mode components:

- `src/ui/InstanceShell.vue`
- `src/ui/modes/InstanceShellModeView.vue`
- `src/ui/modes/InstanceShellModeDebug.vue`

In `"view"` mode, the shell is present but intentionally empty. In `"debug"` mode, the shell renders a debug control (`debug-output-toggle`) and the toggled debug panel with two sections:

- **Instance document**: current `instance.toJSON()` snapshot.
- **Waymark events (last 25)**: bounded event history for core Waymark events only (`waymark:instance.*`, `waymark:ui.mode.changed`, forwarded `waymark:map.*`) with sanitised summaries.

For UI runtime boundaries and internal wiring, see [`docs/5.ui.md`](5.ui.md).

## Map options pass-through

Serialisable map options are passed through via `instanceDocument.config.map.options` to `new Map(options)`, except:

- `container`, which Waymark always controls from `instanceDocument.config.id`
- `style`, which is reserved for MapLibre style output and managed by Waymark from `instanceDocument.config.map.basemaps.vector[]`

Basemap configuration is strict and separate from `map.options`:

- `instanceDocument.config.map.basemaps.vector[]`: multiple allowed, runtime uses only the first entry.
- `instanceDocument.config.map.basemaps.raster[]`: multiple allowed, runtime stacks in listed order.
- vector entries use canonical keys: `styleURL`, `title`, `attributionHTML`, `maxZoom`, `opacity`.
- raster entries use canonical keys: `tileURLTemplates`, `title`, `attributionHTML`, `tileSize`, `minZoom`, `maxZoom`, `opacity`.
- legacy basemap field names are rejected (no aliases).
- raster layers are inserted below the first style layer with `type: "symbol"`; if no symbol layer exists, they are appended.
- legacy `instanceDocument.config.map.options.style` is rejected.

Runtime default behaviour:

- OpenFreeMap vector is injected only when no vector or raster basemap entries are provided.
- If any basemap entry exists (including raster-only), no default vector is injected.
- In raster-only setups, Waymark boots with an internal empty style object and then mounts raster basemap layers.

Non-serialisable option values are deterministically dropped during normalisation (for example functions, symbols, class instances). This keeps `createInstance(x).toJSON()` stable and re-usable.

For map module boundaries and state-sync internals, see [`docs/4.map.md`](4.map.md).

```js
createInstance({
  config: {
    id: "map",
    map: {
      basemaps: {
        vector: [
          {
            styleURL: "https://tiles.openfreemap.org/styles/bright",
          },
        ],
        raster: [
          {
            tileURLTemplates: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            opacity: 0.6,
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
  ui: {
    setMode: (mode: "view" | "debug") => void
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

<!-- api-contract:lifecycle-events:start -->

- `waymark:instance.created`
- `waymark:instance.recreated`
- `waymark:instance.destroyed`
<!-- api-contract:lifecycle-events:end -->

Forwarded map events:

<!-- api-contract:forwarded-map-events:start -->

- `waymark:map.load`
- `waymark:map.moveend`
- `waymark:map.zoomend`
- `waymark:map.rotateend`
- `waymark:map.pitchend`
<!-- api-contract:forwarded-map-events:end -->

Forwarded map event payload shape:

```js
{
  id: string,
  mapEvent: "load" | "moveend" | "zoomend" | "rotateend" | "pitchend",
  originalEvent: unknown
}
```

UI module events:

- `waymark:ui.mode.changed`

Module event payload shape:

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

## InstanceDocument shape

`instance.toJSON()` returns a canonical serialisable InstanceDocument object:

```js
{
  config: {
    id: string,
    map: {
      options: object,
      basemaps?: {
        vector?: object[],
        raster?: object[]
      }
    },
    ui: {
      mode: "view" | "debug"
    }
  },
  state: {
    map: {
      center: [lng, lat],
      zoom: number,
      bearing: number,
      pitch: number
    },
    ui: {
      mode: "view" | "debug"
    }
  },
  data: {
    geoJSON: object | null
  }
}
```

`state.map` syncs on low-frequency map end events (`load`, `moveend`, `zoomend`, `rotateend`, `pitchend`).

`instance.toJSON()` is intentionally strict and serialisable so that `createInstance(instance.toJSON())` can be reused as canonical input.

`toJSON()` omits runtime-injected default basemaps, preserves explicitly authored basemap entries (including explicit OpenFreeMap values), and omits empty basemap arrays.

Runtime-enriched metadata (for example GeoJSON source/layer IDs and lifecycle phase) is intentionally excluded from `toJSON()`.

Internal orchestration boundaries are documented in [`docs/3.instances.md`](3.instances.md).

## Initial GeoJSON overlay

When `data.geoJSON` is provided in `instanceDocument`, Waymark adds an instance-scoped GeoJSON source and line layer on load (or immediately if the map is already loaded).

```js
createInstance({
  config: {
    id: "map",
  },
  data: {
    geoJSON: {
      type: "FeatureCollection",
      features: [],
    },
  },
});

createInstance({});
```

GeoJSON source/layer IDs are instance-scoped to avoid collisions.

---

# Development

> Contributor workflow and verification protocol for Waymark JS.

## Contributor workflow

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Run formatting: `npm run format`
4. Verify formatting: `npm run format:check`
5. Run docs and API sync checks: `npm run docs:sync`
6. Run unit tests: `npm test`
7. Run browser tests: `npm run test:browser`

`npm run build` still runs `node scripts/skill-md.js` before Vite build output, so skill docs stay in sync with `docs/*.md`.

Vite config defines `process.env.NODE_ENV` as a build-time replacement for the dist bundle, preventing browser runtime errors like `process is not defined`.

## Conventions and definitions

- **Instance**: public object returned by `createInstance(...)`.
- **Runtime core**: internal lifecycle object in `src/runtime/createInstanceCore.js`.
- **Runtime registry**: internal ID→core map in `src/runtime/runtimeRegistry.js`.
- **InstanceDocument**: canonical serialisable payload from `instance.toJSON()`.
- **GeoJSON**: map data format and symbol naming (`createGeoJSONModule`, `geoJSON`).

Keep runtime internals internal. Consumer docs and tests should target public API behaviour.

## Naming conventions

Use camelCase identifiers, with acronyms kept uppercase.

- `instanceDocument`
- `InstanceDocument`
- `geoJSON`
- `styleURL`
- `tileURLTemplates`
- `attributionHTML`

Use `instanceDocument` as the canonical variable/parameter name for the `createInstance(instanceDocument?)` input payload.

Prefer these canonical forms in source, tests, docs, and fixtures.

For basemap payload keys specifically, avoid legacy aliases such as `styleUrl`, `tileUrls`, and `attributionHtml`.

## Testing strategy

- `tests/docs/*.test.js` (Vitest + jsdom): API contract tests without WebGL.
- `tests/browser/*.test.js` (Playwright): browser API and dev-page smoke behaviour.

Use jsdom tests to validate API contract behaviour, not as proof of non-browser runtime support. Browser tests are the runtime source of truth for instance behaviour.

## Dev page mode setup

`src/dev.js` intentionally boots two instances with one mode per instance:

- `#map` uses `ui.mode: "view"`
- `#map-two` uses `ui.mode: "debug"`

This gives a stable baseline for browser smoke coverage in `tests/browser/2.development.test.js`:

- both containers and canvases render
- view-mode shell has no debug panel
- debug-mode shell shows the debug control and the debug panel by default (instance document + bounded event feed)
- two dev dropdowns exist: `#dev-instance-mode` (for `#map`) and `#dev-instance-mode-two` (for `#map-two`)

`src/dev.js` wires both dropdowns via `instance.ui.setMode(nextMode)`. Browser smoke asserts independent mode switching in both UI and serialised InstanceDocument payloads:

- switching `#dev-instance-mode` to `debug` only changes `#map` to debug UI/InstanceDocument state
- switching `#dev-instance-mode-two` to `view` only changes `#map-two` to view UI/InstanceDocument state
- toggling either dropdown back restores each instance baseline without coupling

Run:

```bash
npm run format:check
npm run docs:sync
npm test
npm run test:browser
```

## Docs ↔ tests sync protocol

Treat docs and tests as one contract. Change both in the same slice.

| Docs page             | Unit tests                                                 | Browser tests                                             |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| `docs/1.api.md`       | `tests/docs/1.api.test.js`                                 | `tests/browser/1.api.test.js`                             |
| `docs/3.instances.md` | Internal-boundary assertions in `tests/docs/1.api.test.js` | Dev smoke in `tests/browser/2.development.test.js`        |
| `docs/4.map.md`       | Map contract assertions in `tests/docs/1.api.test.js`      | Map API coverage in `tests/browser/1.api.test.js`         |
| `docs/5.ui.md`        | UI mode/state assertions in `tests/docs/1.api.test.js`     | UI mode coverage in `tests/browser/2.development.test.js` |

Automation guards:

- `npm run docs:contract` checks required docs headings and mapped test `describe(...)` blocks.
- `npm run docs:api-sync` checks API sections in `docs/1.api.md` against generated source contract data.

## Hard sync workflow (docs ↔ source ↔ tests)

`npm run docs:sync` is intentionally strict and should be treated as a hard gate before tests.

Execution order:

1. `npm run docs:contract`
   - Reads `scripts/doc-test-contract.json`.
   - Verifies required headings in tracked docs pages (`docs/1.api.md`, `docs/4.map.md`, `docs/5.ui.md`).
   - Verifies mapped `describe(...)` block names in `tests/docs/1.api.test.js` and `tests/browser/1.api.test.js`.
2. `npm run docs:api-sync`
   - Runs `npm run api:contract` first, generating `docs/.generated/api-contract.json` from source defaults/events.
   - Compares marker blocks in `docs/1.api.md` (`signature`, `defaults`, `lifecycle-events`, `forwarded-map-events`) against generated contract values.

If this gate fails, fix docs headings/marker blocks and corresponding test `describe(...)` names in the same change.

## Adding or changing API sections safely

Use this convention whenever you add, rename, or remove a section in `docs/1.api.md`.

### API section naming

- Use stable heading text in sentence case (for example, `## InstanceDocument shape`).
- Treat each heading name as automation-backed contract text, not editorial copy.

### One-to-one heading and `describe(...)` mapping

- Each API section heading in `docs/1.api.md` must have matching `describe(...)` blocks in:
  - `tests/docs/1.api.test.js`
  - `tests/browser/1.api.test.js`
- The `describe(...)` names must be identical to the heading text.

### Manifest updates

- When adding or renaming an API section, update `scripts/doc-test-contract.json` in the same change:
  - `requiredHeadings`
  - `describeMappings`

### Marker blocks for source-derived facts

- Source-derived API facts in `docs/1.api.md` must be wrapped in marker blocks:

```html
<!-- api-contract:<name>:start -->
...
<!-- api-contract:<name>:end -->
```

- Keep `<name>` stable once introduced.

### Extending source-derived contract fields

- If you add a new source-derived contract field, update all three in the same change:
  1. `scripts/generate-api-contract.mjs`
  2. `scripts/check-api-doc-sync.mjs`
  3. The matching marker block in `docs/1.api.md`

### Practical checklist

1. Add or rename the API section heading in `docs/1.api.md` (stable sentence case).
2. Add or rename matching `describe(...)` blocks in both API test files with identical names.
3. Update `scripts/doc-test-contract.json` (`requiredHeadings` and `describeMappings`).
4. If the section includes source-derived facts, add or update the `api-contract` marker block.
5. If you introduced a new source-derived field, update both sync scripts and the marker block together.
6. Run `npm run format:check` and `npm run docs:sync` before handing off.

Sync checklist:

1. Update the relevant docs headings and examples.
2. Update matching `describe(...)` blocks and assertions.
3. Run `npm run docs:sync`, `npm test`, and `npm run test:browser`.
4. Ensure old filenames/headings are removed.

---

# Instances

> Internal instance anatomy and orchestration boundaries.

## Anatomy at a glance

`createInstance(...)` first normalises input via `normaliseInstanceDocument(...)`, then delegates the resulting canonical InstanceDocument to `createInstanceCore(...)`, which assembles one runtime core for one resolved container ID.

Key components:

| Component                             | Responsibility                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| `src/document/instanceDocument.js`    | Canonical InstanceDocument shape, normalisation, serialisation, and validation. |
| `src/runtime/createInstanceCore.js`   | Runtime core orchestration, lifecycle, public API assembly, reuse/destroy flow. |
| `src/runtime/runtimeRegistry.js`      | Internal ID-scoped runtime storage (`get/set/delete`).                          |
| `src/runtime/createInstanceEvents.js` | Container event bus (`on/off/once/emit`) and map-event forwarding.              |
| `src/config/resolveConfig.js`         | Consumer config deep-merge with defaults.                                       |
| `src/map/*`, `src/geojson/*`          | Map and data module internals (documented in `docs/4.map.md`).                  |
| `src/ui/*`                            | UI shell and mode internals (documented in `docs/5.ui.md`).                     |

## Internal orchestration boundaries

- **Public boundary**: `createInstance(...)` in `src/entry.js` returns `WaymarkInstancePublicApi` only.
- **Runtime boundary**: lifecycle phase, registry entries, and event-wiring handles stay internal.
- **InstanceDocument boundary**: `toJSON()` is canonical serialisable output; it is separate from runtime lifecycle state.

Map and UI module-level details are documented separately:

- [Map module boundaries](4.map.md)
- [UI module boundaries](5.ui.md)

## core.modules boundary (specific usage)

`core.modules` in `createInstanceCore(...)` groups teardown-capable internals:

- `appShell`
- `geoJSON`
- `rasterBasemaps`
- `mapEvents`
- `stateSync`

This grouping is internal lifecycle wiring, not part of the consumer API.

## Module state boundaries

- Runtime tracks map and UI state in `core.state`.
- Serialisation reads state via `serialiseInstanceDocument(...)` and exposes it through `toJSON()`.
- Internal mutators (for example, `setCoreMode(...)`) are runtime wiring and not public API.

## Lifecycle order

Create flow:

1. Resolve container from `instanceDocument.config.id` (or auto-create one) and check registry for same-ID recreate.
2. If found, emit `waymark:instance.recreated`, teardown existing runtime, and clear registry entry.
3. Resolve config and create map.
4. Create event bus and runtime modules.
5. Build the InstanceDocument adapter and public API.
6. Register runtime and emit `waymark:instance.created`.

Destroy flow:

1. Mark lifecycle destroyed and emit `waymark:instance.destroyed`.
2. Destroy `geoJSON`, `rasterBasemaps`, `mapEvents`, `stateSync`, then app shell listeners/mount.
3. Remove map and delete runtime registry entry.

## Extension notes

When adding internals to `createInstanceCore(...)`:

- Keep dependencies explicit.
- Keep teardown deterministic.
- Keep ID-scoped names collision-safe.
- Keep the public API stable unless intentionally documented and tested.

For module-level behaviour, update these docs alongside runtime changes:

- `docs/4.map.md`
- `docs/5.ui.md`

---

# Map

> Map module boundaries for the JSON-first instance runtime.

## Responsibilities

The map module owns MapLibre runtime behaviour per instance:

- container resolution and validation
- map creation from `instanceDocument.config.map.options`
- basemap runtime resolution from `instanceDocument.config.map.basemaps`
- camera state sync into `instance.toJSON().state.map`
- forwarded map lifecycle events on the instance container
- optional GeoJSON source/layer bootstrapping from `instanceDocument.data.geoJSON`

## Input and output boundaries

- **Input config**: `instanceDocument.config.map.options`
- **Input basemaps**: `instanceDocument.config.map.basemaps.vector[]` and `instanceDocument.config.map.basemaps.raster[]`
- **Input state overrides**: `instanceDocument.state.map` (`center`, `zoom`, `bearing`, `pitch`)
- **Output state**: `toJSON().state.map`
- **Output data**: `toJSON().data.geoJSON`

GeoJSON source/layer IDs are runtime metadata only and not included in `toJSON()`.

State camera values override config camera defaults when both are provided.

## Runtime behaviour

- Waymark passes serialisable map options through to `new Map(options)` and always controls `container`.
- Non-serialisable map option values are dropped during document normalisation.
- Legacy `config.map.options.style` is rejected. Vector styles must be configured through `config.map.basemaps.vector[].styleURL`.
- Multiple vector basemaps are accepted, but only the first vector entry is used at runtime.
- Multiple raster basemaps are stacked in listed order and inserted below the first `symbol` layer (or appended if no symbol layer exists).
- Basemap entries use canonical keys only (for example `styleURL`, `tileURLTemplates`, `attributionHTML`, `minZoom`, `maxZoom`) and reject unknown/legacy keys.
- OpenFreeMap vector is injected as runtime default only when both vector and raster basemap arrays are absent/empty.
- If any basemap entry exists (including raster-only), no default vector basemap is injected.
- Raster-only configurations start from an internal empty style object and then add raster layers.
- Camera state sync runs on end events: `load`, `moveend`, `zoomend`, `rotateend`, `pitchend`.
- GeoJSON source/layer IDs are instance-scoped (`waymark-{id}-geojson-*`) to avoid collisions.

## Internal files

- `src/map/ensureContainer.js`
- `src/map/createMap.js`
- `src/map/basemaps.js`
- `src/map/createRasterBasemapModule.js`
- `src/geojson/createGeoJSONModule.js`
- `src/runtime/createInstanceEvents.js` (map event forwarding)
- `src/runtime/createInstanceCore.js` (wiring)

## Related API sections

- [`docs/1.api.md#container-resolution`](1.api.md#container-resolution)
- [`docs/1.api.md#map-options-pass-through`](1.api.md#map-options-pass-through)
- [`docs/1.api.md#instancedocument-shape`](1.api.md#instancedocument-shape)
- [`docs/1.api.md#initial-geojson-overlay`](1.api.md#initial-geojson-overlay)

---

# UI

> UI module boundaries for the JSON-first instance runtime.

## Responsibilities

The UI module owns per-instance shell rendering and UI mode state:

- mounts a Vue app shell in the map container
- mounts internal controls from `src/ui/controls/internalControls.js`
- renders mode-specific UI (`view` or `debug`)
- refreshes shell instance snapshot and Waymark event feed from runtime events
- applies runtime mode changes and emits module events

## Mode contract

- Supported modes: `"view" | "debug"`
- Invalid input normalises to `"view"`
- Mode is stored in both runtime state and serialised output (`state.ui.mode`)

## Shell behaviour

- A shell mount (`data-waymark-app="true"`) is created per instance.
- `view` mode keeps the shell mounted but renders no mode content.
- `debug` mode renders a `debug-output-toggle` control button. The button toggles a panel with two outputs:
  - **Instance document** from the current `instance.toJSON()` equivalent snapshot
  - **Waymark events (last 25)** filtered to `waymark:instance.*`, `waymark:ui.mode.changed`, and forwarded `waymark:map.*`

## Runtime mode updates

- Public mode changes flow through `instance.ui.setMode(...)`.
- Mode updates emit `waymark:ui.mode.changed` with module payload (`id`, `module`, `event`, `previous`, `next`, `source`).
- Public consumers should observe behaviour via `toJSON()` and events.
- Debug UI event entries are sanitised summaries only (safe and bounded).

## Internal files

- `src/ui/createAppShell.js`
- `src/ui/InstanceShell.vue`
- `src/ui/controls/internalControls.js`
- `src/ui/controls/InstanceControlButton.vue`
- `src/ui/modes/InstanceShellModeView.vue`
- `src/ui/modes/InstanceShellModeDebug.vue`
- `src/runtime/createInstanceCore.js` (mode lifecycle wiring)

## Related API sections

- [`docs/1.api.md#config-defaults-and-merge-behaviour`](1.api.md#config-defaults-and-merge-behaviour)
- [`docs/1.api.md#ui-shell-mode-rendering`](1.api.md#ui-shell-mode-rendering)
- [`docs/1.api.md#instance-event-api`](1.api.md#instance-event-api)
- [`docs/1.api.md#instancedocument-shape`](1.api.md#instancedocument-shape)

---

# Documentation Index

Developer documentation for Waymark JS.

## Reading order

1. [API](1.api.md) - Consumer API contract for `createInstance(...)`, including browser-runtime/DOM boundaries, config defaults, UI mode behaviour, events, canonical InstanceDocument serialisation, and GeoJSON.
2. [Development](2.development.md) - Contributor workflow, dev-page mode baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal orchestration boundaries and lifecycle composition.
4. [Map](4.map.md) - Map module responsibilities, state-sync boundaries, and GeoJSON wiring.
5. [UI](5.ui.md) - UI shell responsibilities, mode state contract, and runtime mode updates.

## Scope

These docs split consumer API from internals:

- `docs/1.api.md` is the public usage contract.
- `docs/3.instances.md` defines runtime orchestration boundaries.
- `docs/4.map.md` and `docs/5.ui.md` document module-level internals.
