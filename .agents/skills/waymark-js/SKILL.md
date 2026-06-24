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

> Consumer API reference for `createInstance(config?, geoJSON?)`.

> [!NOTE]
> API heading names and `api-contract` marker blocks are enforced by sync automation. Change them only alongside matching tests and sync scripts.

## Quick start

```html
<div id="map" style="width: 100%; height: 400px"></div>

<script type="module">
  import { createInstance } from "./dist/waymark.js";

  const instance = createInstance({ id: "map" });
  instance.map.on("load", () => {
    console.log(instance.getSnapshot());
  });
</script>
```

## Factory signature

<!-- api-contract:signature:start -->

`createInstance(config?, geoJSON?)`

<!-- api-contract:signature:end -->

| Parameter | Type     | Required | Behaviour                                                                                                  |
| --------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `config`  | `object` | No       | Consumer config merged onto defaults. Set container ID via `config.id` when targeting an existing element. |
| `geoJSON` | `object` | No       | Initial GeoJSON source data for the instance-scoped line layer.                                            |

## Container resolution

- A provided `config.id` must already exist in the DOM.
- If that element is missing, `createInstance(...)` throws `Waymark container "{id}" was not found.`.
- If `config.id` is omitted, Waymark generates an ID prefixed with `waymark-` and appends the container to `document.body`.

## Config defaults and merge behaviour

Waymark resolves config with a deep merge:

- Base: `src/config/defaultConfig.json`
- Override: consumer `config`
- Objects merge recursively
- Arrays are replaced (not merged by index)

<!-- api-contract:defaults:start -->

- `map.options.center`: `[0, 0]`
- `map.options.zoom`: `2`
- `map.options.style`: `https://tiles.openfreemap.org/styles/bright`
- `map.options.attributionControl`: `false`
<!-- api-contract:defaults:end -->

- `ui.mode`: `"view"` (invalid values fall back to `"view"`)

Accepted `ui.mode` values:

- `"view"` (default): mounts the shell but renders no mode-specific content.
- `"debug"`: renders the snapshot inspector panel.

Any other value is normalised to `"view"`.

## UI shell mode rendering

Waymark mounts a per-instance Vue shell in the target map container (`data-waymark-app="true"`) and renders mode-specific content through nested mode components:

- `src/ui/InstanceShell.vue`
- `src/ui/modes/InstanceShellModeView.vue`
- `src/ui/modes/InstanceShellModeDebug.vue`

In `"view"` mode, the shell is present but intentionally empty. In `"debug"` mode, the shell renders a `<details>` panel labelled **Instance snapshot** with the latest serialised snapshot payload.

## Map options pass-through

All map options are passed through via `config.map.options` to `new Map(options)`, except `container`, which Waymark always controls from `config.id`.

```js
createInstance({
  id: "map",
  map: {
    options: {
      center: [-0.1276, 51.5074],
      zoom: 10,
      bearing: 15,
      style: "https://tiles.openfreemap.org/styles/bright",
    },
  },
});
```

## Returned instance shape

`createInstance(...)` returns:

```js
{
  id: string,
  map: MapLibreMap,
  config: object,
  getSnapshot: () => InstanceSnapshot,
  destroy: () => void,
  on: (type, handler, options?) => void,
  off: (type, handler, options?) => void,
  once: (type, handler, options?) => void
}
```

`map` is the underlying MapLibre map instance.

## Instance reuse and destroy semantics

- Reuse is ID-first.
- Calling `createInstance(...)` again with the same ID returns the same public instance.
- Subsequent `config` and `geoJSON` arguments are ignored on that reuse path.
- `destroy()` is idempotent and safe to call more than once.
- After `destroy()`, creating again with the same ID returns a fresh instance.

## Instance event API

Events are dispatched as `CustomEvent`s from the instance container.

- Use `on(type, handler, options?)`
- Use `off(type, handler, options?)`
- Use `once(type, handler, options?)`

