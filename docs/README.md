---
git_hash: "08111f41795f1ffa0acd922b15f54434cf5adc32"
modified: "2026-06-27"
---

# Documentation Index

Developer documentation for Waymark JS.

## Reading order

1. [API](1.api.md) - Consumer API contract for `createInstance(...)`, including browser-runtime/DOM boundaries, config defaults, UI mode behaviour, events, canonical InstanceDocument serialisation, and `data.layers` GeoJSON documents.
2. [Development](2.development.md) - Contributor workflow, dev-page mode baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal orchestration boundaries, lifecycle composition, and baseline-vs-delta serialisation semantics.
4. [Map](4.map.md) - Map module responsibilities, state-sync boundaries, and `data.layers` GeoJSON wiring.
5. [UI](5.ui.md) - UI shell responsibilities, mode state contract, and runtime mode updates.
6. [Data](6.data.md) - Canonical data-layer contract, `instance.data.addLayer(...)`, and GeoJSON runtime behaviour.

## Scope

These docs split consumer API from internals:

- `docs/1.api.md` is the public usage contract.
- `docs/3.instances.md` defines runtime orchestration boundaries.
- `docs/4.map.md` and `docs/5.ui.md` document module-level internals.
- `docs/6.data.md` is the canonical data/GeoJSON reference used by API, map, and dev docs.
