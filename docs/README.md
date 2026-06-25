---
git_hash: "f4bfb0934867decbcac7b792d76fbfed3051ea22"
modified: "2026-06-24"
---

# Documentation Index

Developer documentation for Waymark JS.

## Reading order

1. [API](1.api.md) - Consumer API contract for `createInstance(instanceJSON?)`, config defaults, UI mode behaviour, events, Instance JSON, and GeoJSON.
2. [Development](2.development.md) - Contributor workflow, dev-page mode baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal orchestration boundaries and lifecycle composition.
4. [Map](4.map.md) - Map module responsibilities, state-sync boundaries, and GeoJSON wiring.
5. [UI](5.ui.md) - UI shell responsibilities, mode state contract, and runtime mode updates.

## Scope

These docs split consumer API from internals:

- `docs/1.api.md` is the public usage contract.
- `docs/3.instances.md` defines runtime orchestration boundaries.
- `docs/4.map.md` and `docs/5.ui.md` document module-level internals.
