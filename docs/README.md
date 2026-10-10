---
git_hash: "b112ea714d37d0cb21a764bce16fd6d7d53504e8"
modified: "2026-10-10"
---

# Docs

Developer documentation for Waymark JS.

## Reading order

1. [API](1.api.md) - Consumer API contract for `createInstance({ map, document? })`, including map injection and ownership boundaries, config defaults, events, canonical InstanceDocument serialisation, and `data.layers` GeoJSON documents.
2. [Development](2.development.md) - Contributor workflow, dev-page baseline, testing strategy, and sync protocol.
3. [Instances](3.instances.md) - Internal orchestration boundaries, lifecycle composition, and baseline-vs-delta serialisation semantics.
4. [Map](4.map.md) - Map injection contract, ownership boundaries, overlay mounting, and cleanup guarantees.
5. [Data](5.data.md) - Canonical data-layer contract, `instance.data.addLayer(...)`, and GeoJSON runtime behaviour.

## Scope

These docs split consumer API from internals:

- `docs/1.api.md` is the public usage contract.
- `docs/3.instances.md` defines runtime orchestration boundaries.
- `docs/4.map.md` documents the map injection contract and overlay internals.
- `docs/5.data.md` is the canonical data/GeoJSON reference used by API, map, and dev docs.

## For LLMs

- [llms.txt](llms.txt) - a concise machine-readable index of these docs.
- [llms-full.txt](llms-full.txt) - the full documentation in a single file.