Lifecycle events:

<!-- api-contract:lifecycle-events:start -->

- `waymark:instance.created`
- `waymark:instance.reused`
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

## Snapshot shape

`instance.getSnapshot()` returns a serialisable object:

```js
{
  version: 1,
  map: {
    center: [lng, lat],
    zoom: number,
    bearing: number,
    pitch: number
  },
  ui: {
    mode: "view" | "debug"
  },
  data: {
    geojson: {
      sourceId: string,
      layerId: string,
      geojson: object | null
    }
  }
}
```

`ui` contains only `mode`. Older `ui.hasAppShell` references are no longer part of the snapshot contract.

## Initial GeoJSON overlay

When `geoJSON` is provided as the second argument, Waymark adds an instance-scoped GeoJSON source and line layer on load (or immediately if the map is already loaded).

```js
createInstance(
  {
    id: "map",
  },
  {
    type: "FeatureCollection",
    features: [],
  },
);

createInstance(
  {},
  {
    type: "FeatureCollection",
    features: [],
  },
);
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

## Conventions and definitions

- **Instance**: public object returned by `createInstance(...)`.
- **Runtime core**: internal lifecycle object in `src/core/createInstanceCore.js`.
- **Runtime registry**: internal ID→core map in `src/core/runtimeRegistry.js`.
- **Snapshot**: serialisable payload from `instance.getSnapshot()`.
- **GeoJSON**: map data format and symbol naming (`createGeoJSONModule`, `geoJSON`).

Keep runtime internals internal. Consumer docs and tests should target public API behaviour.

## Testing strategy

- `tests/docs/*.test.js` (Vitest + jsdom): API contract tests without WebGL.
- `tests/browser/*.test.js` (Playwright): browser API and dev-page smoke behaviour.

## Dev page mode setup

`src/dev.js` intentionally boots two instances with one mode per instance:

- `#map` uses `ui.mode: "view"`
- `#map-two` uses `ui.mode: "debug"`

This gives a stable baseline for browser smoke coverage in `tests/browser/2.development.test.js`:

- both containers and canvases render
- view-mode shell stays empty
- debug-mode shell renders the snapshot panel

Run:

```bash
npm run format:check
npm run docs:sync
npm test
npm run test:browser
```

## Docs ↔ tests sync protocol

Treat docs and tests as one contract. Change both in the same slice.

| Docs page             | Unit tests                                                 | Browser tests                                      |
| --------------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `docs/1.api.md`       | `tests/docs/1.api.test.js`                                 | `tests/browser/1.api.test.js`                      |
| `docs/3.instances.md` | Internal-boundary assertions in `tests/docs/1.api.test.js` | Dev smoke in `tests/browser/2.development.test.js` |

Automation guards:

- `npm run docs:contract` checks required docs headings and mapped test `describe(...)` blocks.
- `npm run docs:api-sync` checks API sections in `docs/1.api.md` against generated source contract data.

## Hard sync workflow (docs ↔ source ↔ tests)

`npm run docs:sync` is intentionally strict and should be treated as a hard gate before tests.

Execution order:

1. `npm run docs:contract`
   - Reads `scripts/doc-test-contract.json`.
   - Verifies required headings in `docs/1.api.md`.
   - Verifies mapped `describe(...)` block names in `tests/docs/1.api.test.js` and `tests/browser/1.api.test.js`.
2. `npm run docs:api-sync`
   - Runs `npm run api:contract` first, generating `docs/.generated/api-contract.json` from source defaults/events.
   - Compares marker blocks in `docs/1.api.md` (`signature`, `defaults`, `lifecycle-events`, `forwarded-map-events`) against generated contract values.

If this gate fails, fix docs headings/marker blocks and corresponding test `describe(...)` names in the same change.

## Adding or changing API sections safely

Use this convention whenever you add, rename, or remove a section in `docs/1.api.md`.

### API section naming

- Use stable heading text in sentence case (for example, `## Snapshot shape`).
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

`createInstance(config?, geoJSON?)` delegates to `createInstanceCore(...)`, which assembles one runtime core for one resolved container ID.

Key components:

| Component                                              | Responsibility                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/core/createInstanceCore.js`                       | Core orchestration, lifecycle, public API assembly, reuse/destroy flow. |
| `src/core/runtimeRegistry.js`                          | Internal ID-scoped runtime storage (`get/set/delete`).                  |
| `src/core/createInstanceEvents.js`                     | Container event bus (`on/off/once/emit`) and map-event forwarding.      |
| `src/map/ensureContainer.js`                           | Container validation or generated container creation.                   |
| `src/config/resolveConfig.js`                          | Consumer config deep-merge with defaults.                               |
| `src/map/createMap.js`                                 | MapLibre map creation from resolved `config.map.options`.               |
| `src/state/createInstanceSnapshot.js`                  | Snapshot adapter for serialisable state output.                         |
| `src/ui/createAppShell.js`, `src/ui/InstanceShell.vue` | Overlay shell mount/refresh/unmount wiring and mode selection boundary. |
| `src/ui/modes/InstanceShellModeView.vue`               | View-mode component (intentionally no rendered debug panel).            |
| `src/ui/modes/InstanceShellModeDebug.vue`              | Debug-mode component (snapshot `<details>` inspector UI).               |
| `src/geojson/createGeoJSONModule.js`                   | Instance-scoped GeoJSON source/layer lifecycle.                         |

## Internal orchestration boundaries

- **Public boundary**: `createInstance(...)` in `src/entry.js` returns `WaymarkInstancePublicApi` only.
- **Runtime boundary**: lifecycle phase, registry entries, and event-wiring handles stay internal.
- **Snapshot boundary**: `getSnapshot()` is serialisable output; it is separate from runtime lifecycle state.

## core.modules boundary (specific usage)

`core.modules` in `createInstanceCore(...)` groups teardown-capable internals:

- `appShell`
- `geoJSON`
- `mapEvents`

This grouping is internal lifecycle wiring, not part of the consumer API.

## UI mode state boundary

- Resolved mode originates from `resolveConfig(...)` and is normalised to `"view" | "debug"`.
- Core tracks mode in `core.ui.mode`.
- Snapshot reads mode through `createInstanceSnapshot({ getMode })` and emits `snapshot.ui.mode`.
- Shell updates flow through `core.modules.appShell.setMode(...)`.

`lifecycle.setMode(...)` exists for internal runtime wiring and tests; it is not exposed on the public instance API.

## Lifecycle order

Create flow:

1. Resolve container from `config.id` (or auto-create one) and check registry reuse.
2. Resolve config and create map.
3. Create event bus and runtime components.
4. Build snapshot adapter.
5. Assemble public API and emit `waymark:instance.created`.

Destroy flow:

1. Mark lifecycle destroyed and emit `waymark:instance.destroyed`.
2. Destroy `geoJSON`, `mapEvents`, then app shell listeners/mount.
3. Remove map and delete runtime registry entry.

## Extension notes

When adding internals to `createInstanceCore(...)`:

- Keep dependencies explicit.
- Keep teardown deterministic.
- Keep ID-scoped names collision-safe.
- Keep the public API stable unless intentionally documented and tested.

---

# Documentation Index

Developer documentation for Waymark JS.

## Reading order

1. [API](1.api.md) - Consumer API contract for `createInstance(config?, geoJSON?)`, config defaults, UI mode behaviour, events, snapshots, and GeoJSON.
2. [Development](2.development.md) - Contributor workflow, dev-page mode baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal instance anatomy, mode-state boundaries, and orchestration internals.

## Scope

These docs split consumer API from internals: `docs/1.api.md` is the single source of truth for public usage, while `docs/3.instances.md` documents internal runtime boundaries.
