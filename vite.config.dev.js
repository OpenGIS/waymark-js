import { resolve } from "node:path";
import { defineConfig } from "vite";
import { basemapPlugin } from "./tests/fixtures/basemap/vitePlugin.mjs";

export default defineConfig({
  root: "dev",
  // Single source of truth for the dev harness and browser tests. The fixture
  // set lives outside the Vite root and is served at `/` in the dev server.
  publicDir: resolve(import.meta.dirname, "tests/fixtures"),
  // Vendored basemap tiles, glyphs and sprite, served at `/__basemap__/**`. The
  // canonical style is served by the `publicDir` mapping above.
  plugins: [basemapPlugin()],
  // MapLibre resolves its worker relative to its own module URL. Vite's dep
  // pre-bundling would move that URL into node_modules/.vite/deps, where the
  // worker file does not exist, stalling GeoJSON source processing. Serving
  // the package as-is keeps import.meta.url pointing at the real dist folder.
  optimizeDeps: {
    exclude: ["maplibre-gl"],
  },
});
