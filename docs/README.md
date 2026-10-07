---
git_hash: "a3f3ed5437501790417899c5d35e642c421679d3"
modified: "2026-10-06"
---

# Documentation Index

Developer documentation for Waymark JS.

## Reading order

1. [API](1.api.md) - Consumer API contract for `createInstance({ map, document? })`, including map injection and ownership boundaries, config defaults, events, canonical InstanceDocument serialisation, and `data.layers` GeoJSON documents.
2. [Development](2.development.md) - Contributor workflow, dev-page baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal orchestration boundaries, lifecycle composition, and baseline-vs-delta serialisation semantics.
4. [Map](4.map.md) - Map injection contract, ownership boundaries, overlay mounting, and cleanup guarantees.
5. [Data](6.data.md) - Canonical data-layer contract, `instance.data.addLayer(...)`, and GeoJSON runtime behaviour.

## Scope

These docs split consumer API from internals:

- `docs/1.api.md` is the public usage contract.
- `docs/3.instances.md` defines runtime orchestration boundaries.
- `docs/4.map.md` documents the map injection contract and overlay internals.
- `docs/6.data.md` is the canonical data/GeoJSON reference used by API, map, and dev docs.
