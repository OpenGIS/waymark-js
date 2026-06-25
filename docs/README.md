---
git_hash: "f12cebdddd75a70426c6add59c4c95700f255826"
modified: "2026-06-25"
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
