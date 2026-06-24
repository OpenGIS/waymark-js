---
git_hash: "99ad8cf2722262a318de6fe8b15eacefa244584a"
modified: "2026-06-23"
---

# Documentation Index

Developer documentation for Waymark JS.

## Reading order

1. [Development](1.development.md) - Local workflow, test commands, and docs↔tests sync rules.
2. [Instances](2.instances.md) - `createInstance(...)` usage, instance framing, and lifecycle behaviour.
3. [Config](3.config.md) - Config contract for `config.map.options` (including style-only setup).
4. [Naming](4.naming.md) - Canonical naming for runtime cores, snapshots, and GeoJSON.
5. [Modules](5.modules.md) - Instance wrapper/module architecture, lifecycle ordering, and extension contract.

## Scope

These docs describe the current instance-first API surface and top-level module layout. `config.map.options` is forwarded to MapLibre with Waymark overriding `container`, map styling is configured through `config.map.options.style`, and snapshot/runtime naming is defined in the naming glossary.
