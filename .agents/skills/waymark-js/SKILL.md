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
    ui?: { mode?: "view" | "debug" }
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
    ui: {
      mode?: "view" | "debug"
    }
  },
  data: {
    layers: Array<{
      geoJSON: object | null
    }>
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

- Base: `src/config/defaults.js` (`defaultConfig`)
- Override: `instanceDocument.config`
- Objects merge recursively
- Arrays are replaced (not merged by index)

<!-- api-contract:defaults:start -->

- `map.options.center`: `[0, 0]`
- `map.options.zoom`: `2`
- `map.options.attributionControl`: `false`
- `map.basemaps.vector[0].styleURL` (resolved as config baseline only when no basemap entries exist): `https://tiles.openfreemap.org/styles/bright`
<!-- api-contract:defaults:end -->

- `ui.mode`: `"view"` (invalid values fall back to `"view"`)

Accepted `ui.mode` values:

- `"view"` (default): mounts the shell but renders no mode-specific content.
- `"debug"`: renders a debug control in the shell; the control toggles debug outputs.

Any other value is normalised to `"view"`.

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

- OpenFreeMap vector is resolved as config baseline only when no vector or raster basemap entries are provided.
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
            styleURL: "https://tiles.openfreemap.org/styles/bright",
            title: "OpenFreeMap Bright",
            attributionHTML:
              '<a href="https://openfreemap.org">© OpenFreeMap</a>',
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

Basemaps module event:

- `waymark:map.basemaps.changed`

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
- `waymark:state.ui.mode.changed`
- `waymark:state.ui.panel.changed`
- `waymark:state.map.camera.changed`
- `waymark:state.map.basemaps.changed`

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
    ui: {
      mode: "view" | "debug",
      activePanel: string | null,
      panelContext: unknown
    }
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
    ui: {
      mode: "view" | "debug"
    }
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
    ui?: { mode?: "view" | "debug" }
  },
  data: {
    layers: Array<{
      geoJSON: object | null
    }>
  }
}
```

`state` is persistence delta only. Unchanged/default branches are omitted.

- `state.map.options` appears only when camera values diverge from config baseline.
- `state.map.basemaps` appears only when basemaps are mutated at runtime.
- `state.ui.mode` appears only when runtime mode diverges from config baseline.

Camera sync observes low-frequency map end events (`load`, `moveend`, `zoomend`, `rotateend`, `pitchend`) and dispatches state commands. State events emit only when camera values change.

In debug mode, the **Instance document** panel is refreshed from runtime-state events, so camera changes visible in the map are reflected through the same state pipeline.

`instance.toJSON()` is intentionally strict and serialisable so that `createInstance(instance.toJSON())` can be reused as canonical input.

`toJSON()` keeps `config` stable to authored/default intent and serialises basemap keys in canonical `raster` then `vector` order.

Live basemap mutations from runtime commands/UI controls (raster opacity changes, raster reorder, vector active selection) are serialised into `state.map.basemaps` so post-mutation persistence stays in sync with `waymark:map.basemaps.changed` snapshots.

Runtime-enriched metadata (for example GeoJSON source/layer IDs and lifecycle phase) is intentionally excluded from `toJSON()`.

Internal orchestration boundaries are documented in [`docs/3.instances.md`](3.instances.md).

## Initial GeoJSON overlay

When `data.layers` is provided in `instanceDocument`, Waymark adds one instance-scoped GeoJSON source/layer per entry with `{ geoJSON }` on load (or immediately if the map is already loaded).

- Multiple GeoJSON layers are supported.
- Data-layer stack order is top-first: `layers[0]` is visually on top.
- Data layers are inserted after raster basemaps and before symbol layers.
- Geometry families are rendered by layer type:
  - `Point` and `MultiPoint` → `circle`
  - `LineString` and `MultiLineString` → `line`
  - `Polygon` and `MultiPolygon` → `fill`
- Default family paint is stable and minimal:
  - circle: `circle-color: #2563eb`, `circle-radius: 5`
  - line: `line-color: #2563eb`, `line-width: 3`
  - fill: `fill-color: #2563eb`, `fill-opacity: 0.35`

