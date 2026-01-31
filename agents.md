# AGENTS.md

## Overview

- **Project**: Waymark JS
- **Type**: JavaScript mapping library for creating, viewing, and editing GeoJSON-backed overlays
- **Purpose**: Render interactive maps powered by MapLibre GL JS with configurable basemaps and overlay styling

## Tech Stack

- **Language**: JavaScript (ES modules)
- **Mapping**: MapLibre GL JS
- **Build Tooling**: Vite (library mode)

## Project Structure

Refer to the canonical overview in [`README.md`](README.md#project-structure) for directory layout and component responsibilities.

## Development Workflow

- Install dependencies with `npm install`
- Run `npm run dev` for the Vite dev server (opens `index.html`)
- Build distributable bundles with `npm run build` (emits `dist/waymark-js.{js,umd.cjs,css}`)
- Execute the automated test suite with `npm test` (runs Vitest in Node + jsdom)

## Testing Strategy

- **Scope**: Vitest specs live in `tests/` and exercise the public surface of `new Instance(config)`.
- **Instance contract**: Tests validate the properties and helper methods exposed by the returned Instance and how they interact with the DOM (e.g. container creation, MapLibre mounting).
- **Configuration coverage**: Specs assert that constructor options—including `map_options.div_id` and `map_options.maplibre_options`—are merged correctly and passed through to MapLibre.
- **Ongoing maintenance**: When the Instance API gains new methods or accepts additional configuration, add or extend tests to cover the new behaviour before considering the work complete.
- **Tooling**: Use Vitest with the jsdom environment for DOM assertions; augment the `maplibre-gl` mock in tests when new MapLibre features require simulation.

## Instance API

Detailed constructor options and methods are documented in [`README.md`](README.md#instance-api), covering instantiation, configuration, and GeoJSON helpers (`loadGeoJSON`, `toGeoJSON`, `clearGeoJSON`).

## Documentation

- Primary guide at `docs/v2/1.index.md` (installation, quick start, CDN usage)
- Instance configuration reference at `docs/v2/2.instances.md` (map options, type definitions, basemaps, MapLibre passthrough)