```js
createInstance({
  config: {
    id: "map",
  },
  data: {
    layers: [
      {
        geoJSON: {
          type: "FeatureCollection",
          features: [],
        },
      },
      {
        geoJSON: null,
      },
    ],
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

Vite config is split by role: `vite.config.dev.js` for local dev server, `vite.config.lib.js` for library builds, and `vitest.config.js` for tests.

`vite.config.lib.js` defines `process.env.NODE_ENV` as a build-time replacement for the dist bundle, preventing browser runtime errors like `process is not defined`.

## Conventions and definitions

- **Instance**: public object returned by `createInstance(...)`.
- **Runtime core**: internal lifecycle object in `src/runtime/createInstanceCore.js`.
- **Runtime registry**: internal ID→core map in `src/runtime/runtimeRegistry.js`.
- **InstanceDocument**: canonical serialisable payload from `instance.toJSON()`.
- **GeoJSON**: map data format and symbol naming (`createGeoJSONModule`, `geoJSON`).
- **Data layers**: canonical InstanceDocument data shape is `data.layers: Array<{ geoJSON: object | null }>`.

Keep runtime internals internal. Consumer docs and tests should target public API behaviour.

## Naming conventions

Use camelCase identifiers, with acronyms kept uppercase.

- `instanceDocument`
- `InstanceDocument`
- `geoJSON`
- `styleURL`
- `tileURLTemplates`
- `attributionHTML`

Use canonical camelCase slot IDs for UI control positioning.

- `top`
- `topRight`
- `right`
- `bottomRight`
- `bottom`
- `bottomLeft`
- `left`
- `topLeft`

Use `instanceDocument` as the canonical variable/parameter name for the `createInstance(instanceDocument?)` input payload.

Prefer these canonical forms in source, tests, docs, and fixtures.

Avoid non-canonical slot variants such as `top-right`, `bottom-right`, `bottom-left`, and `top-left` in source/docs/tests.

For basemap payload keys specifically, avoid legacy aliases such as `styleUrl`, `tileUrls`, and `attributionHtml`.

For basemap ordering, use these canonical rules in docs/tests/fixtures:

- `config.map.basemaps` key order: `raster` then `vector` (for readability and `toJSON()` parity).
- raster stack order is top-first: `raster[0]` is visually on top.

For data-layer ordering, use these canonical rules in docs/tests/fixtures:

- `data.layers` is the canonical data envelope (not `data.geoJSON`).
- data-layer stack order is top-first: `layers[0]` is visually on top.
- insertion position is after raster basemaps and before symbol layers.

## Cross-module sync pattern (runtime-state owned)

Use this pattern when UI and map modules must stay in sync.

1. **Runtime state owns mutable state**
   - Keep authoritative mutable state in `src/runtime/state/createInstanceState.js`.
   - `createInstanceCore(...)` owns lifecycle orchestration and commands, not duplicate mutable state copies.
   - UI shell modules consume snapshots and never become a second source of truth.
2. **Dispatch named commands**
   - Route mutations through explicit dispatch paths (for example `map.camera.set`, `map.basemaps.raster.opacity.set`, `ui.activePanel.set`).
   - UI emits intent via callbacks; runtime commands dispatch state changes, then adapters apply map-side effects.
3. **Emit canonical state events**
   - Every real state mutation emits `waymark:state.changed` plus a scoped state event (`waymark:state.map.camera.changed`, `waymark:state.map.basemaps.changed`, `waymark:state.ui.mode.changed`, `waymark:state.ui.panel.changed`).
   - No-op dispatches emit nothing.
4. **Emit aggregate module events only where useful**
   - Basemaps still emits `waymark:map.basemaps.changed` for mutation-specific snapshot payloads consumed by tooling/UI.
   - `waymark:ui.mode.changed` remains the module-level mode event.

Guidance for future sync features:

- keep mutation logic in runtime core, not in Vue/map adapters
- keep commands idempotent and no-op on invalid/unchanged input
- emit events only after state mutation succeeds
- prefer one aggregate event per mutation path over multiple partial events
- ensure `instance.toJSON()` reflects the same post-mutation state as emitted events
- for vector selection, ensure the active basemap is always serialised as `basemaps.vector[0]`

## Basemaps cross-module contract checklist

Use this checklist when changing basemap behaviour across API/map/UI/docs/tests.

1. Keep basemap config/key order canonical in authored examples and fixtures: `raster` then `vector`.
2. Preserve raster stack semantics everywhere: top-first (`raster[0]` visually on top).
3. Preserve vector active semantics: selected vector basemap is promoted to `vector[0]`.
4. Keep `waymark:map.basemaps.changed` aggregate payload aligned with all mutation paths (`opacity_changed`, `reordered`, `vector_changed`) and include post-mutation `basemaps` snapshot.
5. Keep `instance.toJSON().state.map.basemaps` aligned with live basemap mutations (same ordering/values as runtime snapshot) while `config.map.basemaps` remains baseline.
6. For docs/tests/examples, use real HTML strings for `attributionHTML` values (for example `<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>`), not placeholder prose.
7. Keep basemaps panel row composition consistent: title + attributionHTML + control (slider/radio).

## Testing strategy

- `tests/docs/*.test.js` (Vitest + jsdom): API contract tests without WebGL.
- `tests/docs/runtime/createInstanceState.test.js`: runtime-state module contract (`getSnapshot`, command dispatch, scoped/global state events, no-op behaviour).
- `tests/browser/*.test.js` (Playwright): browser API and dev-page smoke behaviour.

Use jsdom tests to validate API contract behaviour, not as proof of non-browser runtime support. Browser tests are the runtime source of truth for instance behaviour.

## Dev page mode setup

The development playground now lives under `dev/` (`dev/index.html`, `dev/dev.js`, and static assets in `dev/public/`).

`dev/dev.js` intentionally boots two instances with one mode per instance:

- `#map` uses `ui.mode: "view"`
- `#map-two` uses `ui.mode: "debug"`

This gives a stable baseline for browser smoke coverage in `tests/browser/2.development.test.js`:

- both containers and canvases render
- view-mode shell has no debug panel
- both modes expose the `basemaps-toggle` control in `bottomLeft`
- debug-mode shell shows the debug control and the debug modal/panel by default (instance document + bounded event feed)
- the debug output toggle stays clickable while the debug modal is open
- shared modal routing allows direct switch between debug and basemaps panels
- two dev dropdowns exist: `#dev-instance-mode` (for `#map`) and `#dev-instance-mode-two` (for `#map-two`)

`dev/dev.js` wires both dropdowns via `instance.ui.setMode(nextMode)`. Browser smoke asserts independent mode switching in both UI and serialised InstanceDocument payloads:

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

| Component                                  | Responsibility                                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `src/document/instanceDocument.js`         | Canonical InstanceDocument shape, normalisation, serialisation, and validation.                                |
| `src/runtime/createInstanceCore.js`        | Runtime core orchestration, lifecycle, public API assembly, reuse/destroy flow.                                |
| `src/runtime/runtimeRegistry.js`           | Internal ID-scoped runtime storage (`get/set/delete`).                                                         |
| `src/runtime/createInstanceEvents.js`      | Container event bus (`on/off/once/emit`) and map-event forwarding.                                             |
| `src/runtime/state/createInstanceState.js` | Canonical runtime-state store (`getSnapshot`, `dispatch`, `subscribe`) and scoped/global state-event emission. |
| `src/config/resolveConfig.js`              | Consumer config deep-merge with defaults.                                                                      |
| `src/map/*`, `src/geojson/*`               | Map and data module internals (documented in `docs/4.map.md`).                                                 |
| `src/ui/*`                                 | UI shell and mode internals (documented in `docs/5.ui.md`).                                                    |

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
- `basemapStateSync`

This grouping is internal lifecycle wiring, not part of the consumer API.

## Module state boundaries

- Runtime mutable state lives in `core.runtimeState` (state module snapshot + dispatch).
- `core.baseline` keeps stable authored/default intent for delta generation.
- Serialisation emits a stable `config` baseline and a minimal `state` delta in `toJSON()` (unchanged branches omitted), using runtime-state snapshots as the current source.
- UI routing fields (`ui.activePanel`, `ui.panelContext`) are runtime-only and intentionally excluded from `toJSON()`.
- Internal mutators (for example, `setCoreMode(...)`) are runtime wiring and not public API.

## Lifecycle order

Create flow:

1. Resolve container from `instanceDocument.config.id` (or auto-create one) and check registry for same-ID recreate.
2. If found, emit `waymark:instance.recreated`, teardown existing runtime, and clear registry entry.
3. Resolve config and create map.
4. Create event bus and runtime state (`createInstanceState(...)`) with initial camera, basemaps, and UI panel state.
5. Wire runtime modules (UI shell, map-event/state sync, basemap state sync, GeoJSON/raster adapters).
6. Build the InstanceDocument adapter and public API.
7. Register runtime and emit `waymark:instance.created`.

Destroy flow:

1. Mark lifecycle destroyed and emit `waymark:instance.destroyed`.
2. Destroy `geoJSON`, `rasterBasemaps`, `mapEvents`, `stateSync`, `basemapStateSync`, then app shell listeners/mount.
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
- camera delta sync into `instance.toJSON().state.map.options`
- basemap delta sync into `instance.toJSON().state.map.basemaps`
- forwarded map lifecycle events on the instance container
- optional GeoJSON source/layer bootstrapping from `instanceDocument.data.layers[]`

## Input and output boundaries

- **Input config**: `instanceDocument.config.map.options`
- **Input basemaps**: `instanceDocument.config.map.basemaps.raster[]` and `instanceDocument.config.map.basemaps.vector[]`
- **Input state overrides**: `instanceDocument.state.map.options` (`center`, `zoom`, `bearing`, `pitch`) and `instanceDocument.state.map.basemaps`
- **Output state**:
  - `toJSON().state.map.options` (camera delta only)
  - `toJSON().state.map.basemaps` (runtime basemap delta only)
- **Output data**: `toJSON().data.layers[]`

GeoJSON source/layer IDs are runtime metadata only and not included in `toJSON()`.

State camera values override config camera defaults when both are provided.

## Runtime behaviour

- Waymark passes serialisable map options through to `new Map(options)` and always controls `container`.
- Camera sync listens to map end events (`load`, `moveend`, `zoomend`, `rotateend`, `pitchend`) and dispatches `map.camera.set` into runtime state.
- Camera state events are emitted only on real camera changes (no-op end events produce no state events).
- Runtime basemap state is command-driven in core (`setRasterOpacity`, `reorderRasterBasemaps`, `setActiveVectorBasemap`) and then applied to map adapters.
- Raster layers are mounted and reordered with top-first semantics (`raster[0]` is visually on top).
- Data layers support multiple GeoJSON entries and are mounted with top-first semantics (`layers[0]` is visually on top).
- Data layers are inserted after raster basemaps and before symbol layers.
- Data layers render by GeoJSON geometry family:
  - `Point`/`MultiPoint` use `circle` layers
  - `LineString`/`MultiLineString` use `line` layers
  - `Polygon`/`MultiPolygon` use `fill` layers
- Vector switching updates MapLibre style via `map.setStyle(...)` and keeps the selected vector as runtime index `vector[0]`.
- Basemap mutations emit one aggregate `waymark:map.basemaps.changed` event containing `mutation`, `changed`, and full post-mutation `basemaps` snapshot.
- `instance.toJSON().config` stays stable, while live basemap mutations are serialised into `state.map.basemaps` (including runtime mutation order/values).
- GeoJSON source/layer IDs are instance-scoped (`waymark-{id}-geojson-source-{index}`, `waymark-{id}-geojson-layer-{index}`) to avoid collisions.

For public config validation/defaults and event payload contracts, treat [`docs/1.api.md`](1.api.md) as the source of truth.

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
- [`docs/1.api.md#instance-event-api`](1.api.md#instance-event-api)
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
- renders basemaps controls/panel in both modes
- refreshes shell render refs from runtime-state snapshots and keeps Waymark event feed updates lightweight
- applies runtime mode changes and emits module events

## Controls vs panels

- **Controls** are compact always-available triggers (for example `debug-output-toggle`, `basemaps-toggle`).
- **Panels** are modal content routes selected by runtime state (`ui.activePanel`).
- Controls emit intent only; they do not contain persisted state.
- Panels render from snapshots and can be swapped without rebuilding controls.
- `ui.panelContext` is optional routing metadata for panel consumers (for example which internal control opened the panel).

## Mode contract

- Supported modes: `"view" | "debug"`
- Invalid input normalises to `"view"`
- Mode is stored in runtime state and serialised as delta output (`state.ui.mode` only when diverged from `config.ui.mode`)

## Shell behaviour

- A shell mount (`data-waymark-app="true"`) is created per instance.
- `view` mode keeps the shell mounted with no default panel content.
- `debug` mode adds a `debug-output-toggle` control and opens the debug panel by default.
- `basemaps-toggle` is always rendered (both modes) in `bottomLeft`.
- The shell uses one shared modal primitive (`src/ui/modal/InstanceShellModal.vue`) and routes panel content by active panel id.
- `src/ui/modes/InstanceShellModeDebug.vue` and `src/ui/panels/InstanceShellPanelBasemaps.vue` are both modal content routes.
- When visible, debug output includes two sections:
  - **Instance document** from the current `instance.toJSON()` equivalent snapshot
  - **Waymark events (last 25)** filtered to lifecycle/module/map events plus canonical runtime state events (`waymark:state.changed`, `waymark:state.*`)
- Basemaps panel can replace debug panel without unmounting controls, so debug and basemaps toggles can switch modal content directly.
- The debug toggle remains interactive while the panel is open because shell controls are layered above panel content.
- Debug output does not use a dedicated payload module; it is assembled from the instance document plus sanitised event summaries.
- Forwarded map events append to the debug feed without forcing a full instance-document refresh per event.

## Shared panel/modal routing

- Panel routing is not debug-specific. `ui.activePanel` selects modal content for both debug and basemaps.
- Current internal panel ids:
  - `debug-output`
  - `basemaps`
- `ui.panelContext` carries optional route metadata for panel consumers (for example trigger source), without creating extra panel IDs.
- UI controls dispatch panel intent commands through runtime state (`ui.activePanel.set`, `ui.panelContext.set`).
- Mode transitions still apply guard rails:
  - leaving debug closes `debug-output` when active
  - entering debug opens `debug-output` if no panel is active

`ui.activePanel` and `ui.panelContext` are intentionally runtime-only. They drive shell routing but are not serialised in `instance.toJSON()`.

Use this same route-through-modal pattern for future internal panels.

## State ownership boundaries

- Runtime state module (`src/runtime/state/createInstanceState.js`) owns canonical mutable state.
- UI shell (`src/ui/createAppShell.js`) keeps ephemeral render refs (`mode`, `activePanel`, snapshots) derived from runtime-state events.
- Shell refs are projections only; all durable mutations must flow through runtime-state dispatch.
- `createInstanceCore(...)` owns command handlers and delegates all mutable state writes through `runtimeState.dispatch(...)`.

## Canonical runtime state events

- Global: `waymark:state.changed`
- Scoped:
  - `waymark:state.ui.mode.changed`
  - `waymark:state.ui.panel.changed`
  - `waymark:state.map.camera.changed`
  - `waymark:state.map.basemaps.changed`

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
    map: { camera: object, basemaps: object },
    ui: { mode: "view" | "debug", activePanel: string | null, panelContext: unknown }
  }
}
```

This payload is the canonical bridge between map/UI/runtime layers.

## Layering contract (`z-index`)

- The shell uses a deliberate two-layer stack so controls remain operable as UI grows:
  - `.waymark-instance-shell-controls` uses `z-index: 2`
  - `.waymark-instance-shell-modal` uses `z-index: 1`
- This ensures control interactions (for example the debug toggle) are never blocked by debug content.
- Any future overlay/panel introduced by controls should preserve this contract unless a higher-priority interaction explicitly requires a different stack order.

## Controls architecture

- Control layout is position-based using canonical camelCase slot IDs: `top`, `topRight`, `right`, `bottomRight`, `bottom`, `bottomLeft`, `left`, `topLeft`.
- `resolveInternalControls(...)` returns a controls-by-position object and injects:
  - `basemaps-toggle` in `bottomLeft` (view + debug)
  - `debug-output-toggle` in `topRight` (debug only)
- `InstanceShell.vue` renders controls via the shared `InstanceControlButton` component.

## Basemaps panel composition

- `InstanceShellPanelBasemaps.vue` composes two focused sections:
  - `BasemapsRasterList.vue` (opacity slider + drag reorder interactions)
  - `BasemapsVectorList.vue` (radio selection for active vector basemap)
- The modal renders **Raster** before **Vector** so panel order matches runtime raster stack semantics.
- Raster and vector rows follow the same presentation pattern: **title + attributionHTML + control**.
- `BasemapsRasterList.vue` delegates each row to `BasemapsRasterItem.vue` and emits only two intents:
  - `set-raster-opacity`
  - `reorder-raster-basemaps`
- Raster reorder interactions are top-first (`raster[0]` is the visually top layer).
- `BasemapsVectorList.vue` emits `set-active-vector-basemap`; selecting a radio option promotes that vector basemap to runtime index `vector[0]`.
- UI components do not own authoritative basemap state. They receive snapshot props and emit intent callbacks.

### Basemaps interaction flow

1. User opens basemaps panel from the shared internal control toggle.
2. User mutates raster/vector basemaps through row controls (slider, drag reorder, radio select).
3. Panel emits intent callbacks to runtime core commands.
4. Core dispatches runtime-state commands, applies map-side effects, and emits aggregate `waymark:map.basemaps.changed`.
5. App shell refreshes from runtime-state snapshots so panel rows and `instance.toJSON()` remain aligned.

Debug output demonstrates the same pattern:

1. Map end events dispatch `map.camera.set`.
2. Runtime state emits `waymark:state.map.camera.changed` only when values changed.
3. Shell subscription refreshes **Instance document** so camera deltas appear in debug output.

## Minimal UI philosophy

- Keep panel UI intentionally lightweight and diagnostic-first:
  - plain headings/lists
  - native range input for opacity
  - native drag-and-drop for ordering
- Avoid introducing extra UI framework abstractions in internal control panels unless behaviour complexity requires it.

## Runtime mode updates

- Public mode changes flow through `instance.ui.setMode(...)`.
- Mode updates emit `waymark:ui.mode.changed` with module payload (`id`, `module`, `event`, `previous`, `next`, `source`).
- Public consumers should observe behaviour via `toJSON()` and events.
- Debug UI event entries are sanitised summaries only (safe and bounded).

## Internal files

- `src/ui/createAppShell.js`
- `src/ui/InstanceShell.vue`
- `src/ui/modal/InstanceShellModal.vue`
- `src/ui/controls/internalControls.js`
- `src/ui/controls/InstanceControlButton.vue`
- `src/ui/modes/InstanceShellModeView.vue`
- `src/ui/modes/InstanceShellModeDebug.vue`
- `src/ui/panels/InstanceShellPanelBasemaps.vue`
- `src/ui/panels/basemaps/BasemapsVectorList.vue`
- `src/ui/panels/basemaps/BasemapsRasterList.vue`
- `src/ui/panels/basemaps/BasemapsRasterItem.vue`
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

1. [API](1.api.md) - Consumer API contract for `createInstance(...)`, including browser-runtime/DOM boundaries, config defaults, UI mode behaviour, events, canonical InstanceDocument serialisation, and `data.layers` GeoJSON documents.
2. [Development](2.development.md) - Contributor workflow, dev-page mode baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal orchestration boundaries, lifecycle composition, and baseline-vs-delta serialisation semantics.
4. [Map](4.map.md) - Map module responsibilities, state-sync boundaries, and `data.layers` GeoJSON wiring.
5. [UI](5.ui.md) - UI shell responsibilities, mode state contract, and runtime mode updates.

## Scope

These docs split consumer API from internals:

- `docs/1.api.md` is the public usage contract.
- `docs/3.instances.md` defines runtime orchestration boundaries.
- `docs/4.map.md` and `docs/5.ui.md` document module-level internals.
